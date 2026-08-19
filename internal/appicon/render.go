package appicon

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/png"
	"math"
)

var (
	bg      = color.NRGBA{R: 0x0b, G: 0x12, B: 0x20, A: 0xff}
	cyan    = color.NRGBA{R: 0x22, G: 0xd3, B: 0xee, A: 0xff}
	cyanDim = color.NRGBA{R: 0x22, G: 0xd3, B: 0xee, A: 0x55}
)

type vec struct{ x, y float64 }

func Draw(size int) *image.NRGBA {
	if size < 16 {
		size = 16
	}
	img := image.NewNRGBA(image.Rect(0, 0, size, size))
	fill(img, bg)

	s := float64(size)
	pts := pulsePoints(size)
	for i := range pts {
		pts[i].x *= s
		pts[i].y *= s
	}

	if size >= 24 {
		stampDisc(img, 0.50*s, 0.52*s, s*0.30, color.NRGBA{R: 0x22, G: 0xd3, B: 0xee, A: 0x22})
	}
	if size >= 48 {
		drawArc(img, 0.50*s, 0.50*s, s*0.40, s*0.022, math.Pi*0.28, math.Pi*1.72, cyanDim)
	}
	if size >= 96 {
		drawArc(img, 0.50*s, 0.50*s, s*0.47, s*0.014, math.Pi*0.22, math.Pi*1.78, color.NRGBA{R: 0x22, G: 0xd3, B: 0xee, A: 0x32})
	}

	baseW, spikeW := strokeWidths(size)
	drawPulse(img, pts, baseW, spikeW)
	peak := pts[peakIndex(pts)]
	stampDisc(img, peak.x, peak.y, spikeW*0.55, cyan)
	return img
}

func strokeWidths(size int) (base, spike float64) {
	s := float64(size)
	switch {
	case size <= 16:
		return 1.35, 2.05
	case size <= 32:
		return s * 0.07, s * 0.11
	default:
		return s * 0.070, s * 0.095
	}
}

func drawPulse(img *image.NRGBA, pts []vec, baseW, spikeW float64) {
	if len(pts) < 3 {
		return
	}
	peak := peakIndex(pts)
	// Baseline segments stay thinner so the QRS spike reads as a beat, not a plus sign.
	for i := 0; i < len(pts)-1; i++ {
		w := baseW
		if i+1 >= peak-1 && i <= peak {
			w = spikeW
		}
		drawSeg(img, pts[i], pts[i+1], w/2, color.NRGBA{R: 0x22, G: 0xd3, B: 0xee, A: 0x38})
		drawSeg(img, pts[i], pts[i+1], w/2*0.62, cyan)
	}
}

func pulsePoints(size int) []vec {
	if size <= 40 {
		return []vec{
			{0.06, 0.58},
			{0.28, 0.58},
			{0.40, 0.14},
			{0.52, 0.86},
			{0.64, 0.58},
			{0.94, 0.58},
		}
	}
	return []vec{
		{0.10, 0.54},
		{0.24, 0.54},
		{0.30, 0.40},
		{0.36, 0.54},
		{0.42, 0.54},
		{0.48, 0.16},
		{0.54, 0.84},
		{0.60, 0.54},
		{0.70, 0.38},
		{0.80, 0.54},
		{0.90, 0.54},
	}
}

func peakIndex(pts []vec) int {
	best := 0
	for i, p := range pts {
		if p.y < pts[best].y {
			best = i
		}
	}
	return best
}

func fill(img *image.NRGBA, c color.NRGBA) {
	for y := 0; y < img.Bounds().Dy(); y++ {
		for x := 0; x < img.Bounds().Dx(); x++ {
			img.SetNRGBA(x, y, c)
		}
	}
}

func drawSeg(img *image.NRGBA, a, b vec, halfW float64, c color.NRGBA) {
	dx, dy := b.x-a.x, b.y-a.y
	dist := math.Hypot(dx, dy)
	if dist < 0.001 {
		stampDisc(img, a.x, a.y, halfW, c)
		return
	}
	steps := int(dist*2) + 1
	for i := 0; i <= steps; i++ {
		t := float64(i) / float64(steps)
		stampDisc(img, a.x+dx*t, a.y+dy*t, halfW, c)
	}
}

