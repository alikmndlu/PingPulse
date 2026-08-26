package updater

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

func currentInstallWritable() bool {
	return dirWritable(installDirOfRunningApp())
}

func installDirOfRunningApp() string {
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	if runtime.GOOS == "darwin" {
		if app := appBundleRoot(exe); app != "" {
			return filepath.Dir(app)
		}
	}
	return filepath.Dir(exe)
}

func dirWritable(dir string) bool {
	if strings.TrimSpace(dir) == "" {
		return false
	}
	f, err := os.CreateTemp(dir, ".pingpulse-write-*")
	if err != nil {
		return false
	}
	name := f.Name()
	_ = f.Close()
	_ = os.Remove(name)
	return true
}

func notWritableHint() string {
	switch runtime.GOOS {
	case "darwin":
		return "Move PingPulse.app to Applications, then check again. In-app update cannot replace a copy on a read-only disk image."
	case "linux":
		return "Install the .deb (Debian/Ubuntu) or .rpm (Fedora) from GitHub Releases, or keep PingPulse in a folder you can write to."
	default:
		return "Install PingPulse with the setup from GitHub Releases, then update from there."
	}
}

func notWritableError() error {
	return fmt.Errorf("%s", notWritableHint())
}
