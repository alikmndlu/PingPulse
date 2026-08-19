import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1) return "<1ms";
  return `${Math.round(ms)}ms`;
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseDate(value);
  if (!d) return "—";
  return format(d, "HH:mm:ss");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseDate(value);
  if (!d) return "—";
  return format(d, "yyyy-MM-dd HH:mm:ss");
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "never";
  const d = parseDate(value);
  if (!d) return "never";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function parseDate(value: string): Date | null {
  try {
    const d = parseISO(value);
    if (Number.isNaN(d.getTime())) {
      const fallback = new Date(value);
      return Number.isNaN(fallback.getTime()) ? null : fallback;
    }
    return d;
  } catch {
    return null;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    case "unknown":
      return "Unknown";
    case "disabled":
      return "Disabled";
    default:
      return status;
  }
}
