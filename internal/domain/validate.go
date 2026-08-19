package domain

import (
	"net"
	"regexp"
	"strings"
	"unicode"
)

var hostnameRE = regexp.MustCompile(`^(?i)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$`)

func NormalizeHost(host string) string {
	host = strings.TrimSpace(host)
	lower := strings.ToLower(host)
	if strings.Contains(lower, "://") {
		if !strings.HasPrefix(lower, "http://") && !strings.HasPrefix(lower, "https://") {
			return host
		}
		host = strings.TrimPrefix(host, "http://")
		host = strings.TrimPrefix(host, "https://")
		host = strings.TrimPrefix(host, "HTTP://")
		host = strings.TrimPrefix(host, "HTTPS://")
	}
	if i := strings.IndexAny(host, "/?#"); i >= 0 {
		host = host[:i]
	}
	if h, port, err := net.SplitHostPort(host); err == nil {
		validPort := true
		for _, r := range port {
			if r < '0' || r > '9' {
				validPort = false
				break
			}
		}
		if validPort {
			host = h
		}
	}
	return strings.TrimSpace(host)
}

func ValidateHost(host string) error {
	normalized := NormalizeHost(host)
	if normalized == "" {
		return NewValidationError("host", "host is required")
	}
	if strings.Contains(strings.ToLower(host), "://") && !strings.HasPrefix(strings.ToLower(strings.TrimSpace(host)), "http://") && !strings.HasPrefix(strings.ToLower(strings.TrimSpace(host)), "https://") {
		return NewValidationError("host", "host must be a valid IP address or hostname")
	}
	host = normalized
	if strings.ContainsAny(host, " \t\r\n") {
		return NewValidationError("host", "host must not contain whitespace")
	}
	if ip := net.ParseIP(host); ip != nil {
		return nil
	}
	if strings.EqualFold(host, "localhost") {
		return nil
	}
	if !hostnameRE.MatchString(host) || len(host) > 253 {
		return NewValidationError("host", "host must be a valid IP address or hostname")
	}
	return nil
}

func ValidateTargetName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return NewValidationError("name", "name is required")
	}
	if len(name) > 120 {
		return NewValidationError("name", "name must be 120 characters or fewer")
	}
	for _, r := range name {
		if unicode.IsControl(r) {
			return NewValidationError("name", "name contains invalid characters")
		}
	}
	return nil
}

func ValidatePositiveRange(field string, value, min, max int) error {
	if value < min || value > max {
		return NewValidationError(field, "value is out of the allowed range")
	}
	return nil
}

func ApplyTargetDefaults(in CreateTargetInput, settings Settings) CreateTargetInput {
	enabled := true
	if in.Enabled != nil {
		enabled = *in.Enabled
	}
	interval := settings.DefaultInterval
	if in.Interval != nil {
		interval = *in.Interval
	}
	timeout := settings.DefaultTimeout
	if in.Timeout != nil {
		timeout = *in.Timeout
	}
	retry := settings.DefaultRetry
	if in.RetryCount != nil {
		retry = *in.RetryCount
	}
	delay := settings.DefaultRetryDelay
	if in.RetryDelay != nil {
		delay = *in.RetryDelay
	}
	return CreateTargetInput{
		Name:       strings.TrimSpace(in.Name),
		Host:       NormalizeHost(in.Host),
		Enabled:    &enabled,
		Interval:   &interval,
		Timeout:    &timeout,
		RetryCount: &retry,
		RetryDelay: &delay,
		GroupID:    strings.TrimSpace(in.GroupID),
	}
}

func ValidateCreateTarget(in CreateTargetInput) error {
	if err := ValidateTargetName(in.Name); err != nil {
		return err
	}
	if err := ValidateHost(in.Host); err != nil {
		return err
	}
	if in.Interval != nil {
		if err := ValidatePositiveRange("interval", *in.Interval, 5, 86400); err != nil {
			return err
		}
	}
	if in.Timeout != nil {
		if err := ValidatePositiveRange("timeout", *in.Timeout, 1, 60); err != nil {
			return err
		}
	}
	if in.RetryCount != nil {
		if err := ValidatePositiveRange("retryCount", *in.RetryCount, 0, 10); err != nil {
			return err
		}
	}
	if in.RetryDelay != nil {
		if err := ValidatePositiveRange("retryDelay", *in.RetryDelay, 0, 60); err != nil {
			return err
		}
	}
	return nil
}

func ValidateGroupName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return NewValidationError("name", "group name is required")
	}
	if len(name) > 40 {
		return NewValidationError("name", "group name must be 40 characters or fewer")
	}
	for _, r := range name {
		if unicode.IsControl(r) {
			return NewValidationError("name", "group name contains invalid characters")
		}
	}
	return nil
}

func NormalizeGroupColor(color string) (string, error) {
	color = strings.TrimSpace(strings.ToLower(color))
	if color == "" {
		return DefaultGroupColor, nil
	}
	if len(color) != 7 || color[0] != '#' {
		return "", NewValidationError("color", "color must be a hex value like #22d3ee")
	}
	for _, r := range color[1:] {
		if (r < '0' || r > '9') && (r < 'a' || r > 'f') {
			return "", NewValidationError("color", "color must be a hex value like #22d3ee")
		}
	}
	return color, nil
}
