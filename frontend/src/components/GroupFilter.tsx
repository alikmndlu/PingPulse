import { cn } from "@/lib/utils";
import { GROUP_ALL, GROUP_NONE } from "@/lib/groups";
import type { Target, TargetGroup } from "@/types";

export function GroupFilter({
  groups,
  targets,
  value,
  onChange,
}: {
  groups: TargetGroup[];
  targets: Target[];
  value: string;
  onChange: (v: string) => void;
}) {
  const ungrouped = targets.filter((t) => !t.groupId).length;
  const chips = [
    { id: GROUP_ALL, label: "All", color: "", count: targets.length },
    ...groups.map((g) => ({
      id: g.id,
      label: g.name,
      color: g.color,
      count: targets.filter((t) => t.groupId === g.id).length,
    })),
    { id: GROUP_NONE, label: "Ungrouped", color: "#64748b", count: ungrouped },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips
        .filter((chip) => chip.id === GROUP_ALL || chip.count > 0)
        .map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              value === chip.id
                ? "border-primary/30 bg-primary/10 font-medium text-foreground"
                : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {chip.color ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.color }} /> : null}
            {chip.label}
            <span className="font-mono text-[10px] opacity-60">{chip.count}</span>
          </button>
        ))}
    </div>
  );
}

export function GroupBadge({ name, color }: { name?: string; color?: string }) {
  if (!name) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2 py-0.5 text-xs">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color || "hsl(var(--primary))" }} />
      {name}
    </span>
  );
}
