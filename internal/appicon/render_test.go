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
	}
	ico, err := EncodeICO(16, 32, 256)
	if err != nil || len(ico) < 100 {
		t.Fatalf("ico: %d %v", len(ico), err)
	}
}
