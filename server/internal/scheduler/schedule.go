package scheduler

import (
	"fmt"
	"time"

	"github.com/robfig/cron/v3"
)

type Schedule struct {
	Type       string
	Expression string
	Timezone   string
}

func NextRun(schedule Schedule, from time.Time) (next time.Time, enabled bool, err error) {
	switch schedule.Type {
	case "cron":
		return nextCronRun(schedule, from)

	case "interval":
		return nextIntervalRun(schedule, from)

	case "once":
		return nextOnceRun(schedule, from)

	default:
		return time.Time{}, false, fmt.Errorf(
			"unsupported schedule type: %q",
			schedule.Type,
		)
	}
}

func nextCronRun(schedule Schedule, from time.Time) (time.Time, bool, error) {
	location, err := time.LoadLocation(schedule.Timezone)
	if err != nil {
		return time.Time{}, false, fmt.Errorf(
			"invalid timezone %q: %w",
			schedule.Timezone,
			err,
		)
	}

	parser := cron.NewParser(
		cron.Minute |
			cron.Hour |
			cron.Dom |
			cron.Month |
			cron.Dow,
	)

	expr, err := parser.Parse(schedule.Expression)
	if err != nil {
		return time.Time{}, false, fmt.Errorf(
			"invalid cron expression %q: %w",
			schedule.Expression,
			err,
		)
	}

	next := expr.Next(from.In(location))

	return next.UTC(), true, nil
}

func nextIntervalRun(schedule Schedule, from time.Time) (time.Time, bool, error) {
	duration, err := time.ParseDuration(schedule.Expression)
	if err != nil {
		return time.Time{}, false, fmt.Errorf(
			"invalid interval %q: %w",
			schedule.Expression,
			err,
		)
	}

	if duration <= 0 {
		return time.Time{}, false, fmt.Errorf(
			"interval must be greater than zero",
		)
	}

	return from.Add(duration).UTC(), true, nil
}

func nextOnceRun(schedule Schedule, from time.Time) (time.Time, bool, error) {
	next, err := time.Parse(time.RFC3339, schedule.Expression)
	if err != nil {
		return time.Time{}, false, fmt.Errorf(
			"invalid once timestamp %q: %w",
			schedule.Expression,
			err,
		)
	}

	// The one-time job is only valid if its scheduled time
	// has not already passed.
	if !next.After(from) {
		return time.Time{}, false, nil
	}

	return next.UTC(), true, nil
}
