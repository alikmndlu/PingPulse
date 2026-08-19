//go:build darwin

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
	dir := filepath.Join(os.Getenv("HOME"), "Library", "LaunchAgents")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("unable to update startup settings")
	}
	plist := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.pingpulse.app</string>
  <key>ProgramArguments</key>
  <array><string>%s</string></array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
`, exe)
	return os.WriteFile(filepath.Join(dir, "com.pingpulse.app.plist"), []byte(plist), 0o600)
}

func Disable() error {
	path := filepath.Join(os.Getenv("HOME"), "Library", "LaunchAgents", "com.pingpulse.app.plist")
	_ = os.Remove(path)
	return nil
}
