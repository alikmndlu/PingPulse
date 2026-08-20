export function probeLabel(type?: string): string {
  switch ((type || "icmp").toLowerCase()) {
    case "http":
      return "HTTP";
    case "tcp":
      return "TCP";
    default:
      return "ICMP";
  }
}

export function endpointLabel(t: {
  probeType?: string;
  host: string;
  httpUrl?: string;
  tcpPort?: number;
}): string {
  const probe = (t.probeType || "icmp").toLowerCase();
  if (probe === "http" && t.httpUrl) return t.httpUrl;
  if (probe === "tcp" && t.tcpPort) return `${t.host}:${t.tcpPort}`;
  return t.host;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 48) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

export function toLocalInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}
