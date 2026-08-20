package domain

type ProbeType string

const (
	ProbeICMP ProbeType = "icmp"
	ProbeHTTP ProbeType = "http"
	ProbeTCP  ProbeType = "tcp"
)

func (p ProbeType) IsValid() bool {
	switch p {
	case ProbeICMP, ProbeHTTP, ProbeTCP, "":
		return true
	default:
		return false
	}
}

func NormalizeProbeType(p string) ProbeType {
	switch ProbeType(p) {
	case ProbeHTTP:
		return ProbeHTTP
	case ProbeTCP:
		return ProbeTCP
	default:
		return ProbeICMP
	}
}

func (p ProbeType) Label() string {
	switch NormalizeProbeType(string(p)) {
	case ProbeHTTP:
		return "HTTP"
	case ProbeTCP:
		return "TCP"
	default:
		return "ICMP"
	}
}
