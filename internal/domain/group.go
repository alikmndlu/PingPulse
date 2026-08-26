package domain

import "time"

type TargetGroup struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"createdAt" ts_type:"string"`
	UpdatedAt time.Time `json:"updatedAt" ts_type:"string"`
}

const DefaultGroupColor = "#22d3ee"
