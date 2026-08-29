package server

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestHealth(t *testing.T) {
	srv := New("8080", slog.Default(), nil)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	srv.Handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("health status %d", rec.Code)
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" {
		t.Fatalf("health body %v", body)
	}
}

func TestCreateJob_MissingTenant(t *testing.T) {
	srv := New("8080", slog.Default(), &sql.DB{})
	body := bytes.NewBufferString(`{"name":"test","schedule":{"type":"cron","expression":"0 9 * * *"},"target":{"url":"https://example.com"}}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/jobs", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.Handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d body %s", rec.Code, rec.Body.String())
	}
	var resp map[string]map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp["error"]["code"] != "missing_tenant" {
		t.Fatalf("code %v", resp)
	}
}

func TestCreateJob_InvalidSchedule(t *testing.T) {
	srv := New("8080", slog.Default(), &sql.DB{})
	tenant := uuid.NewString()
	body := bytes.NewBufferString(`{"name":"test","schedule":{"type":"cron","expression":"not-cron"},"target":{"url":"https://example.com"}}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/jobs", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", tenant)
	rec := httptest.NewRecorder()
	srv.Handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d %s", rec.Code, rec.Body.String())
	}
	var resp map[string]map[string]string
	_ = json.NewDecoder(rec.Body).Decode(&resp)
	if resp["error"]["code"] != "invalid_schedule" {
		t.Fatalf("expected invalid_schedule got %v", resp)
	}
}

func TestCreateJob_InvalidTarget(t *testing.T) {
	srv := New("8080", slog.Default(), &sql.DB{})
	tenant := uuid.NewString()
	body := bytes.NewBufferString(`{"name":"test","schedule":{"type":"interval","expression":"15m"},"target":{"url":"ftp://example.com"}}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/jobs", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", tenant)
	rec := httptest.NewRecorder()
	srv.Handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d %s", rec.Code, rec.Body.String())
	}
}

func TestPatchJob_NoFields(t *testing.T) {
	srv := New("8080", slog.Default(), &sql.DB{})
	tenant := uuid.NewString()
	jobID := uuid.NewString()
	body := bytes.NewBufferString(`{}`)
	req := httptest.NewRequest(http.MethodPatch, "/v1/jobs/"+jobID, body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", tenant)
	rec := httptest.NewRecorder()
	srv.Handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d %s", rec.Code, rec.Body.String())
	}
}
