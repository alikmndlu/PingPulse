import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Radio } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Switch } from "@/components/ui/switch";
import { TableSkeleton } from "@/components/app/Skeleton";
import { appleEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1320px] space-y-8">{children}</div>;
}

export function PageHeader({
  kicker,
  title,
  description,
  children,
}: {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {kicker ? (
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.56, ease: appleEase }}
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary"
          >
            {kicker}
          </motion.p>
        ) : null}
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.64, delay: reduce ? 0 : 0.06, ease: appleEase }}
          className="text-[1.65rem] font-semibold tracking-[-0.03em] text-foreground"
        >
          {title}
        </motion.h1>
        {description ? (
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.64, delay: reduce ? 0 : 0.12, ease: appleEase }}
            className="max-w-2xl text-sm leading-relaxed text-muted-foreground"
          >
            {description}
          </motion.p>
        ) : null}
      </div>
      {children ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.56, delay: reduce ? 0 : 0.16, ease: appleEase }}
          className="flex shrink-0 flex-wrap items-center gap-2"
        >
          {children}
        </motion.div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon: Icon = Radio,
  action,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary"
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      <p className="text-sm font-medium tracking-tight text-foreground">{title}</p>
      {hint ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function RowsPlaceholder({ rows = 6 }: { rows?: number }) {
  return <TableSkeleton rows={rows} />;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
      <motion.span
        className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
        animate={reduce ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.85, 1.15, 0.85] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {label}
    </div>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/40 px-4 py-3 transition-colors duration-200 hover:bg-muted/40",
        checked && "border-primary/25 bg-primary/5",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
