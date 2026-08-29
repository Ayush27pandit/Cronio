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

	q := db.New(s.db)
	row, err := q.CreateJob(ctx, db.CreateJobParams{
		TenantID:     tenantID.UUID(),
		Name:         name,
		Description:  desc,
		ScheduleType: in.Schedule.Kind(),
		ScheduleExpr: in.Schedule.Expr(),
		Timezone:     in.Schedule.Timezone(),
		TargetUrl:    strings.TrimSpace(in.TargetURL),
		NextRunAt:    nextNull,
		Enabled:      enabled,
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
