import { parseDate } from "@/lib/format";

export function muteRemainingMs(until?: string | null): number {
  if (!until) return 0;
  const d = parseDate(until);
  if (!d) return 0;
  return Math.max(0, d.getTime() - Date.now());
}

export function isMuted(until?: string | null): boolean {
  return muteRemainingMs(until) > 0;
}

export function formatMuteRemaining(until?: string | null): string {
  const ms = muteRemainingMs(until);
  if (ms <= 0) return "";
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
