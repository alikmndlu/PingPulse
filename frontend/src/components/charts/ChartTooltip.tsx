export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-card/95 px-3 py-2 shadow-xl backdrop-blur">
      {label ? <p className="mb-1 font-mono text-[11px] text-muted-foreground">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={String(item.dataKey ?? item.name)} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color || "hsl(var(--primary))" }} />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ms-auto font-mono font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
