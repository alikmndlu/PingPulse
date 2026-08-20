package tray

import (
	"log/slog"
	"runtime"
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
	return &Tray{icon: trayIconBytes(iconPNG), logger: logger, cb: cb}
}

// trayIconBytes picks a format StatusNotifier / AppIndicator can actually render.
// Linux decodes via image.Decode (PNG/JPEG only). Windows expects .ico bytes.
func trayIconBytes(fallbackPNG []byte) []byte {
	switch runtime.GOOS {
	case "windows":
		if ico, err := appicon.EncodeICO(16, 32, 48); err == nil && len(ico) > 0 {
			return ico
		}
		if len(fallbackPNG) > 0 {
			return PNGToICO(fallbackPNG)
		}
	default:
		// Prefer a sharp tray-sized PNG; StatusNotifierItem.IconPixmap needs decodable image data.
		if png, err := appicon.EncodePNG(32); err == nil && len(png) > 0 {
			return png
		}
		if len(fallbackPNG) > 0 {
			return fallbackPNG
		}
		if png, err := appicon.EncodePNG(48); err == nil {
			return png
		}
	}
	return fallbackPNG
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
	if len(t.icon) > 0 {
		systray.SetIcon(t.icon)
	}
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
