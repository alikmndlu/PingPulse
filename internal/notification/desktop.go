package notification

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"pingpulse/internal/domain"
)

type DesktopProvider struct{}

func NewDesktopProvider() *DesktopProvider {
	return &DesktopProvider{}
}

func (p *DesktopProvider) Name() string {
	return domain.ProviderDesktop
}

func (p *DesktopProvider) Send(ctx context.Context, n domain.Notification) error {
	title := n.Title
	if title == "" {
		title = "PingPulse"
	}
	body := n.Body
	if body == "" {
		body = fmt.Sprintf("%s is %s", n.TargetName, n.Status)
	}
	return notifyOS(ctx, title, body)
}

func notifyOS(ctx context.Context, title, body string) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		script := fmt.Sprintf(
			"[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $text = $template.GetElementsByTagName('text'); $text.Item(0).AppendChild($template.CreateTextNode(%s)) | Out-Null; $text.Item(1).AppendChild($template.CreateTextNode(%s)) | Out-Null; $toast = [Windows.UI.Notifications.ToastNotification]::new($template); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('PingPulse').Show($toast);",
			psQuote(title), psQuote(body),
		)
		cmd = exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command", script)
	case "darwin":
		script := fmt.Sprintf(`display notification %s with title %s`, osaQuote(body), osaQuote(title))
		cmd = exec.CommandContext(ctx, "osascript", "-e", script)
	default:
		cmd = exec.CommandContext(ctx, "notify-send", title, body)
	}
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("desktop notification failed")
	}
	return nil
}

func psQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

func osaQuote(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	return `"` + s + `"`
}
