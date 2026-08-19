package tray

import (
	"bytes"
	"encoding/binary"
	"image/png"
	"log/slog"
	"sync/atomic"

	"pingpulse/internal/appicon"

	"github.com/energye/systray"
)

type Callbacks struct {
	OnOpen  func()
	OnStart func()
	OnStop  func()
	OnPause func()
	OnQuit  func()
}

type Tray struct {
	icon    []byte
	logger  *slog.Logger
	cb      Callbacks
	started atomic.Bool
	ready   atomic.Bool
	offline atomic.Int32
}

func New(iconPNG []byte, logger *slog.Logger, cb Callbacks) *Tray {
	ico, err := appicon.EncodeICO(16, 32, 48)
	if err != nil || len(ico) == 0 {
		ico = PNGToICO(iconPNG)
	}
	if len(ico) == 0 {
		ico = iconPNG
	}
	return &Tray{icon: ico, logger: logger, cb: cb}
}

func (t *Tray) Start() {
	if t.started.Swap(true) {
		return
	}
	go func() {
		systray.Run(t.onReady, func() {})
	}()
}

func (t *Tray) Stop() {
	if t.started.Load() {
		systray.Quit()
	}
}

func (t *Tray) SetOfflineCount(n int) {
	t.offline.Store(int32(n))
	if !t.ready.Load() {
		return
	}
	if n > 0 {
		systray.SetTooltip("PingPulse — " + itoa(n) + " offline")
	} else {
		systray.SetTooltip("PingPulse — all clear")
	}
}

func (t *Tray) onReady() {
	t.ready.Store(true)
	systray.SetIcon(t.icon)
	systray.SetTitle("PingPulse")
	systray.SetTooltip("PingPulse")
	open := systray.AddMenuItem("Open PingPulse", "Show the PingPulse window")
	systray.AddSeparator()
	start := systray.AddMenuItem("Start Monitoring", "Start ping monitoring")
	stop := systray.AddMenuItem("Stop Monitoring", "Stop ping monitoring")
	pause := systray.AddMenuItem("Pause All", "Pause all target checks")
	systray.AddSeparator()
	quit := systray.AddMenuItem("Quit", "Exit PingPulse")
	open.Click(func() {
		if t.cb.OnOpen != nil {
			t.cb.OnOpen()
		}
	})
	start.Click(func() {
		if t.cb.OnStart != nil {
			t.cb.OnStart()
		}
	})
	stop.Click(func() {
		if t.cb.OnStop != nil {
			t.cb.OnStop()
		}
	})
	pause.Click(func() {
		if t.cb.OnPause != nil {
			t.cb.OnPause()
		}
	})
	quit.Click(func() {
		if t.cb.OnQuit != nil {
			t.cb.OnQuit()
		}
		systray.Quit()
	})
}

func PNGToICO(pngBytes []byte) []byte {
	if len(pngBytes) == 0 {
		return nil
	}
	cfg, err := png.DecodeConfig(bytes.NewReader(pngBytes))
	if err != nil {
		return pngBytes
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

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
