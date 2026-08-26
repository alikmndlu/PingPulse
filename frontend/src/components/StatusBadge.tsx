import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TargetStatus } from "@/types";

const variants: Record<TargetStatus, "success" | "danger" | "warning" | "muted"> = {
  online: "success",
  offline: "danger",
  unknown: "warning",
  disabled: "muted",
};

const dots: Record<TargetStatus, string> = {
  online: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)] animate-pulseDot",
  offline: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.55)]",
  unknown: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  disabled: "bg-zinc-400",
};

export function StatusBadge({ status }: { status: TargetStatus | string }) {
  const key = (status || "unknown") as TargetStatus;
  const variant = variants[key] ?? "muted";
  const dot = dots[key] ?? dots.unknown;
  return (
    <Badge variant={variant} data-testid={`status-${key}`}>
      <span className={cn("me-1.5 inline-block h-1.5 w-1.5 rounded-full", dot)} />
      {statusLabel(key)}
    </Badge>
  );
}
