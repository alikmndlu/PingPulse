//go:build !windows

package updater

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func replaceRunning(newPath string) error {
	current, err := os.Executable()
	if err != nil {
		return fmt.Errorf("unable to locate the running app")
	}
	if resolved, err := filepath.EvalSymlinks(current); err == nil {
		current = resolved
	}
	target := current
	if runtime.GOOS == "darwin" {
		if app := appBundleRoot(current); app != "" {
			target = app
		}
	}
	script := filepath.Join(filepath.Dir(newPath), "apply-update.sh")
	body := "#!/bin/sh\nset -e\n" +
		"TARGET=\"" + shellEscape(target) + "\"\n" +
		"SOURCE=\"" + shellEscape(newPath) + "\"\n" +
		"i=0\n" +
		"while [ \"$i\" -lt 30 ]; do\n" +
		"  i=$((i+1))\n" +
		"  sleep 1\n" +
		"  if [ -d \"$SOURCE\" ]; then\n" +
		"    rm -rf \"$TARGET\" && mv \"$SOURCE\" \"$TARGET\" && break\n" +
		"  else\n" +
		"    mv -f \"$SOURCE\" \"$TARGET\" && chmod +x \"$TARGET\" && break\n" +
		"  fi || true\n" +
		"done\n"
	if runtime.GOOS == "darwin" {
		body += "open \"$TARGET\" >/dev/null 2>&1 || true\n"
	} else {
		body += "\"$TARGET\" >/dev/null 2>&1 &\n"
	}
	body += "rm -f \"$0\"\n"
	if err := os.WriteFile(script, []byte(body), 0o700); err != nil {
		return fmt.Errorf("unable to schedule the update")
	}
	cmd := exec.Command("/bin/sh", script)
	cmd.Stdout = nil
	cmd.Stderr = nil
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("unable to start the updater")
	}
	_ = cmd.Process.Release()
	return nil
}

func appBundleRoot(exe string) string {
	dir := filepath.Dir(exe) // MacOS
	if !strings.EqualFold(filepath.Base(dir), "MacOS") {
		return ""
	}
	contents := filepath.Dir(dir)
	if !strings.EqualFold(filepath.Base(contents), "Contents") {
		return ""
	}
	return filepath.Dir(contents)
}

func shellEscape(v string) string {
	return strings.ReplaceAll(v, `"`, `\"`)
}
