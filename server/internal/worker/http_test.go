package worker

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestDoHTTP_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("method %s", r.Method)
		}
		w.WriteHeader(200)
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	code, body, err := doHTTP(context.Background(), "POST", srv.URL, nil, 5)
	if err != nil {
		t.Fatalf("doHTTP err %v", err)
	}
	if code != 200 {
		t.Fatalf("code %d", code)
	}
	if body != "ok" {
		t.Fatalf("body %q", body)
	}
}

func TestDoHTTP_ServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
		_, _ = w.Write([]byte("fail"))
	}))
	defer srv.Close()

	code, body, err := doHTTP(context.Background(), "POST", srv.URL, nil, 5)
	if err != nil {
		t.Fatalf("unexpected err %v", err)
	}
	if code != 500 || body != "fail" {
		t.Fatalf("code %d body %q", code, body)
	}
}

func TestDoHTTP_Timeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(200)
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	_, _, err := doHTTP(ctx, "POST", srv.URL, nil, 5)
	if err == nil {
		t.Fatal("expected timeout error")
	}
}

func TestDoHTTP_SSRFBlocked(t *testing.T) {
	_, _, err := doHTTP(context.Background(), "POST", "http://169.254.169.254/latest/meta-data/", nil, 5)
	if err == nil {
		t.Fatal("expected SSRF block")
	}
}

func TestDoHTTP_Headers(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Custom") != "value" {
			t.Errorf("missing header")
		}
		w.WriteHeader(200)
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	h := json.RawMessage(`{"X-Custom":"value"}`)
	code, _, err := doHTTP(context.Background(), "POST", srv.URL, h, 5)
	if err != nil || code != 200 {
		t.Fatalf("err %v code %d", err, code)
	}
}

func TestDoHTTP_InvalidURL(t *testing.T) {
	_, _, err := doHTTP(context.Background(), "POST", "://bad", nil, 5)
	if err == nil {
		t.Fatal("expected invalid url error")
	}
}

func TestDoHTTP_DefaultMethod(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST got %s", r.Method)
		}
		w.WriteHeader(200)
	}))
	defer srv.Close()

	code, _, err := doHTTP(context.Background(), "", srv.URL, nil, 5)
	if err != nil || code != 200 {
		t.Fatalf("err %v code %d", err, code)
	}
}
