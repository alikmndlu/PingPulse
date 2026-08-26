import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { springSoft } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const tones = {
  default: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={springSoft}>
      <Card className="transition-shadow duration-300 hover:shadow-[0_8px_30px_-18px_hsl(var(--foreground)/0.35)]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
              <p className="mt-2 truncate font-mono text-[1.35rem] font-semibold tracking-tight">
                <MetricValue value={value} />
              </p>
              {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
            </div>
            <div className={cn("rounded-lg bg-muted/80 p-1.5", tones[tone])}>
              <Icon className="h-3.5 w-3.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MetricValue({ value }: { value: string | number }) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return <NumberFlow isolate value={value} />;
  }
  const text = String(value);
  const match = text.match(/^(-?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return <>{text}</>;
  const n = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return <>{text}</>;
  const decimals = match[1].includes(".") ? (match[1].split(".")[1]?.length ?? 1) : 0;
  return (
    <span className="inline-flex items-baseline">
      <NumberFlow isolate value={n} format={{ maximumFractionDigits: decimals, minimumFractionDigits: decimals }} />
      {match[2] ? <span>{match[2]}</span> : null}
    </span>
  );
}
