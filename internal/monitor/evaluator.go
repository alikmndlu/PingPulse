package monitor

import "pingpulse/internal/domain"

type Evaluation struct {
	Status               domain.TargetStatus
	ConsecutiveFailures  int
	ConsecutiveSuccesses int
	Transition           string
}

func Evaluate(prev domain.TargetStatus, failures, successes, failThreshold, recoveryThreshold int, pingOK bool) Evaluation {
	if failThreshold < 1 {
		failThreshold = 1
	}
	if recoveryThreshold < 1 {
		recoveryThreshold = 1
	}
	if prev == domain.StatusDisabled {
		return Evaluation{Status: domain.StatusDisabled, ConsecutiveFailures: failures, ConsecutiveSuccesses: successes}
	}

	if pingOK {
		successes++
		failures = 0
		if prev == domain.StatusOffline {
			if successes >= recoveryThreshold {
				return Evaluation{
					Status:               domain.StatusOnline,
					ConsecutiveFailures:  0,
					ConsecutiveSuccesses: successes,
					Transition:           "recovery",
				}
			}
			return Evaluation{
				Status:               domain.StatusOffline,
				ConsecutiveFailures:  0,
				ConsecutiveSuccesses: successes,
			}
		}
		if prev == domain.StatusUnknown && successes < recoveryThreshold {
			return Evaluation{
				Status:               domain.StatusUnknown,
				ConsecutiveFailures:  0,
				ConsecutiveSuccesses: successes,
			}
		}
		return Evaluation{
			Status:               domain.StatusOnline,
			ConsecutiveFailures:  0,
			ConsecutiveSuccesses: successes,
		}
	}

	failures++
	successes = 0
	if failures >= failThreshold {
		trans := ""
		if prev != domain.StatusOffline {
			trans = "offline"
		}
		return Evaluation{
			Status:               domain.StatusOffline,
			ConsecutiveFailures:  failures,
			ConsecutiveSuccesses: 0,
			Transition:           trans,
		}
	}
	status := prev
	if status == "" {
		status = domain.StatusUnknown
	}
	return Evaluation{
		Status:               status,
		ConsecutiveFailures:  failures,
		ConsecutiveSuccesses: 0,
	}
}
