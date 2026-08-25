package domain

import "testing"

func TestValidateHost(t *testing.T) {
	cases := []struct {
		in    string
		ok    bool
		want  string
	}{
		{"10.10.10.20", true, "10.10.10.20"},
		{"example.com", true, "example.com"},
		{"localhost", true, "localhost"},
		{"https://api.example.com/health", true, "api.example.com"},
		{"", false, ""},
		{"not a host", false, ""},
		{"javascript:alert(1)", false, ""},
	}
	for _, tc := range cases {
		host := NormalizeHost(tc.in)
		err := ValidateHost(tc.in)
		if tc.ok && err != nil {
			t.Fatalf("%q expected ok, got %v (normalized=%s)", tc.in, err, host)
		}
		if !tc.ok && err == nil {
			t.Fatalf("%q expected error", tc.in)
		}
		if tc.ok && tc.want != "" && host != tc.want {
			t.Fatalf("%q normalized=%s want=%s", tc.in, host, tc.want)
		}
	}
}

func TestValidateCreateTarget(t *testing.T) {
	interval, timeout, retry, delay := 120, 5, 3, 2
	enabled := true
	err := ValidateCreateTarget(CreateTargetInput{
		Name: "Production API", Host: "10.10.10.20", Enabled: &enabled,
		Interval: &interval, Timeout: &timeout, RetryCount: &retry, RetryDelay: &delay,
	})
	if err != nil {
		t.Fatal(err)
	}
	bad := 1
	if err := ValidateCreateTarget(CreateTargetInput{Name: "x", Host: "10.10.10.20", Interval: &bad}); err == nil {
		t.Fatal("expected interval validation error")
	}
}
