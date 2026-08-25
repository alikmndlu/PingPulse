package monitor

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"pingpulse/internal/domain"
)

type HTTPProber struct {
	client *http.Client
}

func NewHTTPProber() *HTTPProber {
	return &HTTPProber{
		client: &http.Client{
			Timeout: 30 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 5 {
					return fmt.Errorf("too many redirects")
				}
				return nil
			},
		},
	}
}

func (p *HTTPProber) Probe(ctx context.Context, target domain.Target, timeout time.Duration) (time.Duration, error) {
	url := strings.TrimSpace(target.HTTPURL)
	if url == "" {
		return 0, &domain.PingError{Host: target.Host, Cause: "HTTP URL is not configured"}
	}
	method := domain.NormalizeHTTPMethod(target.HTTPMethod)
	expect := target.ExpectStatus
	if expect < 100 || expect > 599 {
		expect = 200
	}
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, method, url, nil)
	if err != nil {
		return 0, &domain.PingError{Host: url, Cause: "invalid HTTP request"}
	}
	req.Header.Set("User-Agent", "PingPulse/1.0")
	req.Header.Set("Accept", "*/*")
	start := time.Now()
	resp, err := p.client.Do(req)
	rtt := time.Since(start)
	if err != nil {
		if reqCtx.Err() != nil {
			return 0, &domain.PingError{Host: url, Timeout: timeout.String()}
		}
		return 0, &domain.PingError{Host: url, Cause: sanitizeCause(err)}
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != expect {
		return rtt, &domain.PingError{
			Host:  url,
			Cause: fmt.Sprintf("unexpected status %d (expected %d)", resp.StatusCode, expect),
		}
	}
	return rtt, nil
}

type TCPProber struct{}

func NewTCPProber() *TCPProber {
	return &TCPProber{}
}

func (p *TCPProber) Probe(ctx context.Context, target domain.Target, timeout time.Duration) (time.Duration, error) {
	host := domain.NormalizeHost(target.Host)
	port := target.TCPPort
	if port < 1 || port > 65535 {
		return 0, &domain.PingError{Host: host, Cause: "TCP port is not configured"}
	}
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	addr := net.JoinHostPort(host, fmt.Sprintf("%d", port))
	dialer := net.Dialer{Timeout: timeout}
	start := time.Now()
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	rtt := time.Since(start)
	if err != nil {
		if ctx.Err() != nil || strings.Contains(strings.ToLower(err.Error()), "timeout") || strings.Contains(strings.ToLower(err.Error()), "i/o timeout") {
			return 0, &domain.PingError{Host: addr, Timeout: timeout.String()}
		}
		return 0, &domain.PingError{Host: addr, Cause: sanitizeCause(err)}
	}
	_ = conn.Close()
	return rtt, nil
}
