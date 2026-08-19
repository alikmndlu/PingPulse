//go:build linux

package autostart

import (
	"fmt"
	"os"
	"path/filepath"
)

func Enable() error {
	exe, err := Executable()
	if err != nil {
		return err
	}
	dir := filepath.Join(os.Getenv("HOME"), ".config", "autostart")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("unable to update startup settings")
	}
	body := fmt.Sprintf("[Desktop Entry]\nType=Application\nName=%s\nExec=%q\nX-GNOME-Autostart-enabled=true\n", Name(), exe)
	return os.WriteFile(filepath.Join(dir, "pingpulse.desktop"), []byte(body), 0o600)
}

func Disable() error {
	path := filepath.Join(os.Getenv("HOME"), ".config", "autostart", "pingpulse.desktop")
	_ = os.Remove(path)
	return nil
}
