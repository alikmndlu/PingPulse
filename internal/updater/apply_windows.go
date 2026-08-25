//go:build windows

package updater

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

const createNoWindow = 0x08000000

func replaceRunning(newBinary string) error {
	current, err := os.Executable()
	if err != nil {
		return fmt.Errorf("unable to locate the running app")
	}
	if resolved, err := filepath.EvalSymlinks(current); err == nil {
		current = resolved
	}
	script := filepath.Join(filepath.Dir(newBinary), "apply-update.bat")
	body := "@echo off\r\n" +
		"setlocal\r\n" +
		"set \"TARGET=" + current + "\"\r\n" +
		"set \"SOURCE=" + newBinary + "\"\r\n" +
		"set /a N=0\r\n" +
		":wait\r\n" +
		"timeout /t 1 /nobreak >nul\r\n" +
		"set /a N+=1\r\n" +
		"if %N% GEQ 30 exit /b 1\r\n" +
		"move /Y \"%SOURCE%\" \"%TARGET%\" >nul 2>nul\r\n" +
		"if errorlevel 1 goto wait\r\n" +
		"start \"\" \"%TARGET%\"\r\n" +
		"del \"%~f0\"\r\n"
	if err := os.WriteFile(script, []byte(body), 0o700); err != nil {
		return fmt.Errorf("unable to schedule the update")
	}
	cmd := exec.Command("cmd.exe", "/C", script)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: createNoWindow | syscall.CREATE_NEW_PROCESS_GROUP,
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("unable to start the updater")
	}
	_ = cmd.Process.Release()
	return nil
}
