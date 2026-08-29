package server

import (
	"database/sql"
	"encoding/json"
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

	if db != nil {
		jsvc := job.New(db)

		r.Route("/v1", func(r chi.Router) {
			r.Use(middleware.Tenant)

			r.Post("/jobs", handleCreateJob(jsvc, logger))
			r.Get("/jobs", handleListJobs(jsvc, logger))
			r.Get("/jobs/{id}", handleGetJob(jsvc, logger))
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
		URL string `json:"url"`
	} `json:"target"`
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
		row, err := svc.Create(r.Context(), job.TenantID(tenantID), job.CreateInput{
			Name:        req.Name,
			Description: desc,
			Schedule:    sched,
			TargetURL:   req.Target.URL,
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
			"target":    map[string]string{"url": row.TargetUrl},
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
			ID        string  `json:"id"`
			Name      string  `json:"name"`
			Schedule  any     `json:"schedule"`
			Target    any     `json:"target"`
			NextRunAt *string `json:"next_run_at"`
			Enabled   bool    `json:"enabled"`
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
				Target:    map[string]string{"url": j.TargetUrl},
				NextRunAt: nra,
				Enabled:   j.Enabled,
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
			"target":      map[string]string{"url": j.TargetUrl},
			"next_run_at": nra,
			"enabled":     j.Enabled,
			"created_at":  j.CreatedAt.Format(time.RFC3339),
		})
		_ = logger // avoid unused if logger not needed
	}
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]string{"code": code, "message": msg},
	})
}
