package autostart

import (
	"os"
	"path/filepath"
)

func Executable() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	return filepath.EvalSymlinks(exe)
}

func Name() string {
	return "PingPulse"
}
