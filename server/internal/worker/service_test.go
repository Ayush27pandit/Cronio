package worker

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Ayush27pandit/Cronio/server/internal/database"
	"github.com/Ayush27pandit/Cronio/server/internal/job"
)

func testDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		t.Skip("DB_URL not set, skipping worker integration test")
	}
	db, err := database.New(dsn)
	if err != nil {
		t.Skipf("cannot connect to DB: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestWorker_Tick_Success(t *testing.T) {
	dbConn := testDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	ctx := context.Background()

	// Isolate: push other READY executions to the future so only our execution is due.
	_, _ = dbConn.ExecContext(ctx, `UPDATE executions SET scheduled_at = NOW() + INTERVAL '1 day' WHERE status = 'READY'`)

	// Start httptest server that returns 200.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	// Create job pointing to test server.
	tenantID := job.TenantID(uuid.New())
	sched, _ := job.NewIntervalSchedule("1h")
	svc := job.New(dbConn)
	row, err := svc.Create(ctx, tenantID, job.CreateInput{
		Name:      "worker-success-test",
		Schedule:  sched,
		TargetURL: srv.URL,
	})
	if err != nil {
		t.Fatalf("create job: %v", err)
	}
	t.Cleanup(func() {
		_, _ = dbConn.ExecContext(ctx, `DELETE FROM attempts WHERE execution_id IN (SELECT id FROM executions WHERE job_id = $1)`, row.ID)
		_, _ = dbConn.ExecContext(ctx, `DELETE FROM executions WHERE job_id = $1`, row.ID)
		_, _ = dbConn.ExecContext(ctx, `DELETE FROM jobs WHERE id = $1`, row.ID)
	})

	// Create a READY execution directly.
	var execID uuid.UUID
	err = dbConn.QueryRowContext(ctx, `INSERT INTO executions (job_id, tenant_id, status, scheduled_at) VALUES ($1, $2, 'READY', NOW()) RETURNING id`, row.ID, tenantID.UUID()).Scan(&execID)
	if err != nil {
		t.Fatalf("insert execution: %v", err)
	}

	w := New(dbConn, logger, "test-worker", time.Second, 1)
	claimed, succeeded, failed, err := w.Tick(ctx)
	if err != nil {
		t.Fatalf("Tick: %v", err)
	}
	if claimed == 0 {
		t.Fatal("expected claimed 1")
	}
	if succeeded != 1 {
		t.Fatalf("expected succeeded 1 got %d failed %d", succeeded, failed)
	}
	if failed != 0 {
		t.Fatalf("expected failed 0 got %d", failed)
	}

	// Verify execution is SUCCESS.
	var status string
	var resultCode sql.NullInt32
	var attemptCount int32
	err = dbConn.QueryRowContext(ctx, `SELECT status, result_status_code, attempt_count FROM executions WHERE id = $1`, execID).Scan(&status, &resultCode, &attemptCount)
	if err != nil {
		t.Fatalf("query execution: %v", err)
	}
	if status != "SUCCESS" {
		t.Fatalf("expected SUCCESS got %s", status)
	}
	if !resultCode.Valid || resultCode.Int32 != 200 {
		t.Fatalf("expected result 200 got %v", resultCode)
	}
	if attemptCount != 1 {
		t.Fatalf("expected attempt_count 1 got %d", attemptCount)
	}

	// Verify attempt.
	var attStatus string
	var attCode sql.NullInt32
	err = dbConn.QueryRowContext(ctx, `SELECT status, response_status_code FROM attempts WHERE execution_id = $1 ORDER BY attempt_number DESC LIMIT 1`, execID).Scan(&attStatus, &attCode)
	if err != nil {
		t.Fatalf("query attempt: %v", err)
	}
	if attStatus != "SUCCESS" {
		t.Fatalf("expected attempt SUCCESS got %s", attStatus)
	}
	if !attCode.Valid || attCode.Int32 != 200 {
		t.Fatalf("expected attempt code 200 got %v", attCode)
	}
}

func TestWorker_Tick_RetryOnFailure(t *testing.T) {
	dbConn := testDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	ctx := context.Background()

	// Isolate: push other READY executions to the future.
	_, _ = dbConn.ExecContext(ctx, `UPDATE executions SET scheduled_at = NOW() + INTERVAL '1 day' WHERE status = 'READY'`)

	// Server returns 500.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
		_, _ = w.Write([]byte("internal error"))
	}))
	defer srv.Close()

	tenantID := job.TenantID(uuid.New())
	sched, _ := job.NewIntervalSchedule("1h")
	svc := job.New(dbConn)
	row, err := svc.Create(ctx, tenantID, job.CreateInput{
		Name:      "worker-retry-test",
		Schedule:  sched,
		TargetURL: srv.URL,
	})
	if err != nil {
		t.Fatalf("create job: %v", err)
	}
	// Lower retry delay for test by updating job row directly.
	_, _ = dbConn.ExecContext(ctx, `UPDATE jobs SET retry_initial_delay_seconds = 1, retry_max_delay_seconds = 2 WHERE id = $1`, row.ID)

	t.Cleanup(func() {
		_, _ = dbConn.ExecContext(ctx, `DELETE FROM attempts WHERE execution_id IN (SELECT id FROM executions WHERE job_id = $1)`, row.ID)
		_, _ = dbConn.ExecContext(ctx, `DELETE FROM executions WHERE job_id = $1`, row.ID)
		_, _ = dbConn.ExecContext(ctx, `DELETE FROM jobs WHERE id = $1`, row.ID)
	})

	var execID uuid.UUID
	err = dbConn.QueryRowContext(ctx, `INSERT INTO executions (job_id, tenant_id, status, scheduled_at) VALUES ($1, $2, 'READY', NOW()) RETURNING id`, row.ID, tenantID.UUID()).Scan(&execID)
	if err != nil {
		t.Fatalf("insert execution: %v", err)
	}

	w := New(dbConn, logger, "test-worker", time.Second, 1)
	claimed, succeeded, failed, err := w.Tick(ctx)
	if err != nil {
		t.Fatalf("Tick: %v", err)
	}
	if claimed == 0 {
		t.Fatalf("expected claimed 1 got %d", claimed)
	}
	// Should not be terminal yet, so succeeded 0 failed 0 but requeued.
	if succeeded != 0 || failed != 0 {
		t.Fatalf("expected retry not terminal got succeeded %d failed %d", succeeded, failed)
	}

	// Execution should be READY again with future scheduled_at.
	var status string
	var scheduledAt time.Time
	var attemptCount int32
	err = dbConn.QueryRowContext(ctx, `SELECT status, scheduled_at, attempt_count FROM executions WHERE id = $1`, execID).Scan(&status, &scheduledAt, &attemptCount)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if status != "READY" {
		t.Fatalf("expected READY for retry got %s", status)
	}
	if attemptCount != 1 {
		t.Fatalf("expected attempt_count 1 got %d", attemptCount)
	}
	if scheduledAt.Before(time.Now().UTC()) {
		t.Fatalf("expected future scheduled_at got %v", scheduledAt)
	}

	// Attempt should be FAILURE.
	var attStatus string
	err = dbConn.QueryRowContext(ctx, `SELECT status FROM attempts WHERE execution_id = $1 ORDER BY attempt_number DESC LIMIT 1`, execID).Scan(&attStatus)
	if err != nil {
		t.Fatalf("query attempt: %v", err)
	}
	if attStatus != "FAILURE" {
		t.Fatalf("expected FAILURE got %s", attStatus)
	}

	// Now make scheduled_at due again and fail until exhausted.
	_, _ = dbConn.ExecContext(ctx, `UPDATE executions SET scheduled_at = NOW() - INTERVAL '1 second' WHERE id = $1`, execID)
	// second attempt
	_, _, _, _ = w.Tick(ctx)
	_, _ = dbConn.ExecContext(ctx, `UPDATE executions SET scheduled_at = NOW() - INTERVAL '1 second' WHERE id = $1`, execID)
	// third attempt should terminal FAIL (max 3)
	claimed, succeeded, failed, _ = w.Tick(ctx)
	if claimed != 1 {
		t.Fatalf("expected claimed on third tick")
	}
	var finalStatus string
	_ = dbConn.QueryRowContext(ctx, `SELECT status FROM executions WHERE id = $1`, execID).Scan(&finalStatus)
	if finalStatus != "FAILURE" {
		t.Fatalf("expected terminal FAILURE got %s", finalStatus)
	}
	if failed != 1 {
		t.Fatalf("expected failed 1 on terminal got %d", failed)
	}
}

