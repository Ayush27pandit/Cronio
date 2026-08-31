package worker

import (
	"testing"
	"time"
)

func TestNextDelay(t *testing.T) {
	tests := []struct {
		attempt  int32
		initial  int32
		max      int32
		expected time.Duration
	}{
		{1, 60, 3600, 60 * time.Second},
		{2, 60, 3600, 120 * time.Second},
		{3, 60, 3600, 240 * time.Second},
		{4, 60, 3600, 480 * time.Second},
		{10, 60, 3600, 3600 * time.Second},
		{1, 0, 3600, 0},
		{1, 60, 60, 60 * time.Second},
		{5, 60, 100, 100 * time.Second},
	}
	for _, tc := range tests {
		got := NextDelay(tc.attempt, tc.initial, tc.max)
		if got != tc.expected {
			t.Fatalf("NextDelay(%d,%d,%d)=%v want %v", tc.attempt, tc.initial, tc.max, got, tc.expected)
		}
	}
}

func TestNextDelay_ZeroMax(t *testing.T) {
	got := NextDelay(1, 60, 0)
	if got != 0 {
		t.Fatalf("zero max should cap to 0 got %v", got)
	}
}
