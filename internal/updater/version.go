package updater

import (
	"strconv"
	"strings"
)

// Version is the running build. Release CI overrides it with -ldflags.
var Version = "1.0.0"

const (
	GitHubOwner = "alikmndlu"
	GitHubRepo  = "PingPulse"
)

func DisplayVersion() string {
	v := strings.TrimSpace(Version)
	if v == "" {
		return "v0.0.0"
	}
	if v[0] != 'v' && v[0] != 'V' {
		return "v" + v
	}
	return v
}

func normalizeVersion(v string) string {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "v")
	v = strings.TrimPrefix(v, "V")
	if i := strings.IndexAny(v, "-+"); i >= 0 {
		v = v[:i]
	}
	return v
}

// Compare returns -1 if a < b, 0 if equal, 1 if a > b.
func Compare(a, b string) int {
	as := parseInts(normalizeVersion(a))
	bs := parseInts(normalizeVersion(b))
	n := len(as)
	if len(bs) > n {
		n = len(bs)
	}
	for i := 0; i < n; i++ {
		var av, bv int
		if i < len(as) {
			av = as[i]
		}
		if i < len(bs) {
			bv = bs[i]
		}
		if av < bv {
			return -1
		}
		if av > bv {
			return 1
		}
	}
	return 0
}

func parseInts(v string) []int {
	parts := strings.Split(v, ".")
	out := make([]int, 0, len(parts))
	for _, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil {
			n = 0
		}
		out = append(out, n)
	}
	if len(out) == 0 {
		return []int{0}
	}
	return out
}
