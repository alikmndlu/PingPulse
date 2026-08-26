package backup

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"pingpulse/internal/database"
	"pingpulse/internal/domain"
	"pingpulse/internal/repository"
)

func TestSnapshotAndReplace(t *testing.T) {
	dir := t.TempDir()
	live := filepath.Join(dir, "live.db")
	snap := filepath.Join(dir, "backup.db")

	db, err := database.Open(live)
	if err != nil {
		t.Fatal(err)
	}
	targets := repository.NewTargetRepository(db)
	if _, err := targets.Create(context.Background(), domain.Target{
		Name: "API", Host: "1.1.1.1", Interval: 30, Timeout: 1, LastStatus: domain.StatusUnknown,
	}); err != nil {
		t.Fatal(err)
	}
	if err := Snapshot(context.Background(), db, snap); err != nil {
		t.Fatal(err)
	}
	_ = db.Close()

	if err := Replace(snap, live); err != nil {
		t.Fatal(err)
	}
	db2, err := database.Open(live)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db2.Close() })
	list, err := repository.NewTargetRepository(db2).List(context.Background())
	if err != nil || len(list) != 1 || list[0].Host != "1.1.1.1" {
		t.Fatalf("restored %+v err=%v", list, err)
	}
}

func TestReplaceRejectsMissing(t *testing.T) {
	dir := t.TempDir()
	err := Replace(filepath.Join(dir, "nope.db"), filepath.Join(dir, "live.db"))
	if err == nil {
		t.Fatal("expected error")
	}
	_ = os.WriteFile(filepath.Join(dir, "empty.db"), []byte("x"), 0o600)
	if err := Replace(filepath.Join(dir, "empty.db"), filepath.Join(dir, "live.db")); err == nil {
		t.Fatal("expected invalid backup")
	}
}
