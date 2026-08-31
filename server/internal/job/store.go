package job

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	db "github.com/Ayush27pandit/Cronio/server/internal/database/generated"
)

// CreateInput is the data callers supply to create a Job.
// Callers must build Schedule with NewCronSchedule, NewIntervalSchedule,
// or NewOnceSchedule so the schedule is validated before it reaches Create.
//
// Example:
//
//	sched, _ := job.NewCronSchedule("0 9 * * *", "Asia/Kolkata")
//	row, err := svc.Create(ctx, tenantID, job.CreateInput{
//	    Name:      "daily report",
//	    Schedule:  sched,
//	    TargetURL: "https://api.internal.com/reports/daily",
//	})
type CreateInput struct {
	// Name is the human label, required, trimmed, max 200 runes.
	Name string
	// Description is optional, trimmed.
	Description string
	// Schedule is already validated by its constructor.
	Schedule Schedule
	// TargetURL where the worker will POST. Must be http or https.
	TargetURL string
	// TargetTimeoutSeconds is optional, 5 to 300, default 30.
	TargetTimeoutSeconds int32
	// RetryMaxAttempts is optional, 1 to 10, default 3.
	RetryMaxAttempts int32
	// ConcurrencyMaxExecutions is optional, 1 to 10, default 1.
	ConcurrencyMaxExecutions int32
}

// Create validates the input, computes next_run_at from the typed Schedule,
// and inserts the job for the given tenant.
//
// It returns the inserted row or an error that callers can map to 400.
// Validation checks name, target URL, and schedule presence. The schedule
// itself is validated at construction, so Create only checks that one is present.
func (s *Service) Create(ctx context.Context, tenantID TenantID, in CreateInput) (db.CreateJobRow, error) {
	name := strings.TrimSpace(in.Name)
	if err := validateCreateInput(tenantID, name, in); err != nil {
		return db.CreateJobRow{}, err
	}

	// Compute next_run_at from now.
	next, enabled, err := in.Schedule.NextRun(time.Now().UTC())
	if err != nil {
		return db.CreateJobRow{}, fmt.Errorf("schedule next_run: %w", err)
	}
	var nextNull sql.NullTime
	if enabled {
		nextNull = sql.NullTime{Time: next, Valid: true}
	} else {
		// Once in the past: store disabled with no next run.
		nextNull = sql.NullTime{Valid: false}
		enabled = false
	}

	// For once that is already past, we still allow creation but disabled.
	// Callers that want to reject past once can check enabled before calling,
	// but storage keeps the rule inside the module.
	var desc sql.NullString
	if strings.TrimSpace(in.Description) != "" {
		desc = sql.NullString{String: strings.TrimSpace(in.Description), Valid: true}
	}

	timeout := in.TargetTimeoutSeconds
	if timeout == 0 {
		timeout = 30
	}
	if timeout < 5 || timeout > 300 {
		return db.CreateJobRow{}, fmt.Errorf("target_timeout_seconds must be 5 to 300")
	}
	retry := in.RetryMaxAttempts
	if retry == 0 {
		retry = 3
	}
	if retry < 1 || retry > 10 {
		return db.CreateJobRow{}, fmt.Errorf("retry_max_attempts must be 1 to 10")
	}
	concurrency := in.ConcurrencyMaxExecutions
	if concurrency == 0 {
		concurrency = 1
	}
	if concurrency < 1 || concurrency > 10 {
		return db.CreateJobRow{}, fmt.Errorf("concurrency_max_executions must be 1 to 10")
	}

	q := db.New(s.db)
	row, err := q.CreateJob(ctx, db.CreateJobParams{
		TenantID:                 tenantID.UUID(),
		Name:                     name,
		Description:              desc,
		ScheduleType:             in.Schedule.Kind(),
		ScheduleExpr:             in.Schedule.Expr(),
		Timezone:                 in.Schedule.Timezone(),
		TargetUrl:                strings.TrimSpace(in.TargetURL),
		TargetTimeoutSeconds:     timeout,
		RetryMaxAttempts:         retry,
		ConcurrencyMaxExecutions: concurrency,
		NextRunAt:                nextNull,
		Enabled:                  enabled,
	})
	if err != nil {
		return db.CreateJobRow{}, fmt.Errorf("create job: %w", err)
	}
	return row, nil
}

