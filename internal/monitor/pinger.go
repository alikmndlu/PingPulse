package monitor

import (
	"context"
	"fmt"
	"runtime"
	"time"

	"pingpulse/internal/domain"

	probing "github.com/prometheus-community/pro-bing"
)

type Pinger interface {
	Ping(ctx context.Context, host string, timeout time.Duration) (time.Duration, error)
}

type ICMPPinger struct{}

func NewICMPPinger() *ICMPPinger {
	return &ICMPPinger{}
}

func (p *ICMPPinger) Ping(ctx context.Context, host string, timeout time.Duration) (time.Duration, error) {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	pinger, err := probing.NewPinger(host)
	if err != nil {
		return 0, &domain.PingError{Host: host, Cause: sanitizeCause(err)}
	}
	pinger.Count = 1
	pinger.Timeout = timeout
	pinger.Interval = time.Millisecond
	pinger.SetPrivileged(privileged())

	var rtt time.Duration
	var received bool
	pinger.OnRecv = func(pkt *probing.Packet) {
		if pkt == nil {
			return
		}
		received = true
		rtt = pkt.Rtt
	}

	err = pinger.RunWithContext(ctx)
	if err != nil {
		if ctx.Err() != nil {
			return 0, ctx.Err()
		}
		return 0, &domain.PingError{Host: host, Cause: sanitizeCause(err)}
	}
	if !received {
		return 0, &domain.PingError{Host: host, Timeout: timeout.String()}
	}
	return rtt, nil
}

func privileged() bool {
	switch runtime.GOOS {
	case "windows":
		return true
	default:
		return false
	}
}

func sanitizeCause(err error) string {
	if err == nil {
		return "unknown error"
	}
	msg := err.Error()
	if len(msg) > 180 {
		msg = msg[:180]
	}
	return msg
}

func FormatTimeout(d time.Duration) string {
	if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	if d%time.Second == 0 {
		return fmt.Sprintf("%d seconds", int(d.Seconds()))
	}
	return d.String()
}
