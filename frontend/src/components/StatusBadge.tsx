import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { TargetStatus } from "@/types";

const variants: Record<TargetStatus, "success" | "danger" | "warning" | "muted"> = {
  online: "success",
  offline: "danger",
  unknown: "warning",
  disabled: "muted",
};

export function StatusBadge({ status }: { status: TargetStatus | string }) {
  const key = (status || "unknown") as TargetStatus;
  const variant = variants[key] ?? "muted";
  return (
    <Badge variant={variant} data-testid={`status-${key}`}>
      <span className="me-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(key)}
    </Badge>
  );
}
