package appicon

import (
	"bytes"
	"image"
	"image/png"
	"testing"
)

func TestDrawSizes(t *testing.T) {
	for _, size := range []int{16, 32, 256} {
		img := Draw(size)
		if img.Bounds() != image.Rect(0, 0, size, size) {
			t.Fatalf("size %d bounds=%v", size, img.Bounds())
		}
		var buf bytes.Buffer
		if err := png.Encode(&buf, img); err != nil {
			t.Fatal(err)
		}
		if buf.Len() < 64 {
			t.Fatalf("png too small for %d", size)
		}
		if img.NRGBAAt(0, 0).A != 0 || img.NRGBAAt(size-1, 0).A != 0 {
			t.Fatalf("size %d corners should be transparent", size)
		}
		mid := img.NRGBAAt(size/2, size/2)
		if mid.A < 200 {
			t.Fatalf("size %d center should be opaque, a=%d", size, mid.A)
		}
	}
	ico, err := EncodeICO(16, 32, 256)
	if err != nil || len(ico) < 100 {
		t.Fatalf("ico: %d %v", len(ico), err)
	}
}
