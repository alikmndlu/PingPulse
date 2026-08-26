package updater

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestCompare(t *testing.T) {
	if Compare("1.0.0", "v1.0.0") != 0 {
		t.Fatal("v prefix should be ignored")
	}
	if Compare("1.0.0", "1.0.1") >= 0 {
		t.Fatal("1.0.0 should be older than 1.0.1")
	}
	if Compare("v1.2.0", "1.1.9") <= 0 {
		t.Fatal("1.2.0 should be newer")
	}
}

func TestPickAsset(t *testing.T) {
	rel := githubRelease{
		TagName: "v1.0.1",
		Assets: []struct {
			Name               string `json:"name"`
			BrowserDownloadURL string `json:"browser_download_url"`
			Size               int64  `json:"size"`
		}{
			{Name: "PingPulse-v1.0.1-windows-amd64-setup.exe", BrowserDownloadURL: "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-windows-amd64-setup.exe"},
			{Name: "PingPulse-v1.0.1-windows-amd64.zip", BrowserDownloadURL: "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-windows-amd64.zip"},
			{Name: "PingPulse-v1.0.1-linux-amd64.tar.gz", BrowserDownloadURL: "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-linux-amd64.tar.gz"},
			{Name: "PingPulse-v1.0.1-linux-amd64.deb", BrowserDownloadURL: "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-linux-amd64.deb"},
			{Name: "PingPulse-v1.0.1-linux-amd64.rpm", BrowserDownloadURL: "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-linux-amd64.rpm"},
			{Name: "PingPulse-v1.0.1-darwin-universal.dmg", BrowserDownloadURL: "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-darwin-universal.dmg"},
			{Name: "PingPulse-v1.0.1-darwin-universal.tar.gz", BrowserDownloadURL: "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-darwin-universal.tar.gz"},
			{Name: "evil.exe", BrowserDownloadURL: "https://evil.example/x.exe"},
		},
	}
	name, url, ok := pickAsset(rel, "windows")
	if !ok || name != "PingPulse-v1.0.1-windows-amd64.zip" {
		t.Fatalf("windows asset: %s %v", name, ok)
	}
	if !allowedDownloadURL(url) {
		t.Fatal("expected github download url")
	}
	if allowedDownloadURL("https://evil.example/x.exe") {
		t.Fatal("rejected host should fail")
	}
	linuxName, _, ok := pickAsset(rel, "linux")
	if !ok || linuxName != "PingPulse-v1.0.1-linux-amd64.tar.gz" {
		t.Fatalf("linux in-place asset should be the tarball, got %s", linuxName)
	}
	darwinName, _, ok := pickAsset(rel, "darwin")
	if !ok || darwinName != "PingPulse-v1.0.1-darwin-universal.tar.gz" {
		t.Fatalf("darwin in-place asset should be the tarball, got %s", darwinName)
	}
	deb, _, ok := pickLinuxPackagePref(rel, true)
	if !ok || deb != "PingPulse-v1.0.1-linux-amd64.deb" {
		t.Fatalf("debian package: %s %v", deb, ok)
	}
	rpm, _, ok := pickLinuxPackagePref(rel, false)
	if !ok || rpm != "PingPulse-v1.0.1-linux-amd64.rpm" {
		t.Fatalf("rpm package: %s %v", rpm, ok)
	}
	if _, _, ok := pickAsset(rel, "plan9"); ok {
		t.Fatal("unknown os should not match")
	}
}

func TestAppBundleRoot(t *testing.T) {
	exe := filepath.Join("Applications", "PingPulse.app", "Contents", "MacOS", "PingPulse")
	got := appBundleRoot(exe)
	if !strings.HasSuffix(got, "PingPulse.app") {
		t.Fatalf("got %s", got)
	}
	if appBundleRoot(filepath.Join("opt", "pingpulse", "PingPulse")) != "" {
		t.Fatal("linux path should not look like an app bundle")
	}
}

func TestDisplayVersion(t *testing.T) {
	if DisplayVersionFrom("1.2.3") != "v1.2.3" {
		t.Fatal(DisplayVersionFrom("1.2.3"))
	}
}

func TestDirWritable(t *testing.T) {
	dir := t.TempDir()
	if !dirWritable(dir) {
		t.Fatal("temp dir should be writable")
	}
	if dirWritable(filepath.Join(dir, "missing-parent", "nope")) {
		t.Fatal("missing dir should not look writable")
	}
}

func TestSafeJoinRejectsZipSlip(t *testing.T) {
	dir := t.TempDir()
	if _, err := safeJoin(dir, filepath.Join("..", "outside")); err == nil {
		t.Fatal("expected zip-slip rejection")
	}
}

func TestCheckLatest(t *testing.T) {
	oldVersion := Version
	Version = "1.0.0"
	t.Cleanup(func() { Version = oldVersion })

	payload, _ := json.Marshal(map[string]any{
		"tag_name": "v1.0.1",
		"html_url": "https://github.com/alikmndlu/PingPulse/releases/tag/v1.0.1",
		"body":     "Bug fixes",
		"assets": []map[string]any{
			{
				"name":                 "PingPulse-v1.0.1-windows-amd64-setup.exe",
				"browser_download_url": "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-windows-amd64-setup.exe",
			},
			{
				"name":                 "PingPulse-v1.0.1-windows-amd64.zip",
				"browser_download_url": "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-windows-amd64.zip",
			},
			{
				"name":                 "PingPulse-v1.0.1-linux-amd64.tar.gz",
				"browser_download_url": "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-linux-amd64.tar.gz",
			},
			{
				"name":                 "PingPulse-v1.0.1-linux-amd64.deb",
				"browser_download_url": "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-linux-amd64.deb",
			},
			{
				"name":                 "PingPulse-v1.0.1-linux-amd64.rpm",
				"browser_download_url": "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-linux-amd64.rpm",
			},
			{
				"name":                 "PingPulse-v1.0.1-darwin-universal.dmg",
				"browser_download_url": "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-darwin-universal.dmg",
			},
			{
				"name":                 "PingPulse-v1.0.1-darwin-universal.tar.gz",
				"browser_download_url": "https://github.com/alikmndlu/PingPulse/releases/download/v1.0.1/PingPulse-v1.0.1-darwin-universal.tar.gz",
			},
		},
	})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/alikmndlu/PingPulse/releases/latest" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(payload)
	}))
	t.Cleanup(srv.Close)
	releaseAPIURL = srv.URL + "/repos/alikmndlu/PingPulse/releases/latest"
	t.Cleanup(func() { releaseAPIURL = "" })

	info, err := Check(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if info.LatestVersion != "v1.0.1" || !info.Available {
		t.Fatalf("%+v", info)
	}
	if info.AssetURL == "" {
		t.Fatalf("expected an asset for %s", runtime.GOOS)
	}
	if runtime.GOOS == "windows" && !strings.HasSuffix(strings.ToLower(info.AssetName), ".zip") {
		t.Fatalf("windows update asset should be the zip, got %s", info.AssetName)
	}
	if runtime.GOOS == "linux" && info.PackageURL == "" {
		t.Fatal("linux check should surface a .deb or .rpm for system installs")
	}
	if runtime.GOOS == "darwin" && strings.HasSuffix(strings.ToLower(info.AssetName), ".dmg") {
		t.Fatalf("darwin update asset should be the tarball, got %s", info.AssetName)
	}
}
