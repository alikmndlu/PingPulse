import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Switch } from "@/components/ui/switch";
import { useLaunchDone } from "@/components/app/LaunchScreen";
import { appleEase } from "@/lib/motion";

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1320px] space-y-8">{children}</div>;
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const launched = useLaunchDone();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={launched ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.5, ease: appleEase }}
          className="text-[1.3125rem] font-semibold tracking-tight text-foreground"
        >
          {title}
        </motion.h1>
        {description ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={launched ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.55, ease: appleEase, delay: launched ? 0.05 : 0 }}
            className="max-w-2xl text-sm leading-relaxed text-muted-foreground"
          >
            {description}
          </motion.p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-500 text-sm font-medium text-foreground">
        {title}
      </p>
      {hint ? (
        <p className="mt-1.5 max-w-sm animate-in fade-in slide-in-from-bottom-1 fill-mode-both text-sm leading-relaxed text-muted-foreground duration-700">
          {hint}
        </p>
      ) : null}
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
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/40 px-4 py-3 transition-colors duration-200 hover:bg-muted/40">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
