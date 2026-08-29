package scheduler

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/Ayush27pandit/Cronio/server/internal/job"
	db "github.com/Ayush27pandit/Cronio/server/internal/database/generated"
	"database/sql"
)

// Ticker is the heartbeat that turns due Jobs into READY Executions.
// It polls GetDueJobs every interval and calls job.Service.ScheduleDue for each row.
// The deep transaction with FOR UPDATE SKIP LOCKED lives in job.Service, so this
// loop stays thin and fleet safe. Tick is the test surface, Start is the loop.
type Ticker struct {
	db       *sql.DB
	svc      *job.Service
	logger   *slog.Logger
	interval time.Duration
	batch    int32
}

// NewTicker creates a ticker. Interval and batch are required; pass 0 to use defaults.
func NewTicker(db *sql.DB, svc *job.Service, logger *slog.Logger, interval time.Duration, batch int32) *Ticker {
	if interval == 0 {
		interval = time.Second
	}
	if batch == 0 {
		batch = 100
	}
	return &Ticker{
		db:       db,
		svc:      svc,
		logger:   logger,
		interval: interval,
		batch:    batch,
	}
}

// Tick does one poll and tries to claim up to batch due jobs.
// It is the seam tests hit directly without waiting for the ticker.
func (t *Ticker) Tick(ctx context.Context) (claimed, skipped int, err error) {
	// Per-tick timeout so a stuck DB does not block the next tick.
	tickCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	q := db.New(t.db)
	rows, err := q.GetDueJobs(tickCtx, t.batch)
	if err != nil {
		t.logger.Error("ticker poll failed", "error", err)
		return 0, 0, err
	}
	if len(rows) == 0 {
		return 0, 0, nil
	}

	for _, r := range rows {
		// Each ScheduleDue is its own transaction with SKIP LOCKED.
		tenant := job.TenantID(r.TenantID)
		execID, err := t.svc.ScheduleDue(tickCtx, tenant, r.ID)
		if err != nil {
			// Concurrency limit or other business error is not fatal, just skip and log.
			t.logger.Warn("schedule due failed", "job", r.ID.String(), "tenant", r.TenantID.String(), "error", err)
			skipped++
			continue
		}
		if execID == uuid.Nil {
			// Not due, already locked by another scheduler, or skipped.
			skipped++
			continue
		}
		claimed++
		t.logger.Info("claimed job", "job", r.ID.String(), "tenant", r.TenantID.String(), "execution", execID.String())
	}
	return claimed, skipped, nil
}

// Start loops until ctx is cancelled. Call it in a goroutine.
func (t *Ticker) Start(ctx context.Context) {
	ticker := time.NewTicker(t.interval)
	defer ticker.Stop()

	t.logger.Info("scheduler ticker started", "interval", t.interval.String(), "batch", t.batch)
	for {
		select {
		case <-ctx.Done():
			t.logger.Info("scheduler ticker stopped")
			return
		case <-ticker.C:
			_, _, _ = t.Tick(ctx)
		}
	}
}
