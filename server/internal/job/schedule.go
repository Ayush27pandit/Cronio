package job

import (
	"fmt"
	"time"

	"github.com/robfig/cron/v3"
)

const (
	ScheduleCron     = "cron"
	ScheduleInterval = "interval"
	ScheduleOnce     = "once"
)

// Schedule is a typed value behind the Job module seam.
// Construction validates. NextRun is pure and needs no I/O.
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

// NewCronSchedule validates expr (5-field) and timezone.
// timezone "" defaults to UTC.
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

// NewIntervalSchedule validates Go duration string (e.g. "15m", "1h").
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

// NewOnceSchedule validates RFC3339 timestamp.
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

// NextRun returns next firing after `from`. Enabled false means Once has passed.
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

// Kind returns "cron" | "interval" | "once".
func (s Schedule) Kind() string { return s.kind }

// Expr returns the original expression for storage.
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

// Timezone returns the IANA timezone for cron, or UTC for others.
func (s Schedule) Timezone() string {
	if s.kind == ScheduleCron {
		return s.timezone
	}
	return "UTC"
}

// Location returns the parsed location for cron, or UTC otherwise.
func (s Schedule) Location() *time.Location {
	if s.kind == ScheduleCron && s.location != nil {
		return s.location
	}
	return time.UTC
}
