package server

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ayush27pandit/Cronio/server/internal/job"
	"github.com/Ayush27pandit/Cronio/server/internal/server/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func New(port string, logger *slog.Logger, db *sql.DB) *http.Server {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Timeout(10 * time.Second))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Static UI for quick visualisation. Keep at root so http://localhost:8080/ shows it.
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "static/index.html")
	})

	if db != nil {
		jsvc := job.New(db)

		r.Route("/v1", func(r chi.Router) {
			r.Use(middleware.Tenant)

			r.Post("/jobs", handleCreateJob(jsvc, logger))
			r.Get("/jobs", handleListJobs(jsvc, logger))
			r.Get("/jobs/{id}", handleGetJob(jsvc, logger))
			r.Patch("/jobs/{id}", handlePatchJob(jsvc, logger))
			r.Delete("/jobs/{id}", handleDeleteJob(jsvc, logger))
			r.Get("/jobs/{id}/executions", handleListExecutions(jsvc, logger))
			r.Get("/executions/{id}", handleGetExecution(jsvc, logger))
		})
	}

	return &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

type createJobRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Schedule    struct {
		Type       string `json:"type"`
		Expression string `json:"expression"`
		Timezone   string `json:"timezone"`
	} `json:"schedule"`
	Target struct {
		URL            string `json:"url"`
		TimeoutSeconds *int32 `json:"timeout_seconds"`
	} `json:"target"`
	Retry struct {
		MaxAttempts *int32 `json:"max_attempts"`
	} `json:"retry"`
	Concurrency struct {
		MaxExecutions *int32 `json:"max_executions"`
	} `json:"concurrency"`
}

func handleCreateJob(svc *job.Service, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r.Context())
		if tenantID == uuid.Nil {
			writeError(w, http.StatusBadRequest, "missing_tenant", "X-Tenant-ID is required")
			return
		}
		var req createJobRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_json", "invalid JSON body")
			return
		}
		if req.Name == "" {
			writeError(w, http.StatusBadRequest, "invalid_request", "name is required")
			return
		}
		if req.Schedule.Type == "" || req.Schedule.Expression == "" {
			writeError(w, http.StatusBadRequest, "invalid_schedule", "schedule.type and schedule.expression are required")
			return
		}
		if req.Target.URL == "" {
			writeError(w, http.StatusBadRequest, "invalid_target", "target.url is required")
			return
		}

		var sched job.Schedule
		var err error
		switch req.Schedule.Type {
		case job.ScheduleCron:
			sched, err = job.NewCronSchedule(req.Schedule.Expression, req.Schedule.Timezone)
		case job.ScheduleInterval:
			sched, err = job.NewIntervalSchedule(req.Schedule.Expression)
		case job.ScheduleOnce:
			sched, err = job.NewOnceSchedule(req.Schedule.Expression)
		default:
			writeError(w, http.StatusBadRequest, "invalid_schedule", "schedule.type must be cron, interval, or once")
			return
		}
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_schedule", err.Error())
			return
		}

		desc := ""
		if req.Description != nil {
			desc = *req.Description
		}
		var timeout int32
		if req.Target.TimeoutSeconds != nil {
			timeout = *req.Target.TimeoutSeconds
		}
		var retry int32
		if req.Retry.MaxAttempts != nil {
			retry = *req.Retry.MaxAttempts
		}
		var concurrency int32
		if req.Concurrency.MaxExecutions != nil {
			concurrency = *req.Concurrency.MaxExecutions
		}
		row, err := svc.Create(r.Context(), job.TenantID(tenantID), job.CreateInput{
			Name:                     req.Name,
			Description:              desc,
			Schedule:                 sched,
			TargetURL:                req.Target.URL,
			TargetTimeoutSeconds:     timeout,
			RetryMaxAttempts:         retry,
			ConcurrencyMaxExecutions: concurrency,
		})
		if err != nil {
			logger.Error("create job failed", "error", err, "tenant", tenantID.String())
			writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":        row.ID.String(),
			"tenant_id": row.TenantID.String(),
			"name":      row.Name,
			"schedule":  map[string]string{"type": row.ScheduleType, "expression": row.ScheduleExpr, "timezone": row.Timezone},
			"target":    map[string]any{"url": row.TargetUrl, "timeout_seconds": row.TargetTimeoutSeconds},
			"retry":     map[string]int32{"max_attempts": row.RetryMaxAttempts},
			"concurrency": map[string]int32{
				"max_executions": row.ConcurrencyMaxExecutions,
			},
			"next_run_at": func() any {
				if row.NextRunAt.Valid {
					return row.NextRunAt.Time.Format(time.RFC3339)
				}
				return nil
			}(),
			"enabled":    row.Enabled,
			"created_at": row.CreatedAt.Format(time.RFC3339),
		})
	}
}