func TestWorker_Tick_ReapExpired(t *testing.T) {
	dbConn := testDB(t)
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	ctx := context.Background()

	tenantID := job.TenantID(uuid.New())
	sched, _ := job.NewIntervalSchedule("1h")
	svc := job.New(dbConn)
	row, err := svc.Create(ctx, tenantID, job.CreateInput{
		Name:      "worker-reap-test",
		Schedule:  sched,
		TargetURL: "https://example.com/hook",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = dbConn.ExecContext(ctx, `DELETE FROM executions WHERE job_id = $1`, row.ID)
		_, _ = dbConn.ExecContext(ctx, `DELETE FROM jobs WHERE id = $1`, row.ID)
	})

	// Insert CLAIMED with expired lease.
	var execID uuid.UUID
	err = dbConn.QueryRowContext(ctx, `INSERT INTO executions (job_id, tenant_id, status, scheduled_at, claimed_at, lease_until, claim_token, worker_id) VALUES ($1, $2, 'CLAIMED', NOW(), NOW() - INTERVAL '1 minute', NOW() - INTERVAL '30 seconds', gen_random_uuid(), 'old-worker') RETURNING id`, row.ID, tenantID.UUID()).Scan(&execID)
	if err != nil {
		t.Fatalf("insert: %v", err)
	}

	w := New(dbConn, logger, "test-worker", time.Second, 10)
	_, _, _, err = w.Tick(ctx)
	if err != nil {
		t.Fatalf("Tick: %v", err)
	}
	var status string
	var lease sql.NullTime
	err = dbConn.QueryRowContext(ctx, `SELECT status, lease_until FROM executions WHERE id = $1`, execID).Scan(&status, &lease)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if status != "READY" {
		t.Fatalf("expected READY after reap got %s", status)
	}
	if lease.Valid {
		t.Fatalf("expected lease null after reap")
	}
}