// Get returns the job for the tenant and id.
// It returns sql.ErrNoRows if the job does not exist or belongs to another tenant.
func (s *Service) Get(ctx context.Context, tenantID TenantID, jobID uuid.UUID) (db.Job, error) {
	q := db.New(s.db)
	return q.GetJobForTenant(ctx, db.GetJobForTenantParams{
		ID:       jobID,
		TenantID: tenantID.UUID(),
	})
}

// List returns all jobs for the tenant, newest first.
// An empty slice means the tenant has no jobs.
func (s *Service) List(ctx context.Context, tenantID TenantID) ([]db.Job, error) {
	q := db.New(s.db)
	return q.ListJobs(ctx, tenantID.UUID())
}

// UpdateInput holds optional fields for PATCH. Nil means no change.
type UpdateInput struct {
	Name                     *string
	Description              *string
	Enabled                  *bool
	Schedule                 *Schedule
	TargetURL                *string
	TargetTimeoutSeconds     *int32
	RetryMaxAttempts         *int32
	ConcurrencyMaxExecutions *int32
}

// Update patches a job for the tenant. Nil fields are left unchanged.
// If Schedule is provided it recomputes next_run_at and enabled via NextRun.
// If Enabled is provided it toggles the flag; re-enabling a job without a next
// run recomputes it from the current schedule.
func (s *Service) Update(ctx context.Context, tenantID TenantID, jobID uuid.UUID, in UpdateInput) (db.UpdateJobRow, error) {
	if tenantID.IsZero() {
		return db.UpdateJobRow{}, fmt.Errorf("tenant_id is required")
	}
	// Load current job for tenant check and defaults.
	cur, err := s.Get(ctx, tenantID, jobID)
	if err != nil {
		return db.UpdateJobRow{}, err
	}

	newName := cur.Name
	newDesc := cur.Description
	newSchedType := cur.ScheduleType
	newSchedExpr := cur.ScheduleExpr
	newTz := cur.Timezone
	newTargetURL := cur.TargetUrl
	newNext := cur.NextRunAt
	newEnabled := cur.Enabled

	if in.Name != nil {
		n := strings.TrimSpace(*in.Name)
		if n == "" {
			return db.UpdateJobRow{}, fmt.Errorf("name is required")
		}
		if len(n) > 200 {
			return db.UpdateJobRow{}, fmt.Errorf("name too long (max 200)")
		}
		newName = n
	}
	if in.Description != nil {
		d := strings.TrimSpace(*in.Description)
		if d == "" {
			newDesc = sql.NullString{Valid: false}
		} else {
			newDesc = sql.NullString{String: d, Valid: true}
		}
	}
	if in.TargetURL != nil {
		tu := strings.TrimSpace(*in.TargetURL)
		if tu == "" {
			return db.UpdateJobRow{}, fmt.Errorf("target_url is required")
		}
		if err := validateTargetURL(tu); err != nil {
			return db.UpdateJobRow{}, err
		}
		newTargetURL = tu
	}

	newTargetTimeout := cur.TargetTimeoutSeconds
	newRetry := cur.RetryMaxAttempts
	newConcurrency := cur.ConcurrencyMaxExecutions

	if in.TargetTimeoutSeconds != nil {
		if *in.TargetTimeoutSeconds < 5 || *in.TargetTimeoutSeconds > 300 {
			return db.UpdateJobRow{}, fmt.Errorf("target_timeout_seconds must be 5 to 300")
		}
		newTargetTimeout = *in.TargetTimeoutSeconds
	}
	if in.RetryMaxAttempts != nil {
		if *in.RetryMaxAttempts < 1 || *in.RetryMaxAttempts > 10 {
			return db.UpdateJobRow{}, fmt.Errorf("retry_max_attempts must be 1 to 10")
		}
		newRetry = *in.RetryMaxAttempts
	}
	if in.ConcurrencyMaxExecutions != nil {
		if *in.ConcurrencyMaxExecutions < 1 || *in.ConcurrencyMaxExecutions > 10 {
			return db.UpdateJobRow{}, fmt.Errorf("concurrency_max_executions must be 1 to 10")
		}
		newConcurrency = *in.ConcurrencyMaxExecutions
	}

	scheduleChanged := false
	if in.Schedule != nil {
		if in.Schedule.Kind() == "" {
			return db.UpdateJobRow{}, fmt.Errorf("schedule is required")
		}
		newSchedType = in.Schedule.Kind()
		newSchedExpr = in.Schedule.Expr()
		newTz = in.Schedule.Timezone()
		scheduleChanged = true
	}

	// Recompute next_run_at if schedule changed or we are re-enabling.
	needsRecompute := scheduleChanged
	if in.Enabled != nil && *in.Enabled && !newEnabled {
		needsRecompute = true
	}
	if in.Enabled != nil && !*in.Enabled {
		newEnabled = false
		newNext = sql.NullTime{Valid: false}
		needsRecompute = false
	} else if needsRecompute {
		// Use the new schedule to compute next.
		var sVal Schedule
		if in.Schedule != nil {
			sVal = *in.Schedule
		} else {
			sVal, err = scheduleFromRow(newSchedType, newSchedExpr, newTz)
			if err != nil {
				return db.UpdateJobRow{}, err
			}
		}
		next, enabled, err := sVal.NextRun(time.Now().UTC())
		if err != nil {
			return db.UpdateJobRow{}, fmt.Errorf("schedule next_run: %w", err)
		}
		if enabled {
			newNext = sql.NullTime{Time: next, Valid: true}
			newEnabled = true
		} else {
			newNext = sql.NullTime{Valid: false}
			newEnabled = false
		}
	} else if in.Enabled != nil {
		newEnabled = *in.Enabled
		if newEnabled && !newNext.Valid {
			// Enabling a job that had no next run (once past or disabled).
			sVal, err := scheduleFromRow(newSchedType, newSchedExpr, newTz)
			if err != nil {
				return db.UpdateJobRow{}, err
			}
			next, enabled, err := sVal.NextRun(time.Now().UTC())
			if err != nil {
				return db.UpdateJobRow{}, fmt.Errorf("schedule next_run: %w", err)
			}
			if enabled {
				newNext = sql.NullTime{Time: next, Valid: true}
				newEnabled = true
			} else {
				newNext = sql.NullTime{Valid: false}
				newEnabled = false
			}
		}
	}

	q := db.New(s.db)
	row, err := q.UpdateJob(ctx, db.UpdateJobParams{
		ID:                       jobID,
		TenantID:                 tenantID.UUID(),
		Name:                     newName,
		Description:              newDesc,
		ScheduleType:             newSchedType,
		ScheduleExpr:             newSchedExpr,
		Timezone:                 newTz,
		TargetUrl:                newTargetURL,
		TargetTimeoutSeconds:     newTargetTimeout,
		RetryMaxAttempts:         newRetry,
		ConcurrencyMaxExecutions: newConcurrency,
		NextRunAt:                newNext,
		Enabled:                  newEnabled,
	})
	if err != nil {
		return db.UpdateJobRow{}, fmt.Errorf("update job: %w", err)
	}
	return row, nil
}

