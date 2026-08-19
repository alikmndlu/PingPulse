package updater

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const maxDownloadBytes = 250 << 20

type ProgressFunc func(Progress)

func runningFromDevBuild() bool {
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	exe = filepath.Clean(exe)
	tmp := filepath.Clean(os.TempDir())
	if rel, err := filepath.Rel(tmp, exe); err == nil && !strings.HasPrefix(rel, "..") {
		return true
	}
	lower := strings.ToLower(exe)
	sep := string(filepath.Separator)
	return strings.Contains(lower, sep+"go-build")
}

func Install(ctx context.Context, info Info, progress ProgressFunc) error {
	if runningFromDevBuild() {
		return fmt.Errorf("updates cannot be installed from a development build")
	}
	if !info.CanInstall || !allowedDownloadURL(info.AssetURL) {
		return fmt.Errorf("no installable update was found for this system")
	}
	dir, err := os.MkdirTemp("", "pingpulse-update-*")
	if err != nil {
		return fmt.Errorf("unable to prepare the update")
	}
	archivePath := filepath.Join(dir, safeName(info.AssetName))
	if err := download(ctx, info.AssetURL, archivePath, progress); err != nil {
		return err
	}
	extracted, err := extract(archivePath, dir)
	if err != nil {
		return err
	}
	return replaceRunning(extracted)
}

func download(ctx context.Context, url, dest string, progress ProgressFunc) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("unable to download the update")
	}
	req.Header.Set("User-Agent", "PingPulse/"+DisplayVersion())
	client := &http.Client{Timeout: 8 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("unable to download the update")
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("unable to download the update")
	}
	out, err := os.Create(dest)
	if err != nil {
		return fmt.Errorf("unable to save the update")
	}
	defer out.Close()
	total := resp.ContentLength
	var read int64
	buf := make([]byte, 32*1024)
	for {
		n, rerr := resp.Body.Read(buf)
		if n > 0 {
			read += int64(n)
			if read > maxDownloadBytes {
				return fmt.Errorf("the update file is too large")
			}
			if _, werr := out.Write(buf[:n]); werr != nil {
				return fmt.Errorf("unable to save the update")
			}
			if progress != nil && total > 0 {
				pct := int(read * 100 / total)
				if pct > 100 {
					pct = 100
				}
				progress(Progress{Percent: pct, Bytes: read, Total: total})
			}
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return fmt.Errorf("unable to download the update")
		}
	}
	if progress != nil {
		progress(Progress{Percent: 100, Bytes: read, Total: total})
	}
	return nil
}

func extract(archivePath, dest string) (string, error) {
	name := strings.ToLower(archivePath)
	switch {
	case strings.HasSuffix(name, ".zip"):
		return unzipExe(archivePath, dest)
	case strings.HasSuffix(name, ".tar.gz") || strings.HasSuffix(name, ".tgz"):
		return untar(archivePath, dest)
	default:
		return "", fmt.Errorf("unsupported update package")
	}
}

func unzipExe(zipPath, dest string) (string, error) {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return "", fmt.Errorf("unable to open the update package")
	}
	defer r.Close()
	var found string
	for _, f := range r.File {
		base := filepath.Base(f.Name)
		if strings.EqualFold(base, "PingPulse.exe") || strings.EqualFold(base, "PingPulse") {
			if f.FileInfo().IsDir() {
				continue
			}
			if err := extractZipFile(f, dest, base); err != nil {
				return "", err
			}
			found = filepath.Join(dest, base)
			break
		}
	}
	if found == "" {
		return "", fmt.Errorf("the update package did not contain PingPulse")
	}
	return found, nil
}

func extractZipFile(f *zip.File, dest, base string) error {
	target, err := safeJoin(dest, base)
	if err != nil {
		return err
	}
	rc, err := f.Open()
	if err != nil {
		return fmt.Errorf("unable to read the update package")
	}
	defer rc.Close()
	out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return fmt.Errorf("unable to extract the update")
	}
	defer out.Close()
	if _, err := io.Copy(out, io.LimitReader(rc, maxDownloadBytes)); err != nil {
		return fmt.Errorf("unable to extract the update")
	}
	return nil
}

func untar(archivePath, dest string) (string, error) {
	f, err := os.Open(archivePath)
	if err != nil {
		return "", fmt.Errorf("unable to open the update package")
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return "", fmt.Errorf("unable to open the update package")
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	var binaryPath string
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fmt.Errorf("unable to read the update package")
		}
		name := filepath.ToSlash(hdr.Name)
		if strings.Contains(name, "..") {
			continue
		}
		target, err := safeJoin(dest, filepath.FromSlash(name))
		if err != nil {
			return "", err
		}
		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0o755); err != nil {
				return "", fmt.Errorf("unable to extract the update")
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return "", fmt.Errorf("unable to extract the update")
			}
			out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(hdr.Mode)|0o111)
			if err != nil {
				return "", fmt.Errorf("unable to extract the update")
			}
			if _, err := io.Copy(out, io.LimitReader(tr, maxDownloadBytes)); err != nil {
				_ = out.Close()
				return "", fmt.Errorf("unable to extract the update")
			}
			_ = out.Close()
			base := filepath.Base(name)
			if runtime.GOOS != "windows" && (base == "PingPulse" && !strings.Contains(name, "PingPulse.app/")) {
				binaryPath = target
			}
		}
	}
	if runtime.GOOS == "darwin" {
		if app := findAppBundle(dest); app != "" {
			return app, nil
		}
	}
	if binaryPath != "" {
		return binaryPath, nil
	}
	return "", fmt.Errorf("the update package did not contain PingPulse")
}

func findAppBundle(root string) string {
	var found string
	_ = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || found != "" {
			return err
		}
		if info.IsDir() && strings.EqualFold(info.Name(), "PingPulse.app") {
			found = path
			return io.EOF
		}
		return nil
	})
	return found
}

func safeName(name string) string {
	name = filepath.Base(strings.ReplaceAll(name, "\\", "/"))
	if name == "" || name == "." || name == ".." {
		return "update.bin"
	}
	return name
}

func safeJoin(dir, name string) (string, error) {
	target := filepath.Join(dir, name)
	rel, err := filepath.Rel(dir, target)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("invalid update package path")
	}
	return target, nil
}
