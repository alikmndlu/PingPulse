package main

import (
	"os"
	"path/filepath"

	"pingpulse/internal/appicon"
)

func main() {
	root := "."
	if len(os.Args) > 1 {
		root = os.Args[1]
	}
	png, err := appicon.EncodePNG(1024)
	if err != nil {
		panic(err)
	}
	ico, err := appicon.EncodeICO(16, 24, 32, 48, 64, 128, 256)
	if err != nil {
		panic(err)
	}
	writes := []struct {
		path string
		data []byte
	}{
		{filepath.Join(root, "build", "appicon.png"), png},
		{filepath.Join(root, "frontend", "public", "appicon.png"), png},
		{filepath.Join(root, "build", "windows", "icon.ico"), ico},
	}
	for _, w := range writes {
		if err := os.MkdirAll(filepath.Dir(w.path), 0o755); err != nil {
			panic(err)
		}
		if err := os.WriteFile(w.path, w.data, 0o644); err != nil {
			panic(err)
		}
	}
}
