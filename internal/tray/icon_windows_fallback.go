package tray

import (
	"bytes"
	"encoding/binary"
	"image/png"
)

// PNGToICO wraps a single PNG as a minimal ICO for Windows fallbacks.
func PNGToICO(pngBytes []byte) []byte {
	if len(pngBytes) == 0 {
		return nil
	}
	cfg, err := png.DecodeConfig(bytes.NewReader(pngBytes))
	if err != nil {
		return nil
	}
	w, h := cfg.Width, cfg.Height
	if w > 256 {
		w = 256
	}
	if h > 256 {
		h = 256
	}
	buf := new(bytes.Buffer)
	_ = binary.Write(buf, binary.LittleEndian, uint16(0))
	_ = binary.Write(buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(buf, binary.LittleEndian, uint16(1))
	buf.WriteByte(byte(w))
	buf.WriteByte(byte(h))
	buf.WriteByte(0)
	buf.WriteByte(0)
	_ = binary.Write(buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(buf, binary.LittleEndian, uint16(32))
	_ = binary.Write(buf, binary.LittleEndian, uint32(len(pngBytes)))
	_ = binary.Write(buf, binary.LittleEndian, uint32(22))
	buf.Write(pngBytes)
	return buf.Bytes()
}
