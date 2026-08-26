import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { springSoft } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const tones = {
  default: {
    icon: "bg-primary/12 text-primary",
    glow: "",
  },
  success: {
    icon: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    glow: "shadow-[0_0_28px_-12px_rgba(16,185,129,0.55)]",
  },
  danger: {
    icon: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    glow: "shadow-[0_0_28px_-12px_rgba(244,63,94,0.5)]",
  },
  warning: {
    icon: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    glow: "shadow-[0_0_28px_-12px_rgba(245,158,11,0.45)]",
  },
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
  const reduce = useReducedMotion();
  const look = tones[tone];
  return (
    <motion.div className="h-full" whileHover={reduce ? undefined : { y: -3 }} transition={springSoft}>
      <Card className={cn("flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[0_16px_40px_-28px_hsl(var(--foreground)/0.5)]", look.glow)}>
        <CardContent className="relative flex h-full flex-col p-5">
          <div className="flex min-h-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <p className="mt-2 truncate font-mono text-[1.45rem] font-semibold tracking-tight">
                <MetricValue value={value} />
              </p>
              <p className="mt-1.5 h-4 truncate whitespace-nowrap text-xs leading-4 text-muted-foreground" title={hint}>
                {hint || "\u00a0"}
              </p>
            </div>
            <motion.div
              className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", look.icon)}
              whileHover={reduce ? undefined : { rotate: -8, scale: 1.08 }}
              transition={springSoft}
            >
              <Icon className="h-4 w-4" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MetricValue({ value }: { value: string | number }) {
  const reduce = useReducedMotion();
  const [live, setLive] = useState(false);
  useEffect(() => {
    setLive(true);
  }, []);

  const flow = {
    animated: live && !reduce,
    transformTiming: { duration: reduce ? 0 : 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)" as const },
    spinTiming: { duration: reduce ? 0 : 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)" as const },
    opacityTiming: { duration: reduce ? 0 : 140, easing: "cubic-bezier(0.16, 1, 0.3, 1)" as const },
  };

  if (typeof value === "number" && Number.isFinite(value)) {
    return <NumberFlow isolate value={value} {...flow} />;
  }
  const text = String(value);
  const match = text.match(/^(-?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return <>{text}</>;
  const n = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return <>{text}</>;
  const decimals = match[1].includes(".") ? (match[1].split(".")[1]?.length ?? 1) : 0;
  return (
    <span className="inline-flex items-baseline">
      <NumberFlow isolate value={n} format={{ maximumFractionDigits: decimals, minimumFractionDigits: decimals }} {...flow} />
      {match[2] ? <span>{match[2]}</span> : null}
    </span>
  );
}
