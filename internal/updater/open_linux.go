//go:build linux

package updater

import (
	"fmt"
	"os/exec"
)

func openPackageInstaller(path string) error {
	for _, bin := range []string{"xdg-open", "gio", "kde-open", "gnome-open"} {
		p, err := exec.LookPath(bin)
		if err != nil {
			continue
		}
		cmd := exec.Command(p, path)
		if bin == "gio" {
			cmd = exec.Command(p, "open", path)
		}
		cmd.Stdin = nil
		cmd.Stdout = nil
		cmd.Stderr = nil
		if err := cmd.Start(); err != nil {
			continue
		}
		_ = cmd.Process.Release()
		return nil
	}
	return fmt.Errorf("no package opener was found")
}
