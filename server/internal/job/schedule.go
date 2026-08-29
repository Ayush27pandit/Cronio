// Package job owns the Job seam: typed Schedule, TenantID, and the
// transaction that turns a due Job into an Execution.
//
// A Schedule is a value, not a string. Callers build it with
// NewCronSchedule, NewIntervalSchedule, or NewOnceSchedule so
// validation happens once at creation, not on every tick.
package job

import (
	"fmt"
	"time"

	"github.com/robfig/cron/v3"
)

const (
	// ScheduleCron is a 5-field cron plus timezone, for example "0 9 * * *" in "Asia/Kolkata".
	ScheduleCron = "cron"
	// ScheduleInterval is a Go duration like "15m" or "1h".
	ScheduleInterval = "interval"
	// ScheduleOnce is a single RFC3339 timestamp like "2026-09-01T09:00:00Z".
	ScheduleOnce = "once"
)

// Schedule is a typed value behind the Job module seam.
// Build it with NewCronSchedule, NewIntervalSchedule, or NewOnceSchedule.
// Those constructors validate. NextRun is pure and needs no DB.
//
// CONTEXT.md: Schedule — when a Job fires. One of Cron, Interval, Once.
type Schedule struct {
	kind string

	cronExpr string
	location *time.Location
	timezone string

	interval     time.Duration
	intervalExpr string

	onceAt   time.Time
	onceExpr string
}

// NewCronSchedule builds a cron Schedule.
// expr must be 5-field cron like "0 9 * * *". timezone is IANA like "Asia/Kolkata".
// Empty timezone defaults to "UTC". Returns an error if the expression or
// timezone is invalid, so callers fail fast at job creation.
//
// Example:
//
//	s, err := job.NewCronSchedule("0 9 * * *", "Asia/Kolkata")
func NewCronSchedule(expr, timezone string) (Schedule, error) {
	if expr == "" {
		return Schedule{}, fmt.Errorf("cron expression is required")
	}
	if timezone == "" {
		timezone = "UTC"
	}
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return Schedule{}, fmt.Errorf("invalid timezone %q: %w", timezone, err)
	}
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	if _, err := parser.Parse(expr); err != nil {
		return Schedule{}, fmt.Errorf("invalid cron expression %q: %w", expr, err)
	}
	return Schedule{
		kind:     ScheduleCron,
		cronExpr: expr,
		location: loc,
		timezone: timezone,
	}, nil
}

// NewIntervalSchedule builds an interval Schedule.
// expr is a Go duration like "15m", "1h", "30s". It must be greater than zero.
// Returns an error otherwise.
//
// Example:
//
//	s, err := job.NewIntervalSchedule("15m")
func NewIntervalSchedule(expr string) (Schedule, error) {
	if expr == "" {
		return Schedule{}, fmt.Errorf("interval expression is required")
	}
	d, err := time.ParseDuration(expr)
	if err != nil {
		return Schedule{}, fmt.Errorf("invalid interval %q: %w", expr, err)
	}
	if d <= 0 {
		return Schedule{}, fmt.Errorf("interval must be greater than zero")
	}
	return Schedule{
		kind:         ScheduleInterval,
		interval:     d,
		intervalExpr: expr,
	}, nil
}

// NewOnceSchedule builds a once Schedule.
// expr must be RFC3339 like "2026-09-01T09:00:00Z". Validation happens here.
// If the timestamp is already past, NextRun will later return enabled=false.
// Returns an error if expr is not RFC3339.
//
// Example:
//
//	s, err := job.NewOnceSchedule("2026-09-01T09:00:00Z")
func NewOnceSchedule(expr string) (Schedule, error) {
	if expr == "" {
		return Schedule{}, fmt.Errorf("once timestamp is required")
	}
	t, err := time.Parse(time.RFC3339, expr)
	if err != nil {
		return Schedule{}, fmt.Errorf("invalid once timestamp %q: %w", expr, err)
	}
	return Schedule{
		kind:     ScheduleOnce,
		onceAt:   t,
		onceExpr: expr,
	}, nil
}

// NextRun returns the next firing time after from.
// enabled is false only for Once that is already past. For Cron and Interval
// it is always true. The returned time is in UTC. It is pure and needs no DB.
//
// Example:
//
//	next, enabled, err := sched.NextRun(time.Now().UTC())
//	if !enabled { // once job is done, disable it
//	}
func (s Schedule) NextRun(from time.Time) (time.Time, bool, error) {
	switch s.kind {
	case ScheduleCron:
		return s.nextCron(from)
	case ScheduleInterval:
		return s.nextInterval(from)
	case ScheduleOnce:
		return s.nextOnce(from)
	default:
		return time.Time{}, false, fmt.Errorf("unsupported schedule type %q", s.kind)
	}
}

func (s Schedule) nextCron(from time.Time) (time.Time, bool, error) {
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	expr, err := parser.Parse(s.cronExpr)
	if err != nil {
		return time.Time{}, false, fmt.Errorf("invalid cron expression %q: %w", s.cronExpr, err)
	}
	next := expr.Next(from.In(s.location))
	return next.UTC(), true, nil
}

func (s Schedule) nextInterval(from time.Time) (time.Time, bool, error) {
	return from.Add(s.interval).UTC(), true, nil
}

func (s Schedule) nextOnce(from time.Time) (time.Time, bool, error) {
	if !s.onceAt.After(from) {
		return time.Time{}, false, nil
	}
	return s.onceAt.UTC(), true, nil
}

// Kind returns the schedule kind: "cron", "interval", or "once".
func (s Schedule) Kind() string { return s.kind }

// Expr returns the original expression for storage in Postgres.
// For cron it is the 5-field string, for interval the duration string,
// for once the RFC3339 timestamp.
func (s Schedule) Expr() string {
	switch s.kind {
	case ScheduleCron:
		return s.cronExpr
	case ScheduleInterval:
		return s.intervalExpr
	case ScheduleOnce:
		return s.onceExpr
	default:
		return ""
	}
}

// Timezone returns the IANA timezone for storage.
// Cron keeps its timezone like "Asia/Kolkata". Interval and Once always return "UTC".
func (s Schedule) Timezone() string {
	if s.kind == ScheduleCron {
		return s.timezone
	}
	return "UTC"
}

// Location returns the parsed *time.Location for cron, or UTC otherwise.
// Callers rarely need it, but it is here for testing and for NextRun.
func (s Schedule) Location() *time.Location {
	if s.kind == ScheduleCron && s.location != nil {
		return s.location
	}
	return time.UTC
}
