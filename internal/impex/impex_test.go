package impex

import "testing"

func TestParseJSONAndCSV(t *testing.T) {
	items, err := Parse(`[{"name":"API","host":"10.10.10.20","enabled":true,"interval":120,"timeout":5,"retryCount":3,"retryDelay":2}]`, "json")
	if err != nil || len(items) != 1 || items[0].Host != "10.10.10.20" {
		t.Fatalf("json import: %+v %v", items, err)
	}
	csv := "name,host,enabled,interval,timeout,retryCount,retryDelay\nEdge,8.8.8.8,true,60,3,2,1\n"
	items, err = Parse(csv, "csv")
	if err != nil || len(items) != 1 || items[0].Name != "Edge" {
		t.Fatalf("csv import: %+v %v", items, err)
	}
}
