package config

import (
	"os"
	"path/filepath"
	"runtime"
)

const AppName = "PingPulse"

func DataDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		base, err = os.UserHomeDir()
		if err != nil {
			return "", err
		}
		base = filepath.Join(base, ".config")
	}
	dir := filepath.Join(base, AppName)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	return dir, nil
}

func DatabasePath() (string, error) {
	dir, err := DataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "pingpulse.db"), nil
}

func LogPath() (string, error) {
	dir, err := DataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "pingpulse.log"), nil
}

func OS() string {
	return runtime.GOOS
}