func handleListJobs(svc *job.Service, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r.Context())
		jobs, err := svc.List(r.Context(), job.TenantID(tenantID))
		if err != nil {
			logger.Error("list jobs failed", "error", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "failed to list jobs")
			return
		}
		type outJob struct {
			ID          string  `json:"id"`
			Name        string  `json:"name"`
			Schedule    any     `json:"schedule"`
			Target      any     `json:"target"`
			Retry       any     `json:"retry"`
			Concurrency any     `json:"concurrency"`
			NextRunAt   *string `json:"next_run_at"`
			Enabled     bool    `json:"enabled"`
		}
		out := make([]outJob, 0, len(jobs))
		for _, j := range jobs {
			var nra *string
			if j.NextRunAt.Valid {
				s := j.NextRunAt.Time.Format(time.RFC3339)
				nra = &s
			}
			out = append(out, outJob{
				ID:   j.ID.String(),
				Name: j.Name,
				Schedule: map[string]string{
					"type": j.ScheduleType, "expression": j.ScheduleExpr, "timezone": j.Timezone,
				},
				Target:      map[string]any{"url": j.TargetUrl, "timeout_seconds": j.TargetTimeoutSeconds},
				Retry:       map[string]int32{"max_attempts": j.RetryMaxAttempts},
				Concurrency: map[string]int32{"max_executions": j.ConcurrencyMaxExecutions},
				NextRunAt:   nra,
				Enabled:     j.Enabled,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"jobs": out})
	}
}

func handleGetJob(svc *job.Service, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r.Context())
		idStr := chi.URLParam(r, "id")
		jobID, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_id", "job id must be UUID")
			return
		}
		j, err := svc.Get(r.Context(), job.TenantID(tenantID), jobID)
		if err != nil {
			writeError(w, http.StatusNotFound, "not_found", "job not found")
			return
		}
		var nra *string
		if j.NextRunAt.Valid {
			s := j.NextRunAt.Time.Format(time.RFC3339)
			nra = &s
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":          j.ID.String(),
			"tenant_id":   j.TenantID.String(),
			"name":        j.Name,
			"schedule":    map[string]string{"type": j.ScheduleType, "expression": j.ScheduleExpr, "timezone": j.Timezone},
			"target":      map[string]any{"url": j.TargetUrl, "timeout_seconds": j.TargetTimeoutSeconds},
			"retry":       map[string]int32{"max_attempts": j.RetryMaxAttempts},
			"concurrency": map[string]int32{"max_executions": j.ConcurrencyMaxExecutions},
			"next_run_at": nra,
			"enabled":     j.Enabled,
			"created_at":  j.CreatedAt.Format(time.RFC3339),
		})
		_ = logger // avoid unused if logger not needed
	}
}

type patchJobRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Enabled     *bool   `json:"enabled"`
	Schedule    *struct {
		Type       string `json:"type"`
		Expression string `json:"expression"`
		Timezone   string `json:"timezone"`
	} `json:"schedule"`
	Target *struct {
		URL            *string `json:"url"`
		TimeoutSeconds *int32  `json:"timeout_seconds"`
	} `json:"target"`
	Retry *struct {
		MaxAttempts *int32 `json:"max_attempts"`
	} `json:"retry"`
	Concurrency *struct {
		MaxExecutions *int32 `json:"max_executions"`
	} `json:"concurrency"`
}

