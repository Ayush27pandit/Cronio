package scheduler

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Ayush27pandit/Cronio/server/internal/database"
	"github.com/Ayush27pandit/Cronio/server/internal/job"
)

// helper to get a test DB. Skips if DB_URL not set or not reachable.
func testDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		// Try server/.env via godotenv? For tests, just skip if not set.
		t.Skip("DB_URL not set, skipping ticker integration test")
	}
	db, err := database.New(dsn)
	if err != nil {
		t.Skipf("cannot connect to DB: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestTicker_Tick_NoDueJobs(t *testing.T) {
	db := testDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	svc := job.New(db)
	ticker := NewTicker(db, svc, logger, time.Second, 10)

	ctx := context.Background()
	claimed, skipped, err := ticker.Tick(ctx)
	if err != nil {
		t.Fatalf("Tick: %v", err)
	}
	if claimed != 0 {
		t.Fatalf("expected 0 claimed, got %d", claimed)
	}
	_ = skipped
}

func TestTicker_Tick_ClaimsDueJob(t *testing.T) {
	db := testDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	svc := job.New(db)
	ticker := NewTicker(db, svc, logger, time.Second, 10)
	ctx := context.Background()

	tenantID := job.TenantID(uuid.New())
	sched, err := job.NewIntervalSchedule("1h")
	if err != nil {
		t.Fatal(err)
	}
	row, err := svc.Create(ctx, tenantID, job.CreateInput{
		Name:      "ticker-test-job",
		Schedule:  sched,
		TargetURL: "https://example.com/hook",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	// Make it due by moving next_run_at to the past.
	_, err = db.ExecContext(ctx, `UPDATE jobs SET next_run_at = NOW() - INTERVAL '1 hour' WHERE id = $1`, row.ID)
	if err != nil {
		t.Fatalf("update next_run_at: %v", err)
	}

	claimed, _, err := ticker.Tick(ctx)
	if err != nil {
		t.Fatalf("Tick: %v", err)
	}
	if claimed == 0 {
		t.Fatal("expected ticker to claim 1 job")
	}

	// Verify next_run_at was advanced to the future.
	var next sql.NullTime
	err = db.QueryRowContext(ctx, `SELECT next_run_at FROM jobs WHERE id = $1`, row.ID).Scan(&next)
	if err != nil {
		t.Fatalf("query next_run_at: %v", err)
	}
	if !next.Valid {
		t.Fatal("expected next_run_at to be valid after claim")
	}
	if next.Time.Before(time.Now().UTC()) {
		t.Fatalf("expected next_run_at in future, got %v", next.Time)
	}

	// Verify an execution was created.
	var count int
	err = db.QueryRowContext(ctx, `SELECT COUNT(*) FROM executions WHERE job_id = $1`, row.ID).Scan(&count)
	if err != nil {
		t.Fatalf("count executions: %v", err)
	}
	if count == 0 {
		t.Fatal("expected at least 1 execution")
	}

	// Second tick should not claim the same job again immediately (now not due).
	claimed, _, err = ticker.Tick(ctx)
	if err != nil {
		t.Fatalf("second Tick: %v", err)
	}
	if claimed != 0 {
		t.Fatalf("expected 0 claimed on second tick, got %d", claimed)
	}

	// Cleanup
	_, _ = db.ExecContext(ctx, `DELETE FROM executions WHERE job_id = $1`, row.ID)
	_, _ = db.ExecContext(ctx, `DELETE FROM jobs WHERE id = $1`, row.ID)
}

func TestTicker_Tick_ConcurrencyLimit(t *testing.T) {
	db := testDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	svc := job.New(db)
	ticker := NewTicker(db, svc, logger, time.Second, 10)
	ctx := context.Background()

	tenantID := job.TenantID(uuid.New())
	sched, _ := job.NewIntervalSchedule("1h")
	row, err := svc.Create(ctx, tenantID, job.CreateInput{
		Name:      "ticker-concurrency-test",
		Schedule:  sched,
		TargetURL: "https://example.com/hook",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	// Make it due.
	_, _ = db.ExecContext(ctx, `UPDATE jobs SET next_run_at = NOW() - INTERVAL '1 hour' WHERE id = $1`, row.ID)
	// Create a CLAIMED execution to hit max_executions (default 1).
	_, err = db.ExecContext(ctx, `INSERT INTO executions (job_id, tenant_id, status, scheduled_at, lease_until) VALUES ($1, $2, 'CLAIMED', NOW(), NOW() + INTERVAL '30 seconds')`, row.ID, tenantID.UUID())
	if err != nil {
		t.Fatalf("insert claimed: %v", err)
	}

	claimed, skipped, err := ticker.Tick(ctx)
	if err != nil {
		t.Fatalf("Tick: %v", err)
	}
	if claimed != 0 {
		t.Fatalf("expected 0 claimed due to concurrency, got %d", claimed)
	}
	if skipped == 0 {
		t.Fatalf("expected skipped due to concurrency")
	}

	_, _ = db.ExecContext(ctx, `DELETE FROM executions WHERE job_id = $1`, row.ID)
	_, _ = db.ExecContext(ctx, `DELETE FROM jobs WHERE id = $1`, row.ID)
}
