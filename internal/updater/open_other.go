//go:build !linux

package updater

import "fmt"

func openPackageInstaller(path string) error {
	_ = path
	return fmt.Errorf("package install is only supported on Linux")
}
