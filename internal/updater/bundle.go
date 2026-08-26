package updater

import (
	"path/filepath"
	"strings"
)

func appBundleRoot(exe string) string {
	dir := filepath.Dir(exe)
	if !strings.EqualFold(filepath.Base(dir), "MacOS") {
		return ""
	}
	contents := filepath.Dir(dir)
	if !strings.EqualFold(filepath.Base(contents), "Contents") {
		return ""
	}
	app := filepath.Dir(contents)
	if !strings.HasSuffix(strings.ToLower(app), ".app") {
		return ""
	}
	return app
}
