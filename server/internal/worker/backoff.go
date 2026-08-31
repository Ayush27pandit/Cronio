package worker

import "time"

// NextDelay returns exponential backoff for attempt.
// attempt is 1-indexed, so attempt 1 returns initial.
// It caps at max. If initial <=0 or max <=0 it returns 0.
func NextDelay(attempt int32, initialSec int32, maxSec int32) time.Duration {
	if initialSec <= 0 || maxSec <= 0 {
		return 0
	}
	if attempt <= 1 {
		d := time.Duration(initialSec) * time.Second
		if d > time.Duration(maxSec)*time.Second {
			return time.Duration(maxSec) * time.Second
		}
		return d
	}
	d := time.Duration(initialSec) * time.Second
	max := time.Duration(maxSec) * time.Second
	for i := int32(1); i < attempt; i++ {
		d *= 2
		if d >= max {
			return max
		}
	}
	return d
}
