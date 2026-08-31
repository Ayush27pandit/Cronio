package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// doHTTP executes an HTTP request for a worker execution.
// It validates the URL, applies timeoutSec or context, and returns status and body.
func doHTTP(ctx context.Context, method, rawURL string, headers json.RawMessage, timeoutSec int32) (int, string, error) {
	if err := validateTargetURL(rawURL); err != nil {
		return 0, "", err
	}
	if method == "" {
		method = "POST"
	}
	// timeout from job column, default 30 if not set
	timeout := time.Duration(timeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	// If ctx already has deadline, respect the shorter one. Otherwise add timeout.
	if _, ok := ctx.Deadline(); !ok {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	req, err := http.NewRequestWithContext(ctx, method, rawURL, nil)
	if err != nil {
		return 0, "", fmt.Errorf("create request: %w", err)
	}
	// Apply stored headers if present.
	if len(headers) > 0 && string(headers) != "{}" && string(headers) != "null" {
		var m map[string]string
		if err := json.Unmarshal(headers, &m); err == nil {
			for k, v := range m {
				req.Header.Set(k, v)
			}
		}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Cronio-worker/1.0")

	client := &http.Client{
		Timeout: timeout,
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	// Limit body to 1MB to avoid memory blow up.
	limited := io.LimitReader(resp.Body, 1<<20)
	body, _ := io.ReadAll(limited)
	return resp.StatusCode, string(body), nil
}

// validateTargetURL checks http/https and blocks SSRF metadata IP in MVP.
// Duplicated from job store to keep worker independent.
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
	host := strings.ToLower(u.Hostname())
	if host == "169.254.169.254" || host == "metadata.google.internal" {
		return fmt.Errorf("target_url host %q is blocked", host)
	}
	return nil
}
