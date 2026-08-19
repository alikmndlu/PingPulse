package impex

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"pingpulse/internal/domain"
)

func ExportJSON(targets []domain.Target) (string, error) {
	items := make([]domain.TargetExport, 0, len(targets))
	for _, t := range targets {
		items = append(items, domain.TargetExport{
			Name: t.Name, Host: t.Host, Enabled: t.Enabled,
			Interval: t.Interval, Timeout: t.Timeout, RetryCount: t.RetryCount, RetryDelay: t.RetryDelay,
			Group: t.GroupName,
		})
	}
	b, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func ExportCSV(targets []domain.Target) (string, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"name", "host", "enabled", "interval", "timeout", "retryCount", "retryDelay", "group"})
	for _, t := range targets {
		_ = w.Write([]string{
			t.Name, t.Host, strconv.FormatBool(t.Enabled),
			strconv.Itoa(t.Interval), strconv.Itoa(t.Timeout),
			strconv.Itoa(t.RetryCount), strconv.Itoa(t.RetryDelay), t.GroupName,
		})
	}
	w.Flush()
	return buf.String(), w.Error()
}

func Parse(payload, format string) ([]domain.CreateTargetInput, error) {
	format = strings.ToLower(strings.TrimSpace(format))
	payload = strings.TrimSpace(payload)
	if payload == "" {
		return nil, domain.NewValidationError("payload", "import data is empty")
	}
	switch format {
	case "json":
		return parseJSON(payload)
	case "csv":
		return parseCSV(payload)
	default:
		return nil, domain.NewValidationError("format", "format must be json or csv")
	}
}

func parseJSON(payload string) ([]domain.CreateTargetInput, error) {
	var items []domain.TargetExport
	if err := json.Unmarshal([]byte(payload), &items); err != nil {
		var one domain.TargetExport
		if err2 := json.Unmarshal([]byte(payload), &one); err2 != nil {
			return nil, domain.NewValidationError("payload", "invalid JSON target list")
		}
		items = []domain.TargetExport{one}
	}
	out := make([]domain.CreateTargetInput, 0, len(items))
	for _, it := range items {
		out = append(out, exportToInput(it))
	}
	return out, nil
}

func parseCSV(payload string) ([]domain.CreateTargetInput, error) {
	r := csv.NewReader(strings.NewReader(payload))
	r.TrimLeadingSpace = true
	records, err := r.ReadAll()
	if err != nil {
		return nil, domain.NewValidationError("payload", "invalid CSV")
	}
	if len(records) == 0 {
		return nil, domain.NewValidationError("payload", "CSV is empty")
	}
	start := 0
	header := map[string]int{}
	if looksLikeHeader(records[0]) {
		for i, h := range records[0] {
			header[strings.ToLower(strings.TrimSpace(h))] = i
		}
		start = 1
	} else {
		header = map[string]int{"name": 0, "host": 1, "enabled": 2, "interval": 3, "timeout": 4, "retrycount": 5, "retrydelay": 6}
	}
	out := make([]domain.CreateTargetInput, 0)
	for i := start; i < len(records); i++ {
		row := records[i]
		name := col(row, header, "name")
		host := col(row, header, "host")
		if strings.TrimSpace(name) == "" && strings.TrimSpace(host) == "" {
			continue
		}
		it := domain.TargetExport{Name: name, Host: host, Enabled: true, Interval: 120, Timeout: 5, RetryCount: 3, RetryDelay: 2}
		if v := col(row, header, "enabled"); v != "" {
			it.Enabled = parseBool(v)
		}
		it.Interval = parseInt(col(row, header, "interval"), it.Interval)
		it.Timeout = parseInt(col(row, header, "timeout"), it.Timeout)
		it.RetryCount = parseInt(col(row, header, "retrycount"), it.RetryCount)
		it.RetryDelay = parseInt(col(row, header, "retrydelay"), it.RetryDelay)
		it.Group = col(row, header, "group")
		out = append(out, exportToInput(it))
	}
	if len(out) == 0 {
		return nil, domain.NewValidationError("payload", "no targets found in CSV")
	}
	return out, nil
}

func exportToInput(it domain.TargetExport) domain.CreateTargetInput {
	enabled := it.Enabled
	interval, timeout, retry, delay := it.Interval, it.Timeout, it.RetryCount, it.RetryDelay
	return domain.CreateTargetInput{
		Name: it.Name, Host: it.Host, Enabled: &enabled,
		Interval: &interval, Timeout: &timeout, RetryCount: &retry, RetryDelay: &delay,
		GroupID: strings.TrimSpace(it.Group),
	}
}

func looksLikeHeader(row []string) bool {
	joined := strings.ToLower(strings.Join(row, ","))
	return strings.Contains(joined, "host") || strings.Contains(joined, "name")
}

func col(row []string, header map[string]int, key string) string {
	i, ok := header[key]
	if !ok || i < 0 || i >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[i])
}

func parseBool(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func parseInt(v string, fallback int) int {
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func FormatError(i int, err error) string {
	return fmt.Sprintf("row %d: %s", i+1, err.Error())
}
