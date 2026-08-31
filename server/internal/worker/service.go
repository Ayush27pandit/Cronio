package worker

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	db "github.com/Ayush27pandit/Cronio/server/internal/database/generated"
)

// Worker claims READY executions and POSTs to their target.
type Worker struct {
	db       *sql.DB
	id       string
	logger   *slog.Logger
	interval time.Duration
	batch    int32
}

// New creates a worker. Interval and batch use defaults if zero.
func New(db *sql.DB, logger *slog.Logger, id string, interval time.Duration, batch int32) *Worker {
	if interval == 0 {
		interval = time.Second
	}
	if batch == 0 {
		batch = 10
	}
	if id == "" {
		id = "worker-1"
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Worker{
		db:       db,
		id:       id,
		logger:   logger,
		interval: interval,
		batch:    batch,
	}
}

// Tick does one poll: reap expired leases, claim READY executions, execute them.
func (w *Worker) Tick(ctx context.Context) (claimed, succeeded, failed int, err error) {
	tickCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	q := db.New(w.db)

	// Reap stuck leases before polling.
	if ids, reapErr := q.ReapExpiredLeases(tickCtx); reapErr != nil {
		w.logger.Warn("worker reap failed", "error", reapErr)
	} else if len(ids) > 0 {
		w.logger.Info("worker reaped expired leases", "count", len(ids))
	}

	rows, err := q.GetReadyExecutions(tickCtx, w.batch)
	if err != nil {
		w.logger.Error("worker poll failed", "error", err)
		return 0, 0, 0, err
	}
	if len(rows) == 0 {
		return 0, 0, 0, nil
	}

	for _, r := range rows {
		claimedRow, err := q.TryClaimExecution(tickCtx, db.TryClaimExecutionParams{
			ID:       r.ID,
			WorkerID: sql.NullString{String: w.id, Valid: true},
		})
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				continue
			}
			w.logger.Warn("worker claim failed", "execution", r.ID.String(), "error", err)
			continue
		}
		if !claimedRow.ClaimToken.Valid {
			continue
		}
		if err := q.MarkRunning(tickCtx, db.MarkRunningParams{
			ID:         claimedRow.ID,
			ClaimToken: claimedRow.ClaimToken,
		}); err != nil {
			w.logger.Warn("worker mark running failed", "execution", r.ID.String(), "error", err)
			continue
		}
		claimed++

		attemptNum := r.AttemptCount + 1
		attemptID, err := q.CreateAttempt(tickCtx, db.CreateAttemptParams{
			ExecutionID:   r.ID,
			AttemptNumber: attemptNum,
			WorkerID:      sql.NullString{String: w.id, Valid: true},
			RequestMethod: sql.NullString{String: r.TargetMethod, Valid: r.TargetMethod != ""},
			RequestUrl:    sql.NullString{String: r.TargetUrl, Valid: true},
		})
		if err != nil {
			w.logger.Error("worker create attempt failed", "execution", r.ID.String(), "error", err)
			// execution is already RUNNING, counting as failed terminal would be wrong, just continue and let reaper handle
			continue
		}

		code, body, httpErr := doHTTP(ctx, r.TargetMethod, r.TargetUrl, r.TargetHeaders, r.TargetTimeoutSeconds)

		if httpErr != nil {
			isTimeout := errors.Is(httpErr, context.DeadlineExceeded) ||
				strings.Contains(httpErr.Error(), "context deadline exceeded") ||
				strings.Contains(strings.ToLower(httpErr.Error()), "timeout") ||
				strings.Contains(httpErr.Error(), "Client.Timeout")

			status := "FAILURE"
			if isTimeout {
				status = "TIMEOUT"
			}
			_ = q.CompleteAttempt(tickCtx, db.CompleteAttemptParams{
				ID:                 attemptID,
				Status:             status,
				ResponseStatusCode: sql.NullInt32{Valid: false},
				ResponseBody:       sql.NullString{Valid: false},
				ErrorMessage:       sql.NullString{String: httpErr.Error(), Valid: true},
			})

			newCount := attemptNum
			if newCount < r.RetryMaxAttempts {
				delay := NextDelay(newCount, r.RetryInitialDelaySeconds, r.RetryMaxDelaySeconds)
				if delay == 0 {
					delay = time.Second
				}
				scheduledAt := time.Now().UTC().Add(delay)
				if err := q.RescheduleForRetry(tickCtx, db.RescheduleForRetryParams{
					ID:           r.ID,
					ScheduledAt:  scheduledAt,
					AttemptCount: newCount,
				}); err != nil {
					w.logger.Error("worker reschedule failed", "execution", r.ID.String(), "error", err)
				} else {
					w.logger.Info("worker scheduled retry", "execution", r.ID.String(), "attempt", newCount, "delay", delay.String())
				}
				continue
			}
			// terminal failure
			_ = q.FailExecution(tickCtx, db.FailExecutionParams{
				ID:               r.ID,
				ResultStatusCode: sql.NullInt32{Valid: false},
				ResultBody:       sql.NullString{Valid: false},
				ResultError:      sql.NullString{String: httpErr.Error(), Valid: true},
				AttemptCount:     newCount,
				ClaimToken:       claimedRow.ClaimToken,
			})
			failed++
			w.logger.Info("worker execution failed", "execution", r.ID.String(), "attempt", newCount, "error", httpErr.Error())
			continue
		}

		if code >= 200 && code < 300 {
			_ = q.CompleteAttempt(tickCtx, db.CompleteAttemptParams{
				ID:                 attemptID,
				Status:             "SUCCESS",
				ResponseStatusCode: sql.NullInt32{Int32: int32(code), Valid: true},
				ResponseBody:       sql.NullString{String: body, Valid: true},
				ErrorMessage:       sql.NullString{Valid: false},
			})
			if err := q.CompleteExecutionSuccess(tickCtx, db.CompleteExecutionSuccessParams{
				ID:               r.ID,
				ResultStatusCode: sql.NullInt32{Int32: int32(code), Valid: true},
				ResultBody:       sql.NullString{String: body, Valid: true},
				AttemptCount:     attemptNum,
				ClaimToken:       claimedRow.ClaimToken,
			}); err != nil {
				w.logger.Error("worker complete success failed", "execution", r.ID.String(), "error", err)
				continue
			}
			succeeded++
			w.logger.Info("worker execution succeeded", "execution", r.ID.String(), "code", code)
			continue
		}

		// non-2xx
		_ = q.CompleteAttempt(tickCtx, db.CompleteAttemptParams{
			ID:                 attemptID,
			Status:             "FAILURE",
			ResponseStatusCode: sql.NullInt32{Int32: int32(code), Valid: true},
			ResponseBody:       sql.NullString{String: body, Valid: true},
			ErrorMessage:       sql.NullString{Valid: false},
		})
		newCount := attemptNum
		if newCount < r.RetryMaxAttempts {
			delay := NextDelay(newCount, r.RetryInitialDelaySeconds, r.RetryMaxDelaySeconds)
			if delay == 0 {
				delay = time.Second
			}
			scheduledAt := time.Now().UTC().Add(delay)
			if err := q.RescheduleForRetry(tickCtx, db.RescheduleForRetryParams{
				ID:           r.ID,
				ScheduledAt:  scheduledAt,
				AttemptCount: newCount,
			}); err != nil {
				w.logger.Error("worker reschedule failed", "execution", r.ID.String(), "error", err)
			} else {
				w.logger.Info("worker scheduled retry for non-2xx", "execution", r.ID.String(), "code", code, "delay", delay.String())
			}
			continue
		}
		_ = q.FailExecution(tickCtx, db.FailExecutionParams{
			ID:               r.ID,
			ResultStatusCode: sql.NullInt32{Int32: int32(code), Valid: true},
			ResultBody:       sql.NullString{String: body, Valid: true},
			ResultError:      sql.NullString{String: fmt.Sprintf("status %d", code), Valid: true},
			AttemptCount:     newCount,
			ClaimToken:       claimedRow.ClaimToken,
		})
		failed++
		w.logger.Info("worker execution failed non-2xx", "execution", r.ID.String(), "code", code)
	}

	return claimed, succeeded, failed, nil
}

// Start loops until ctx is cancelled. Call it in a goroutine.
func (w *Worker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	w.logger.Info("worker started", "interval", w.interval.String(), "batch", w.batch, "id", w.id)
	for {
		select {
		case <-ctx.Done():
			w.logger.Info("worker stopped")
			return
		case <-ticker.C:
			_, _, _, _ = w.Tick(ctx)
		}
	}
}