func drawArc(img *image.NRGBA, cx, cy, radius, halfW, start, end float64, c color.NRGBA) {
	steps := int(radius*end) + 32
	prev := vec{cx + math.Cos(start)*radius, cy + math.Sin(start)*radius}
	for i := 1; i <= steps; i++ {
		a := start + (end-start)*float64(i)/float64(steps)
		p := vec{cx + math.Cos(a)*radius, cy + math.Sin(a)*radius}
		drawSeg(img, prev, p, halfW, c)
		prev = p
	}
}

func stampDisc(img *image.NRGBA, cx, cy, r float64, c color.NRGBA) {
	if r < 0.4 {
		r = 0.4
	}
	minX := int(math.Floor(cx - r - 1))
	maxX := int(math.Ceil(cx + r + 1))
	minY := int(math.Floor(cy - r - 1))
	maxY := int(math.Ceil(cy + r + 1))
	b := img.Bounds()
	for y := minY; y <= maxY; y++ {
		if y < b.Min.Y || y >= b.Max.Y {
			continue
		}
		for x := minX; x <= maxX; x++ {
			if x < b.Min.X || x >= b.Max.X {
				continue
			}
			d := math.Hypot(float64(x)+0.5-cx, float64(y)+0.5-cy)
			cov := smoothstep(r+0.6, r-0.55, d)
			if cov <= 0 {
				continue
			}
			blend(img, x, y, c, cov)
		}
	}
}

func smoothstep(edge0, edge1, x float64) float64 {
	if edge0 == edge1 {
		if x < edge0 {
			return 0
		}
		return 1
	}
	t := (x - edge0) / (edge1 - edge0)
	if t < 0 {
		t = 0
	}
	if t > 1 {
		t = 1
	}
	return t * t * (3 - 2*t)
}

func blend(img *image.NRGBA, x, y int, src color.NRGBA, cov float64) {
	dst := img.NRGBAAt(x, y)
	sa := float64(src.A) / 255 * cov
	if sa <= 0 {
		return
	}
	inv := 1 - sa
	out := color.NRGBA{
		R: uint8(float64(src.R)*sa + float64(dst.R)*inv + 0.5),
		G: uint8(float64(src.G)*sa + float64(dst.G)*inv + 0.5),
		B: uint8(float64(src.B)*sa + float64(dst.B)*inv + 0.5),
		A: 255,
	}
	img.SetNRGBA(x, y, out)
}

func EncodePNG(size int) ([]byte, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, Draw(size)); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func EncodeICO(sizes ...int) ([]byte, error) {
	if len(sizes) == 0 {
		sizes = []int{16, 24, 32, 48, 64, 128, 256}
	}
	type entry struct {
		size int
		png  []byte
	}
	entries := make([]entry, 0, len(sizes))
	for _, s := range sizes {
		b, err := EncodePNG(s)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry{size: s, png: b})
	}
	var buf bytes.Buffer
	_ = binary.Write(&buf, binary.LittleEndian, uint16(0))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(len(entries)))
	offset := 6 + 16*len(entries)
	for _, e := range entries {
		w, h := byte(e.size), byte(e.size)
		if e.size >= 256 {
			w, h = 0, 0
		}
		buf.WriteByte(w)
		buf.WriteByte(h)
		buf.WriteByte(0)
		buf.WriteByte(0)
		_ = binary.Write(&buf, binary.LittleEndian, uint16(1))
		_ = binary.Write(&buf, binary.LittleEndian, uint16(32))
		_ = binary.Write(&buf, binary.LittleEndian, uint32(len(e.png)))
		_ = binary.Write(&buf, binary.LittleEndian, uint32(offset))
		offset += len(e.png)
	}
	for _, e := range entries {
		buf.Write(e.png)
	}
	return buf.Bytes(), nil
}
