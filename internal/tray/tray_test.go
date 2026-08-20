package tray

import (
	"bytes"
	"image"
	_ "image/png"
	"runtime"
	"testing"

	"pingpulse/internal/appicon"
)

func TestTrayIconBytesPlatformFormat(t *testing.T) {
	fallback, err := appicon.EncodePNG(64)
	if err != nil {
		t.Fatal(err)
	}
	got := trayIconBytes(fallback)
	if len(got) == 0 {
		t.Fatal("expected non-empty tray icon")
	}

	switch runtime.GOOS {
	case "windows":
		if len(got) < 6 || got[2] != 1 || got[3] != 0 {
			t.Fatalf("windows tray icon should be ICO, got header=%v", got[:min(6, len(got))])
		}
	default:
		img, format, err := image.Decode(bytes.NewReader(got))
		if err != nil {
			t.Fatalf("linux/mac tray icon must be image.Decode-able: %v", err)
		}
		if format != "png" {
			t.Fatalf("expected png, got %s", format)
		}
		if img.Bounds().Dx() < 16 || img.Bounds().Dy() < 16 {
			t.Fatalf("unexpected size %v", img.Bounds())
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
