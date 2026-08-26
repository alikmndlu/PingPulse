package domain

import (
	"math"
	"strings"
	"time"
)

type SlaTargetRow struct {
	TargetID                    string  `json:"targetId"`
	TargetName                  string  `json:"targetName"`
	Host                        string  `json:"host"`
	GroupName                   string  `json:"groupName"`
	UptimePercent               float64 `json:"uptimePercent"`
	TargetSlaPercent            float64 `json:"targetSlaPercent"`
	ActualDowntimeSec           int64   `json:"actualDowntimeSec"`
	ErrorBudgetRemainingPercent float64 `json:"errorBudgetRemainingPercent"`
	Status                      string  `json:"status"`
	MtbfHours                   float64 `json:"mtbfHours"`
	MttrMinutes                 float64 `json:"mttrMinutes"`
	OutageCount                 int     `json:"outageCount"`
}

type SlaReport struct {
	Period                    string         `json:"period"`
	SlaTarget                 float64        `json:"slaTarget"`
	From                      string         `json:"from"`
	To                        string         `json:"to"`
	OverallUptime             float64        `json:"overallUptime"`
	CompliantCount            int            `json:"compliantCount"`
	BreachedCount             int            `json:"breachedCount"`
	WarningCount              int            `json:"warningCount"`
	TotalErrorBudgetHours     float64        `json:"totalErrorBudgetHours"`
	ConsumedErrorBudgetHours  float64        `json:"consumedErrorBudgetHours"`
	Targets                   []SlaTargetRow `json:"targets"`
}

func BuildSlaReport(period string, slaTarget float64, from, to time.Time, targets []Target, incidents IncidentReport) SlaReport {
	if slaTarget <= 0 || slaTarget > 100 {
		slaTarget = 99.9
	}
	windowSec := to.Sub(from).Seconds()
	if windowSec < 1 {
		windowSec = 1
	}
	byID := map[string]IncidentTargetStat{}
	for _, st := range incidents.ByTarget {
		byID[st.TargetID] = st
	}
	report := SlaReport{
		Period:    period,
		SlaTarget: slaTarget,
		From:      from.UTC().Format(time.RFC3339),
		To:        to.UTC().Format(time.RFC3339),
		Targets:   []SlaTargetRow{},
	}
	allowedSec := (1 - slaTarget/100) * windowSec
	if allowedSec < 1 {
		allowedSec = 1
	}
	periodHours := windowSec / 3600
	var uptimeSum float64
	for _, t := range targets {
		st := byID[t.ID]
		uptime := 100.0
		if st.TargetID != "" {
			uptime = st.UptimePercent
		} else {
			st.TargetName = t.Name
			st.Host = t.Host
		}
		row := SlaTargetRow{
			TargetID:          t.ID,
			TargetName:        t.Name,
			Host:              t.Host,
			GroupName:         strings.TrimSpace(t.GroupName),
			UptimePercent:     round2(uptime),
			TargetSlaPercent:  slaTarget,
			ActualDowntimeSec: st.DowntimeSec,
			OutageCount:       st.Incidents,
		}
		if row.GroupName == "" {
			row.GroupName = "Ungrouped"
		}
		remaining := ((allowedSec - float64(st.DowntimeSec)) / allowedSec) * 100
		if remaining < 0 {
			remaining = 0
		}
		if remaining > 100 {
			remaining = 100
		}
		row.ErrorBudgetRemainingPercent = round2(remaining)
		if st.AverageMTTRSec > 0 {
			row.MttrMinutes = round2(float64(st.AverageMTTRSec) / 60)
		}
		if st.Incidents > 0 {
			row.MtbfHours = round2(periodHours / float64(st.Incidents))
		} else {
			row.MtbfHours = round2(periodHours)
		}
		switch {
		case uptime < slaTarget:
			row.Status = "breached"
			report.BreachedCount++
		case remaining < 20:
			row.Status = "warning"
			report.WarningCount++
		default:
			row.Status = "compliant"
			report.CompliantCount++
		}
		uptimeSum += uptime
		report.ConsumedErrorBudgetHours += float64(st.DowntimeSec) / 3600
		report.TotalErrorBudgetHours += allowedSec / 3600
		report.Targets = append(report.Targets, row)
	}
	if n := len(targets); n > 0 {
		report.OverallUptime = round2(uptimeSum / float64(n))
	} else {
		report.OverallUptime = 100
	}
	report.ConsumedErrorBudgetHours = round2(report.ConsumedErrorBudgetHours)
	report.TotalErrorBudgetHours = round2(report.TotalErrorBudgetHours)
	return report
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
