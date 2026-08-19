//go:build windows

package autostart

import (
	"fmt"

	"golang.org/x/sys/windows/registry"
)

func Enable() error {
	exe, err := Executable()
	if err != nil {
		return err
	}
	k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Run`, registry.SET_VALUE)
	if err != nil {
		return fmt.Errorf("unable to update startup settings")
	}
	defer k.Close()
	if err := k.SetStringValue(Name(), `"`+exe+`"`); err != nil {
		return fmt.Errorf("unable to update startup settings")
	}
	return nil
}

func Disable() error {
	k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Run`, registry.SET_VALUE)
	if err != nil {
		return nil
	}
	defer k.Close()
	_ = k.DeleteValue(Name())
	return nil
}
