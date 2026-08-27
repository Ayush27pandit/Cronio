package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	db "github.com/Ayush27pandit/Cronio/server/internal/database/generated"
)

type SchedulerRepository struct {
	db *sql.DB
}

func NewSchedulerRepository(db *sql.DB) *SchedulerRepository {
	return &SchedulerRepository{
		db: db,
	}
}

func (r *SchedulerRepository) ScheduleJob(
	ctx context.Context,
	jobID uuid.UUID,
	nextRunAt time.Time,
) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	defer tx.Rollback()

	q := db.New(r.db)
	txq := q.WithTx(tx)

	// 1. Lock the job and make sure it is still due.
	job, err := txq.LockDueJob(ctx, jobID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}

		return fmt.Errorf("lock due job: %w", err)
	}

	// 2. Create an execution.
	_, err = txq.CreateExecution(ctx, db.CreateExecutionParams{
		JobID:       job.ID,
		TenantID:    job.TenantID,
		ScheduledAt: job.NextRunAt.Time,
	})
	if err != nil {
		return fmt.Errorf("create execution: %w", err)
	}

	// 3. Advance the job's next run time.
	err = txq.UpdateJobNextRun(ctx, db.UpdateJobNextRunParams{
		ID: job.ID,
		NextRunAt: sql.NullTime{
			Time:  nextRunAt,
			Valid: true,
		},
		Enabled: true,
	})
	if err != nil {
		return fmt.Errorf("update next run: %w", err)
	}

	// 4. Commit everything atomically.
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}
