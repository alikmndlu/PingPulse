package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"
)

const maxNotes = 2000

// releaseAPIURL overrides GitHub's latest-release endpoint in tests.
var releaseAPIURL string

func latestReleaseURL() string {
	if releaseAPIURL != "" {
		return releaseAPIURL
	}
	return fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", GitHubOwner, GitHubRepo)
}

func Check(ctx context.Context) (Info, error) {
	info := Info{CurrentVersion: DisplayVersion()}
	url := latestReleaseURL()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return info, fmt.Errorf("unable to check for updates")
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "PingPulse/"+DisplayVersion())
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return info, fmt.Errorf("unable to reach GitHub for updates")
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode == http.StatusNotFound {
		return info, fmt.Errorf("no GitHub release was found")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return info, fmt.Errorf("unable to check for updates")
	}
	var rel githubRelease
	if err := json.Unmarshal(body, &rel); err != nil || strings.TrimSpace(rel.TagName) == "" {
		return info, fmt.Errorf("unable to read the latest release")
	}
	info.LatestVersion = DisplayVersionFrom(rel.TagName)
	info.ReleaseURL = rel.HTMLURL
	info.Notes = strings.TrimSpace(rel.Body)
	if len(info.Notes) > maxNotes {
		info.Notes = info.Notes[:maxNotes] + "…"
	}
	name, assetURL, ok := pickAsset(rel, runtime.GOOS)
	if ok {
		info.AssetName = name
		info.AssetURL = assetURL
	}
	if runtime.GOOS == "linux" {
		if pn, pu, ok := pickLinuxPackage(rel); ok {
			info.PackageName = pn
			info.PackageURL = pu
		}
	}
	info.Available = Compare(info.CurrentVersion, info.LatestVersion) < 0
	dev := runningFromDevBuild()
	writable := currentInstallWritable()
	inPlace := info.AssetURL != "" && writable
	pkg := info.PackageURL != ""
	info.CanInstall = info.Available && !dev && (inPlace || pkg)
	switch {
	case !info.Available:
	case dev:
		info.InstallHint = "Updates cannot be installed from a development build."
	case !info.CanInstall:
		info.InstallHint = notWritableHint()
	}
	return info, nil
}

func DisplayVersionFrom(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return "v0.0.0"
	}
	if v[0] != 'v' && v[0] != 'V' {
		return "v" + v
	}
	return v
}

func pickAsset(rel githubRelease, goos string) (string, string, bool) {
	want := map[string][]string{
		"windows": {"windows-amd64.zip", "windows"},
		"linux":   {"linux-amd64.tar.gz", "linux"},
		"darwin":  {"darwin-universal.tar.gz", "darwin"},
	}
	needles, ok := want[goos]
	if !ok {
		return "", "", false
	}
	for _, asset := range rel.Assets {
		name := strings.ToLower(strings.TrimSpace(asset.Name))
		url := strings.TrimSpace(asset.BrowserDownloadURL)
		if name == "" || url == "" {
			continue
		}
		if skipHumanInstaller(name) {
			continue
		}
		if strings.Contains(name, needles[0]) || (strings.Contains(name, needles[1]) && strings.Contains(name, ".zip") && goos == "windows") || (strings.Contains(name, needles[1]) && strings.Contains(name, ".tar.gz") && goos != "windows") {
			if allowedDownloadURL(url) {
				return asset.Name, url, true
			}
		}
	}
	return "", "", false
}

func pickLinuxPackage(rel githubRelease) (string, string, bool) {
	return pickLinuxPackagePref(rel, fileExists("/etc/debian_version"))
}

func pickLinuxPackagePref(rel githubRelease, preferDeb bool) (string, string, bool) {
	first, second := ".deb", ".rpm"
	if !preferDeb {
		first, second = ".rpm", ".deb"
	}
	if name, url, ok := pickBySuffix(rel, first); ok {
		return name, url, true
	}
	return pickBySuffix(rel, second)
}

func pickBySuffix(rel githubRelease, suffix string) (string, string, bool) {
	suffix = strings.ToLower(suffix)
	for _, asset := range rel.Assets {
		name := strings.ToLower(strings.TrimSpace(asset.Name))
		url := strings.TrimSpace(asset.BrowserDownloadURL)
		if name == "" || url == "" || !strings.HasSuffix(name, suffix) {
			continue
		}
		if allowedDownloadURL(url) {
			return asset.Name, url, true
		}
	}
	return "", "", false
}

func skipHumanInstaller(name string) bool {
	return strings.Contains(name, "setup") ||
		strings.Contains(name, "installer") ||
		strings.HasSuffix(name, ".deb") ||
		strings.HasSuffix(name, ".rpm") ||
		strings.HasSuffix(name, ".dmg")
}

func allowedDownloadURL(raw string) bool {
	raw = strings.ToLower(strings.TrimSpace(raw))
	prefix := fmt.Sprintf("https://github.com/%s/%s/releases/download/", strings.ToLower(GitHubOwner), strings.ToLower(GitHubRepo))
	return strings.HasPrefix(raw, prefix)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