// validateCreateInput checks the minimal fields for Create.
// It is a helper so Create stays focused on next_run_at and the INSERT.
// Checks in order: tenant is present, name is present and <=200, target URL
// is present and http/https, schedule is present. Returns the first error.
func validateCreateInput(tenantID TenantID, name string, in CreateInput) error {
	if tenantID.IsZero() {
		return fmt.Errorf("tenant_id is required")
	}
	if name == "" {
		return fmt.Errorf("name is required")
	}
	if len(name) > 200 {
		return fmt.Errorf("name too long (max 200)")
	}
	if strings.TrimSpace(in.TargetURL) == "" {
		return fmt.Errorf("target_url is required")
	}
	if err := validateTargetURL(in.TargetURL); err != nil {
		return err
	}
	if in.Schedule.Kind() == "" {
		return fmt.Errorf("schedule is required")
	}
	return nil
}

// ListExecutions returns recent executions for a job, tenant-scoped.
// It first checks the job belongs to the tenant, then lists executions.
func (s *Service) ListExecutions(ctx context.Context, tenantID TenantID, jobID uuid.UUID, limit int32) ([]db.ListExecutionsForJobRow, error) {
	if tenantID.IsZero() {
		return nil, fmt.Errorf("tenant_id is required")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if _, err := s.Get(ctx, tenantID, jobID); err != nil {
		return nil, err
	}
	q := db.New(s.db)
	return q.ListExecutionsForJob(ctx, db.ListExecutionsForJobParams{
		JobID:    jobID,
		TenantID: tenantID.UUID(),
		Limit:    limit,
	})
}

// ExecutionDetail holds one execution and its attempts, tenant scoped via execution tenant.
type ExecutionDetail struct {
	Execution db.GetExecutionRow
	Attempts  []db.ListAttemptsForExecutionRow
}

// GetExecution returns one execution with its attempts, tenant scoped.
// It returns sql.ErrNoRows if the execution does not exist or belongs to another tenant.
func (s *Service) GetExecution(ctx context.Context, tenantID TenantID, execID uuid.UUID) (ExecutionDetail, error) {
	if tenantID.IsZero() {
		return ExecutionDetail{}, fmt.Errorf("tenant_id is required")
	}
	q := db.New(s.db)
	row, err := q.GetExecution(ctx, db.GetExecutionParams{
		ID:       execID,
		TenantID: tenantID.UUID(),
	})
	if err != nil {
		return ExecutionDetail{}, err
	}
	atts, err := q.ListAttemptsForExecution(ctx, execID)
	if err != nil {
		return ExecutionDetail{}, err
	}
	return ExecutionDetail{
		Execution: row,
		Attempts:  atts,
	}, nil
}

// DeleteJob soft deletes a job tenant scoped, keeps executions and attempts for history.
// It sets enabled false and next_run_at null. Returns sql.ErrNoRows if not found.
func (s *Service) DeleteJob(ctx context.Context, tenantID TenantID, jobID uuid.UUID) (db.SoftDeleteJobRow, error) {
	if tenantID.IsZero() {
		return db.SoftDeleteJobRow{}, fmt.Errorf("tenant_id is required")
	}
	q := db.New(s.db)
	row, err := q.SoftDeleteJob(ctx, db.SoftDeleteJobParams{
		ID:       jobID,
		TenantID: tenantID.UUID(),
	})
	if err != nil {
		return db.SoftDeleteJobRow{}, err
	}
	return row, nil
}

// validateTargetURL checks that raw is an http or https URL with a host.
// It blocks the metadata IP used for SSRF in MVP: 169.254.169.254.
func validateTargetURL(raw string) error {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return fmt.Errorf("invalid target_url %q: %w", raw, err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("target_url must be http or https, got %q", u.Scheme)
	}
	if u.Host == "" {
		return fmt.Errorf("target_url missing host")
	}
	// SSRF guard: block private metadata IP in MVP.
	host := strings.ToLower(u.Hostname())
	if host == "169.254.169.254" || host == "metadata.google.internal" {
		return fmt.Errorf("target_url host %q is blocked", host)
	}
	return nil
}