func handlePatchJob(svc *job.Service, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r.Context())
		idStr := chi.URLParam(r, "id")
		jobID, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_id", "job id must be UUID")
			return
		}
		var req patchJobRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_json", "invalid JSON body")
			return
		}
		if req.Name == nil && req.Description == nil && req.Enabled == nil && req.Schedule == nil && req.Target == nil && req.Retry == nil && req.Concurrency == nil {
			writeError(w, http.StatusBadRequest, "invalid_request", "no fields to update")
			return
		}

		var sched *job.Schedule
		if req.Schedule != nil {
			if req.Schedule.Type == "" || req.Schedule.Expression == "" {
				writeError(w, http.StatusBadRequest, "invalid_schedule", "schedule.type and schedule.expression are required")
				return
			}
			var s job.Schedule
			switch req.Schedule.Type {
			case job.ScheduleCron:
				s, err = job.NewCronSchedule(req.Schedule.Expression, req.Schedule.Timezone)
			case job.ScheduleInterval:
				s, err = job.NewIntervalSchedule(req.Schedule.Expression)
			case job.ScheduleOnce:
				s, err = job.NewOnceSchedule(req.Schedule.Expression)
			default:
				writeError(w, http.StatusBadRequest, "invalid_schedule", "schedule.type must be cron, interval, or once")
				return
			}
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid_schedule", err.Error())
				return
			}
			sched = &s
		}

		var targetURL *string
		if req.Target != nil && req.Target.URL != nil {
			tu := *req.Target.URL
			if tu == "" {
				writeError(w, http.StatusBadRequest, "invalid_target", "target.url is required")
				return
			}
			targetURL = &tu
		}

		var targetTimeout *int32
		if req.Target != nil && req.Target.TimeoutSeconds != nil {
			targetTimeout = req.Target.TimeoutSeconds
		}
		var retry *int32
		if req.Retry != nil && req.Retry.MaxAttempts != nil {
			retry = req.Retry.MaxAttempts
		}
		var concurrency *int32
		if req.Concurrency != nil && req.Concurrency.MaxExecutions != nil {
			concurrency = req.Concurrency.MaxExecutions
		}

		row, err := svc.Update(r.Context(), job.TenantID(tenantID), jobID, job.UpdateInput{
			Name:                     req.Name,
			Description:              req.Description,
			Enabled:                  req.Enabled,
			Schedule:                 sched,
			TargetURL:                targetURL,
			TargetTimeoutSeconds:     targetTimeout,
			RetryMaxAttempts:         retry,
			ConcurrencyMaxExecutions: concurrency,
		})
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "not_found", "job not found")
				return
			}
			logger.Error("patch job failed", "error", err, "tenant", tenantID.String(), "job", jobID.String())
			writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}

		var nra *string
		if row.NextRunAt.Valid {
			s := row.NextRunAt.Time.Format(time.RFC3339)
			nra = &s
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":          row.ID.String(),
			"tenant_id":   row.TenantID.String(),
			"name":        row.Name,
			"schedule":    map[string]string{"type": row.ScheduleType, "expression": row.ScheduleExpr, "timezone": row.Timezone},
			"target":      map[string]any{"url": row.TargetUrl, "timeout_seconds": row.TargetTimeoutSeconds},
			"retry":       map[string]int32{"max_attempts": row.RetryMaxAttempts},
			"concurrency": map[string]int32{"max_executions": row.ConcurrencyMaxExecutions},
			"next_run_at": nra,
			"enabled":     row.Enabled,
			"updated_at":  row.UpdatedAt.Format(time.RFC3339),
		})
	}
}

func handleListExecutions(svc *job.Service, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r.Context())
		idStr := chi.URLParam(r, "id")
		jobID, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_id", "job id must be UUID")
			return
		}
		rows, err := svc.ListExecutions(r.Context(), job.TenantID(tenantID), jobID, 20)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "not_found", "job not found")
				return
			}
			logger.Error("list executions failed", "error", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "failed to list executions")
			return
		}
		type outExec struct {
			ID          string `json:"id"`
			Status      string `json:"status"`
			ScheduledAt string `json:"scheduled_at"`
			CreatedAt   string `json:"created_at"`
		}
		out := make([]outExec, 0, len(rows))
		for _, e := range rows {
			out = append(out, outExec{
				ID:          e.ID.String(),
				Status:      e.Status,
				ScheduledAt: e.ScheduledAt.Format(time.RFC3339),
				CreatedAt:   e.CreatedAt.Format(time.RFC3339),
			})
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"executions": out})
	}
}

