package monitor

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"pingpulse/internal/domain"
)

func TestHTTPProberSuccessAndStatusMismatch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		_, _ = w.Write([]byte("ok"))
	}))
	t.Cleanup(srv.Close)
	p := NewHTTPProber()
	rtt, err := p.Probe(context.Background(), domain.Target{
		HTTPURL: srv.URL, HTTPMethod: "GET", ExpectStatus: 200,
	}, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if rtt <= 0 {
		t.Fatal("expected positive rtt")
	}
	_, err = p.Probe(context.Background(), domain.Target{
		HTTPURL: srv.URL, HTTPMethod: "GET", ExpectStatus: 204,
	}, 2*time.Second)
	if err == nil {
		t.Fatal("expected status mismatch")
	}
}

func TestTCPProberConnect(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = ln.Close() })
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			_ = c.Close()
		}
	}()
	_, portStr, _ := net.SplitHostPort(ln.Addr().String())
	var port int
	for _, r := range portStr {
		port = port*10 + int(r-'0')
	}
	p := NewTCPProber()
	rtt, err := p.Probe(context.Background(), domain.Target{Host: "127.0.0.1", TCPPort: port}, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if rtt < 0 {
		t.Fatal("negative rtt")
	}
}

func TestProbeTypeRouting(t *testing.T) {
	if domain.NormalizeProbeType("") != domain.ProbeICMP {
		t.Fatal("default icmp")
	}
	if domain.ProbeHTTP.Label() != "HTTP" {
		t.Fatal(domain.ProbeHTTP.Label())
	}
}
