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

// Errors for ScheduleDue.
var (
	ErrNotDue            = errors.New("job not due")
	ErrConcurrencyLimited = errors.New("concurrency limit reached")
)

// Service is the deep Job module. It owns schedule calculation and
// execution creation behind one seam. Callers supply TenantID explicitly.
type Service struct {
	db *sql.DB
}

// New creates a Job Service.
func New(db *sql.DB) *Service {
	return &Service{db: db}
}

// ScheduleDue atomically claims a due job, checks concurrency, creates an
// execution, and advances next_run_at. It is safe for a fleet of schedulers
// via FOR UPDATE SKIP LOCKED.
//
// Returns uuid.Nil when job is not due, already locked by another scheduler,
// or at concurrency limit — not an error. Returns ErrConcurrencyLimited only
// when the caller wants to distinguish that case.
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