func handleGetExecution(svc *job.Service, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r.Context())
		if tenantID == uuid.Nil {
			writeError(w, http.StatusBadRequest, "missing_tenant", "X-Tenant-ID is required")
			return
		}
		idStr := chi.URLParam(r, "id")
		execID, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_id", "execution id must be UUID")
			return
		}
		detail, err := svc.GetExecution(r.Context(), job.TenantID(tenantID), execID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "not_found", "execution not found")
				return
			}
			logger.Error("get execution failed", "error", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "failed to get execution")
			return
		}
		type outAttempt struct {
			ID                 string  `json:"id"`
			AttemptNumber      int32   `json:"attempt_number"`
			Status             string  `json:"status"`
			StartedAt          *string `json:"started_at"`
			FinishedAt         *string `json:"finished_at"`
			ResponseStatusCode *int32  `json:"response_status_code"`
			ResponseBody       *string `json:"response_body"`
			ErrorMessage       *string `json:"error_message"`
		}
		atts := make([]outAttempt, 0, len(detail.Attempts))
		for _, a := range detail.Attempts {
			var started, finished *string
			if a.StartedAt.Valid {
				s := a.StartedAt.Time.Format(time.RFC3339)
				started = &s
			}
			if a.FinishedAt.Valid {
				s := a.FinishedAt.Time.Format(time.RFC3339)
				finished = &s
			}
			var code *int32
			if a.ResponseStatusCode.Valid {
				c := a.ResponseStatusCode.Int32
				code = &c
			}
			var body *string
			if a.ResponseBody.Valid {
				b := a.ResponseBody.String
				body = &b
			}
			var em *string
			if a.ErrorMessage.Valid {
				e := a.ErrorMessage.String
				em = &e
			}
			atts = append(atts, outAttempt{
				ID:                 a.ID.String(),
				AttemptNumber:      a.AttemptNumber,
				Status:             a.Status,
				StartedAt:          started,
				FinishedAt:         finished,
				ResponseStatusCode: code,
				ResponseBody:       body,
				ErrorMessage:       em,
			})
		}
		var claimedAt, startedAt, finishedAt, leaseUntil *string
		if detail.Execution.ClaimedAt.Valid {
			s := detail.Execution.ClaimedAt.Time.Format(time.RFC3339)
			claimedAt = &s
		}
		if detail.Execution.StartedAt.Valid {
			s := detail.Execution.StartedAt.Time.Format(time.RFC3339)
			startedAt = &s
		}
		if detail.Execution.FinishedAt.Valid {
			s := detail.Execution.FinishedAt.Time.Format(time.RFC3339)
			finishedAt = &s
		}
		if detail.Execution.LeaseUntil.Valid {
			s := detail.Execution.LeaseUntil.Time.Format(time.RFC3339)
			leaseUntil = &s
		}
		var resultCode *int32
		if detail.Execution.ResultStatusCode.Valid {
			c := detail.Execution.ResultStatusCode.Int32
			resultCode = &c
		}
		var resultBody, resultError *string
		if detail.Execution.ResultBody.Valid {
			b := detail.Execution.ResultBody.String
			resultBody = &b
		}
		if detail.Execution.ResultError.Valid {
			e := detail.Execution.ResultError.String
			resultError = &e
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":                 detail.Execution.ID.String(),
			"job_id":             detail.Execution.JobID.String(),
			"job_name":           detail.Execution.JobName,
			"tenant_id":          detail.Execution.TenantID.String(),
			"status":             detail.Execution.Status,
			"scheduled_at":       detail.Execution.ScheduledAt.Format(time.RFC3339),
			"claimed_at":         claimedAt,
			"started_at":         startedAt,
			"finished_at":        finishedAt,
			"lease_until":        leaseUntil,
			"attempt_count":      detail.Execution.AttemptCount,
			"result_status_code": resultCode,
			"result_body":        resultBody,
			"result_error":       resultError,
			"target":             map[string]string{"url": detail.Execution.TargetUrl},
			"created_at":         detail.Execution.CreatedAt.Format(time.RFC3339),
			"attempts":           atts,
		})
	}
}

func handleDeleteJob(svc *job.Service, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r.Context())
		if tenantID == uuid.Nil {
			writeError(w, http.StatusBadRequest, "missing_tenant", "X-Tenant-ID is required")
			return
		}
		idStr := chi.URLParam(r, "id")
		jobID, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_id", "job id must be UUID")
			return
		}
		row, err := svc.DeleteJob(r.Context(), job.TenantID(tenantID), jobID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "not_found", "job not found")
				return
			}
			logger.Error("delete job failed", "error", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "failed to delete job")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":        row.ID.String(),
			"tenant_id": row.TenantID.String(),
			"name":      row.Name,
			"enabled":   row.Enabled,
			"next_run_at": func() any {
				if row.NextRunAt.Valid {
					return row.NextRunAt.Time.Format(time.RFC3339)
				}
				return nil
			}(),
			"deleted": true,
		})
	}
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]string{"code": code, "message": msg},
	})
}
