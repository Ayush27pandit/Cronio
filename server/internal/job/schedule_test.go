package job

import (
	"testing"
	"time"
)

func TestNewCronSchedule(t *testing.T) {
	_, err := NewCronSchedule("0 9 * * *", "America/New_York")
	if err != nil {
		t.Fatalf("valid cron: %v", err)
	}
	if _, err := NewCronSchedule("", "UTC"); err == nil {
		t.Fatal("empty expr should fail")
	}
	if _, err := NewCronSchedule("not-cron", "UTC"); err == nil {
		t.Fatal("invalid expr should fail")
	}
	if _, err := NewCronSchedule("0 9 * * *", "Invalid/Zone"); err == nil {
		t.Fatal("invalid timezone should fail")
	}
	s, err := NewCronSchedule("0 9 * * *", "")
	if err != nil {
		t.Fatalf("empty timezone defaults to UTC: %v", err)
	}
	if s.Timezone() != "UTC" {
		t.Fatalf("expected UTC got %q", s.Timezone())
	}
}

func TestCronNextRun(t *testing.T) {
	s, _ := NewCronSchedule("0 9 * * *", "America/New_York")
	// from: 2026-08-29 10:00 UTC = 06:00 EDT
	from := time.Date(2026, 8, 29, 10, 0, 0, 0, time.UTC)
	next, enabled, err := s.NextRun(from)
	if err != nil || !enabled {
		t.Fatalf("NextRun err=%v enabled=%v", err, enabled)
	}
	// Next 9am EDT is same day if from is 06:00 EDT, so 09:00 EDT = 13:00 UTC
	expected := time.Date(2026, 8, 29, 13, 0, 0, 0, time.UTC)
	if !next.Equal(expected) {
		t.Fatalf("expected %v got %v", expected, next)
	}
	if next.Location() != time.UTC {
		t.Fatal("NextRun must return UTC")
	}
}

func TestCronNextRun_AfterTime(t *testing.T) {
	s, _ := NewCronSchedule("0 9 * * *", "UTC")
	from := time.Date(2026, 8, 29, 10, 0, 0, 0, time.UTC)
	next, _, _ := s.NextRun(from)
	expected := time.Date(2026, 8, 30, 9, 0, 0, 0, time.UTC)
	if !next.Equal(expected) {
		t.Fatalf("expected %v got %v", expected, next)
	}
}

func TestNewIntervalSchedule(t *testing.T) {
	s, err := NewIntervalSchedule("15m")
	if err != nil {
		t.Fatalf("valid interval: %v", err)
	}
	if s.Expr() != "15m" {
		t.Fatalf("expr mismatch")
	}
	if _, err := NewIntervalSchedule(""); err == nil {
		t.Fatal("empty should fail")
	}
	if _, err := NewIntervalSchedule("not-duration"); err == nil {
		t.Fatal("invalid should fail")
	}
	if _, err := NewIntervalSchedule("0s"); err == nil {
		t.Fatal("zero should fail")
	}
	if _, err := NewIntervalSchedule("-5m"); err == nil {
		t.Fatal("negative should fail")
	}
}

func TestIntervalNextRun(t *testing.T) {
	s, _ := NewIntervalSchedule("1h")
	from := time.Date(2026, 8, 29, 10, 0, 0, 0, time.UTC)
	next, enabled, err := s.NextRun(from)
	if err != nil || !enabled {
		t.Fatalf("err=%v enabled=%v", err, enabled)
	}
	expected := from.Add(time.Hour)
	if !next.Equal(expected) {
		t.Fatalf("expected %v got %v", expected, next)
	}
}

func TestNewOnceSchedule(t *testing.T) {
	_, err := NewOnceSchedule("2026-09-01T09:00:00Z")
	if err != nil {
		t.Fatalf("valid once: %v", err)
	}
	if _, err := NewOnceSchedule(""); err == nil {
		t.Fatal("empty should fail")
	}
	if _, err := NewOnceSchedule("not-rfc3339"); err == nil {
		t.Fatal("invalid should fail")
	}
}

func TestOnceNextRun(t *testing.T) {
	s, _ := NewOnceSchedule("2026-09-01T09:00:00Z")
	// before -> enabled
	fromBefore := time.Date(2026, 8, 29, 10, 0, 0, 0, time.UTC)
	next, enabled, _ := s.NextRun(fromBefore)
	if !enabled {
		t.Fatal("future once should be enabled")
	}
	if next.UTC().Format(time.RFC3339) != "2026-09-01T09:00:00Z" {
		t.Fatalf("once next mismatch %v", next)
	}
	// after -> disabled
	fromAfter := time.Date(2026, 9, 2, 10, 0, 0, 0, time.UTC)
	_, enabled, _ = s.NextRun(fromAfter)
	if enabled {
		t.Fatal("past once should be disabled")
	}
	// exactly at time -> disabled (must be After, not equal)
	fromExact := time.Date(2026, 9, 1, 9, 0, 0, 0, time.UTC)
	_, enabled, _ = s.NextRun(fromExact)
	if enabled {
		t.Fatal("exact once should be disabled")
	}
}

func TestScheduleAccessors(t *testing.T) {
	cronS, _ := NewCronSchedule("*/5 * * * *", "Asia/Kolkata")
	if cronS.Kind() != ScheduleCron {
		t.Fatal("kind")
	}
	if cronS.Expr() != "*/5 * * * *" {
		t.Fatal("expr")
	}
	if cronS.Timezone() != "Asia/Kolkata" {
		t.Fatal("timezone")
	}
	intervalS, _ := NewIntervalSchedule("30s")
	if intervalS.Kind() != ScheduleInterval || intervalS.Timezone() != "UTC" {
		t.Fatal("interval accessors")
	}
	onceS, _ := NewOnceSchedule("2026-12-01T00:00:00Z")
	if onceS.Kind() != ScheduleOnce || onceS.Expr() != "2026-12-01T00:00:00Z" {
		t.Fatal("once accessors")
	}
}
