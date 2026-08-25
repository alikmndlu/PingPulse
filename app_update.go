package main

import (
	"context"
	"time"

	"pingpulse/internal/domain"
	"pingpulse/internal/updater"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) GetAppVersion() string {
	return updater.DisplayVersion()
}

func (a *App) CheckForUpdate() (updater.Info, error) {
	ctx, cancel := context.WithTimeout(a.requestContext(), 20*time.Second)
	defer cancel()
	info, err := updater.Check(ctx)
	return info, publicErr(err)
}

func (a *App) InstallUpdate() error {
	ctx, cancel := context.WithTimeout(a.requestContext(), 10*time.Minute)
	defer cancel()
	info, err := updater.Check(ctx)
	if err != nil {
		return publicErr(err)
	}
	if err := updater.Install(ctx, info, func(p updater.Progress) {
		a.emit(domain.WailsUpdateProgress, p)
	}); err != nil {
		return publicErr(err)
	}
	go func() {
		time.Sleep(400 * time.Millisecond)
		a.QuitApp()
	}()
	return nil
}

func (a *App) OpenReleasePage() {
	if a.ctx == nil {
		return
	}
	runtime.BrowserOpenURL(a.ctx, "https://github.com/"+updater.GitHubOwner+"/"+updater.GitHubRepo+"/releases/latest")
}
