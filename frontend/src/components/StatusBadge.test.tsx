import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/StatusBadge";
import { formatLatency, formatPercent, statusLabel } from "@/lib/format";

describe("StatusBadge", () => {
  it("renders online status", () => {
    render(<StatusBadge status="online" />);
    expect(screen.getByTestId("status-online")).toHaveTextContent("Online");
  });

  it("renders offline status", () => {
    render(<StatusBadge status="offline" />);
    expect(screen.getByTestId("status-offline")).toHaveTextContent("Offline");
  });
});

describe("format helpers", () => {
  it("formats latency", () => {
    expect(formatLatency(24)).toBe("24ms");
    expect(formatLatency(null)).toBe("—");
  });

  it("formats percent", () => {
    expect(formatPercent(99.12)).toBe("99.1%");
  });

  it("maps status labels", () => {
    expect(statusLabel("unknown")).toBe("Unknown");
  });
});
