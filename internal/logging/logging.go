package logging

import (
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

var secretRE = regexp.MustCompile(`(?i)(api[_-]?key|token|authorization|bearer|secret|password)\s*[:=]\s*\S+`)

type RedactingHandler struct {
	inner slog.Handler
}

func (h RedactingHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.inner.Enabled(ctx, level)
}

func (h RedactingHandler) Handle(ctx context.Context, r slog.Record) error {
	r.Message = redact(r.Message)
	attrs := make([]slog.Attr, 0, r.NumAttrs())
	r.Attrs(func(a slog.Attr) bool {
		a.Value = slog.StringValue(redact(a.Value.String()))
		attrs = append(attrs, a)
		return true
	})
	nr := slog.NewRecord(r.Time, r.Level, r.Message, r.PC)
	nr.AddAttrs(attrs...)
	return h.inner.Handle(ctx, nr)
}

func (h RedactingHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	clean := make([]slog.Attr, 0, len(attrs))
	for _, a := range attrs {
		a.Value = slog.StringValue(redact(a.Value.String()))
		clean = append(clean, a)
	}
	return RedactingHandler{inner: h.inner.WithAttrs(clean)}
}

func (h RedactingHandler) WithGroup(name string) slog.Handler {
	return RedactingHandler{inner: h.inner.WithGroup(name)}
}

func redact(s string) string {
	s = secretRE.ReplaceAllString(s, "$1=[REDACTED]")
	return s
}

type Logger struct {
	*slog.Logger
	level *slog.LevelVar
	file  *os.File
	mu    sync.Mutex
}

func New(logPath, level string) (*Logger, error) {
	if err := os.MkdirAll(filepath.Dir(logPath), 0o700); err != nil {
		return nil, err
	}
	f, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return nil, err
	}
	lv := new(slog.LevelVar)
	lv.Set(ParseLevel(level))
	writer := io.MultiWriter(os.Stdout, f)
	handler := slog.NewJSONHandler(writer, &slog.HandlerOptions{Level: lv})
	logger := slog.New(RedactingHandler{inner: handler})
	return &Logger{Logger: logger, level: lv, file: f}, nil
}

func (l *Logger) SetLevel(level string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.level.Set(ParseLevel(level))
}

func (l *Logger) Close() error {
	if l.file != nil {
		return l.file.Close()
	}
	return nil
}

func ParseLevel(level string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func NewNop() *Logger {
	lv := new(slog.LevelVar)
	h := slog.NewJSONHandler(io.Discard, &slog.HandlerOptions{Level: lv})
	return &Logger{Logger: slog.New(h), level: lv}
}
