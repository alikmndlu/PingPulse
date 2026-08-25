package updater

type Info struct {
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseURL     string `json:"releaseUrl"`
	Notes          string `json:"notes"`
	AssetName      string `json:"assetName"`
	AssetURL       string `json:"assetUrl"`
	Available      bool   `json:"available"`
	CanInstall     bool   `json:"canInstall"`
}

type Progress struct {
	Percent int   `json:"percent"`
	Bytes   int64 `json:"bytes"`
	Total   int64 `json:"total"`
}

type githubRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
	Body    string `json:"body"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
		Size               int64  `json:"size"`
	} `json:"assets"`
}
