package backup

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func Snapshot(ctx context.Context, db *sql.DB, dest string) error {
	dest = filepath.Clean(strings.TrimSpace(dest))
	if dest == "" {
		return fmt.Errorf("backup path is empty")
	}
	if err := os.MkdirAll(filepath.Dir(dest), 0o700); err != nil {
		return err
	}
	_ = os.Remove(dest)
	_, err := db.ExecContext(ctx, "VACUUM INTO "+quoteSQL(dest))
	if err != nil {
		return fmt.Errorf("create backup: %w", err)
	}
	return nil
}

func Replace(src, dest string) error {
	src = filepath.Clean(strings.TrimSpace(src))
	dest = filepath.Clean(strings.TrimSpace(dest))
	if src == "" || dest == "" {
		return fmt.Errorf("backup path is empty")
	}
	if filepath.Clean(src) == filepath.Clean(dest) {
		return fmt.Errorf("backup file is the live database")
	}
	info, err := os.Stat(src)
	if err != nil {
		return fmt.Errorf("backup file was not found")
	}
	if info.IsDir() || info.Size() < 64 {
		return fmt.Errorf("backup file is invalid")
	}
	tmp := dest + ".restore-tmp"
	if err := copyFile(src, tmp); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	_ = os.Remove(dest)
	if err := os.Rename(tmp, dest); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	_ = os.Remove(dest + "-wal")
	_ = os.Remove(dest + "-shm")
	return nil
}

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dest, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func quoteSQL(path string) string {
	return "'" + strings.ReplaceAll(path, "'", "''") + "'"
}
