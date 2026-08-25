package domain

type TargetStatus string

const (
	StatusOnline   TargetStatus = "online"
	StatusOffline  TargetStatus = "offline"
	StatusUnknown  TargetStatus = "unknown"
	StatusDisabled TargetStatus = "disabled"
)

func (s TargetStatus) String() string {
	return string(s)
}

func (s TargetStatus) IsValid() bool {
	switch s {
	case StatusOnline, StatusOffline, StatusUnknown, StatusDisabled:
		return true
	default:
		return false
	}
}
