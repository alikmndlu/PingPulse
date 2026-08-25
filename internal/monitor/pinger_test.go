package monitor

import (
	"context"
	"errors"
	"testing"
	"time"
)

type stubPinger struct {
	rtt   time.Duration
	err   error
	calls int
}

func (s *stubPinger) Ping(ctx context.Context, host string, timeout time.Duration) (time.Duration, error) {
	s.calls++
	if s.err != nil {
		return 0, s.err
	}
	return s.rtt, nil
}

func TestICMPPingerInterfaceSuccess(t *testing.T) {
	p := &stubPinger{rtt: 24 * time.Millisecond}
	d, err := p.Ping(context.Background(), "10.10.10.20", time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if d != 24*time.Millisecond {
		t.Fatalf("latency=%v", d)
	}
}

func TestPingErrorTimeoutMessage(t *testing.T) {
	err := errors.New("timeout")
	if !isTimeout(err) {
		t.Fatal("expected timeout detection")
	}
}

func TestPublicErrorHidesSecrets(t *testing.T) {
	msg := publicError(errors.New("failed with api_key=abcd"))
	if msg != "The request failed. Check notification settings." {
		t.Fatalf("secret leaked: %s", msg)
	}
}
