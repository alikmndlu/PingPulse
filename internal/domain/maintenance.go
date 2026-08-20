package domain

import "time"

type MaintenanceWindow struct {
	ID                    string    `json:"id"`
	Name                  string    `json:"name"`
	TargetID              string    `json:"targetId"`
	GroupID               string    `json:"groupId"`
	StartsAt              time.Time `json:"startsAt"`
	EndsAt                time.Time `json:"endsAt"`
	Reason                string    `json:"reason"`
	SuppressChecks        bool      `json:"suppressChecks"`
	SuppressNotifications bool      `json:"suppressNotifications"`
	Enabled               bool      `json:"enabled"`
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
	// Joined display fields
	TargetName string `json:"targetName"`
	GroupName  string `json:"groupName"`
	Active     bool   `json:"active"`
}

type CreateMaintenanceInput struct {
	Name                  string `json:"name"`
	TargetID              string `json:"targetId"`
	GroupID               string `json:"groupId"`
	StartsAt              string `json:"startsAt"`
	EndsAt                string `json:"endsAt"`
	Reason                string `json:"reason"`
	SuppressChecks        *bool  `json:"suppressChecks,omitempty"`
	SuppressNotifications *bool  `json:"suppressNotifications,omitempty"`
	Enabled               *bool  `json:"enabled,omitempty"`
}

type UpdateMaintenanceInput struct {
	Name                  *string `json:"name,omitempty"`
	TargetID              *string `json:"targetId,omitempty"`
	GroupID               *string `json:"groupId,omitempty"`
	StartsAt              *string `json:"startsAt,omitempty"`
	EndsAt                *string `json:"endsAt,omitempty"`
	Reason                *string `json:"reason,omitempty"`
	SuppressChecks        *bool   `json:"suppressChecks,omitempty"`
	SuppressNotifications *bool   `json:"suppressNotifications,omitempty"`
	Enabled               *bool   `json:"enabled,omitempty"`
}

func (w MaintenanceWindow) ScopeLabel() string {
	if w.TargetID != "" {
		if w.TargetName != "" {
			return w.TargetName
		}
		return "Target"
	}
	if w.GroupID != "" {
		if w.GroupName != "" {
			return "Group: " + w.GroupName
		}
		return "Group"
	}
	return "All targets"
}

func (w MaintenanceWindow) Covers(target Target, at time.Time) bool {
	if !w.Enabled {
		return false
	}
	if at.Before(w.StartsAt) || !at.Before(w.EndsAt) {
		return false
	}
	if w.TargetID != "" {
		return w.TargetID == target.ID
	}
	if w.GroupID != "" {
		return w.GroupID == target.GroupID
	}
	return true
}

type MaintenanceEffect struct {
	Active                bool
	SuppressChecks        bool
	SuppressNotifications bool
	Window                *MaintenanceWindow
}
