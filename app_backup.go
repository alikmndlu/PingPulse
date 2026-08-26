package main

import (
	"fmt"
	"strings"
	"time"

	"pingpulse/internal/backup"
	"pingpulse/internal/config"
	"pingpulse/internal/domain"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) GetDataPaths() (domain.DataPaths, error) {
	dir, err := config.DataDir()
	if err != nil {
		return domain.DataPaths{}, publicErr(err)
	}
	dbPath, err := config.DatabasePath()
	if err != nil {
		return domain.DataPaths{}, publicErr(err)
	}
	logPath, err := config.LogPath()
	if err != nil {
		return domain.DataPaths{}, publicErr(err)
	}
	return domain.DataPaths{Dir: dir, Database: dbPath, Log: logPath}, nil
}

func (a *App) OpenDataDir() error {
	dir, err := config.DataDir()
	if err != nil {
		return publicErr(err)
	}
	return publicErr(config.OpenPath(dir))
}

func (a *App) OpenLogFile() error {
	path, err := config.LogPath()
	if err != nil {
		return publicErr(err)
	}
	return publicErr(config.OpenPath(path))
}

func (a *App) ExportBackup() (domain.BackupResult, error) {
	if a.db == nil || a.ctx == nil {
		return domain.BackupResult{}, fmt.Errorf("application is still starting")
	}
	stamp := time.Now().Format("2006-01-02")
	dest, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export PingPulse backup",
		DefaultFilename: "PingPulse-backup-" + stamp + ".db",
		Filters: []runtime.FileFilter{{
			DisplayName: "PingPulse backup (*.db)",
			Pattern:     "*.db",
		}},
	})
	if err != nil {
		return domain.BackupResult{}, publicErr(err)
	}
	if dest == "" {
		return domain.BackupResult{Cancelled: true}, nil
	}
	if err := backup.Snapshot(a.requestContext(), a.db, dest); err != nil {
		return domain.BackupResult{}, publicErr(err)
	}
	return domain.BackupResult{Path: dest}, nil
}

func (a *App) RestoreBackup() (domain.BackupResult, error) {
	if a.ctx == nil {
		return domain.BackupResult{}, fmt.Errorf("application is still starting")
	}
	src, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Restore PingPulse backup",
		Filters: []runtime.FileFilter{{
			DisplayName: "PingPulse backup (*.db)",
			Pattern:     "*.db",
		}},
	})
	if err != nil {
		return domain.BackupResult{}, publicErr(err)
	}
	if src == "" {
		return domain.BackupResult{Cancelled: true}, nil
	}
	dest, err := config.DatabasePath()
	if err != nil {
		return domain.BackupResult{}, publicErr(err)
	}
	if a.scheduler != nil {
		a.scheduler.Stop()
	}
	if a.db != nil {
		if err := a.db.Close(); err != nil {
			return domain.BackupResult{}, publicErr(err)
		}
		a.db = nil
	}
	if err := backup.Replace(src, dest); err != nil {
		db, openErr := openDB(dest)
		if openErr != nil {
			return domain.BackupResult{}, publicErr(fmt.Errorf("restore failed (%v); reopen PingPulse", err))
		}
		a.attachDB(db)
		return domain.BackupResult{}, publicErr(err)
	}
	runtime.Quit(a.ctx)
	return domain.BackupResult{Path: src, RestartRequired: true}, nil
}

func (a *App) CompleteOnboarding(seedSample bool) error {
	ctx := a.requestContext()
	if seedSample {
		_, err := a.CreateTarget(domain.CreateTargetInput{
			Name:    "Internet (Cloudflare)",
			Host:    "1.1.1.1",
			Enabled: boolPtr(true),
		})
		if err != nil && !isDuplicateTarget(err) {
			return err
		}
		if startErr := a.StartMonitoring(); startErr != nil {
			a.logger.Warn("start monitoring after onboarding", "error", startErr)
		}
	}
	s, err := a.settings.Get(ctx)
	if err != nil {
		return publicErr(err)
	}
	s.OnboardingComplete = true
	return publicErr(a.settings.Save(ctx, s))
}

func boolPtr(v bool) *bool { return &v }

func isDuplicateTarget(err error) bool {
	return err != nil && strings.Contains(err.Error(), "already exists")
}
