package job

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	db "github.com/Ayush27pandit/Cronio/server/internal/database/generated"
)

// Errors for ScheduleDue. Callers can check with errors.Is.
var (
	// ErrNotDue is returned when a job is not yet due. ScheduleDue currently
	// returns uuid.Nil, nil for this case and reserves ErrNotDue for future callers
	// that want to distinguish it.
	ErrNotDue = errors.New("job not due")
	// ErrConcurrencyLimited is returned when a job already has max active executions.
	ErrConcurrencyLimited = errors.New("concurrency limit reached")
)

// Service is the deep Job module. It owns the transaction that turns a due Job
// into an Execution. Callers supply TenantID explicitly so tenant isolation
// is checked inside the lock. One Service is shared by HTTP handlers and
// the scheduler loop.
type Service struct {
	db *sql.DB
}

// New creates a Job Service that uses db for all queries.
// Example:
//
//	svc := job.New(db)
//	execID, err := svc.ScheduleDue(ctx, tenantID, jobID)
func New(db *sql.DB) *Service {
	return &Service{db: db}
}

// ScheduleDue atomically claims a due job, checks concurrency, creates an
// execution, and advances next_run_at. It is safe for a fleet of schedulers
// because the row is locked with FOR UPDATE SKIP LOCKED.
//
// Returns uuid.Nil with no error when the job is not due, already locked by
// another scheduler, or no row matches the tenant and id. Returns an error
// wrapping ErrConcurrencyLimited when the job already has max active executions.
// On success it returns the new execution id.
func (s *Service) ScheduleDue(ctx context.Context, tenantID TenantID, jobID uuid.UUID) (uuid.UUID, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return uuid.Nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	q := db.New(s.db)
	txq := q.WithTx(tx)

	job, err := txq.LockDueJob(ctx, db.LockDueJobParams{
		ID:       jobID,
		TenantID: tenantID.UUID(),
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return uuid.Nil, nil
		}
		return uuid.Nil, fmt.Errorf("lock due job: %w", err)
	}

	// Concurrency check: count CLAIMED or RUNNING executions.
	active, err := txq.CountActiveExecutions(ctx, job.ID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("count active executions: %w", err)
	}
	if active >= job.ConcurrencyMaxExecutions {
		return uuid.Nil, fmt.Errorf("%w: %d active, max %d", ErrConcurrencyLimited, active, job.ConcurrencyMaxExecutions)
	}

	// Build typed Schedule from stored columns.
	sched, err := scheduleFromRow(job.ScheduleType, job.ScheduleExpr, job.Timezone)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid schedule for job %s: %w", job.ID, err)
	}

	// Compute next firing after the current due time.
	// job.NextRunAt is the time this execution is for (<= NOW per lock).
	var base time.Time
	if job.NextRunAt.Valid {
		base = job.NextRunAt.Time
	} else {
		base = time.Now().UTC()
	}
	next, enabled, err := sched.NextRun(base)
	if err != nil {
		return uuid.Nil, fmt.Errorf("next run: %w", err)
	}

	// Create execution for the current due time.
	scheduledAt := job.NextRunAt.Time
	if !job.NextRunAt.Valid {
		scheduledAt = time.Now().UTC()
	}
	exec, err := txq.CreateExecution(ctx, db.CreateExecutionParams{
		JobID:       job.ID,
		TenantID:    job.TenantID,
		ScheduledAt: scheduledAt,
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("create execution: %w", err)
	}

	// Advance or disable job.
	var nextNull sql.NullTime
	if enabled {
		nextNull = sql.NullTime{Time: next, Valid: true}
	} else {
		nextNull = sql.NullTime{Valid: false}
	}
	if err := txq.UpdateJobNextRun(ctx, db.UpdateJobNextRunParams{
		ID:        job.ID,
		NextRunAt: nextNull,
		Enabled:   enabled,
	}); err != nil {
		return uuid.Nil, fmt.Errorf("update next run: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return uuid.Nil, fmt.Errorf("commit transaction: %w", err)
	}

	return exec.ID, nil
}

// scheduleFromRow rebuilds a typed Schedule from the three columns stored in Postgres.
// It is a helper for ScheduleDue so the row does not leak raw strings to callers.
func scheduleFromRow(typ, expr, tz string) (Schedule, error) {
	switch typ {
	case ScheduleCron:
		return NewCronSchedule(expr, tz)
	case ScheduleInterval:
		return NewIntervalSchedule(expr)
	case ScheduleOnce:
		return NewOnceSchedule(expr)
	default:
		return Schedule{}, fmt.Errorf("unsupported schedule type %q", typ)
	}
}
