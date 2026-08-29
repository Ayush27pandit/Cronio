package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
)

const tenantIDKey contextKey = "tenant_id"

// Tenant extracts X-Tenant-ID header, validates UUID, and puts it in context.
// Use only on /v1 routes; health stays open.
func Tenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := r.Header.Get("X-Tenant-ID")
		if raw == "" {
			raw = r.Header.Get("X-Tenant-Id")
		}
		if raw == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"error": map[string]string{
					"code":    "missing_tenant",
					"message": "X-Tenant-ID header is required",
				},
			})
			return
		}
		id, err := uuid.Parse(raw)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"error": map[string]string{
					"code":    "invalid_tenant",
					"message": "X-Tenant-ID must be a valid UUID",
				},
			})
			return
		}
		ctx := context.WithValue(r.Context(), tenantIDKey, id)
		// Also echo back for debugging.
		w.Header().Set("X-Tenant-ID", id.String())
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetTenantID returns tenant UUID from context, or Nil if missing.
func GetTenantID(ctx context.Context) uuid.UUID {
	id, ok := ctx.Value(tenantIDKey).(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return id
}
