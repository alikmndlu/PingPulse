import type { Target, TargetGroup } from "@/types";

export const GROUP_ALL = "all";
export const GROUP_NONE = "ungrouped";

export const GROUP_COLORS = ["#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#38bdf8", "#fb923c", "#94a3b8"];

export function filterTargets(targets: Target[], groupFilter: string): Target[] {
  if (groupFilter === GROUP_ALL) return targets;
  if (groupFilter === GROUP_NONE) return targets.filter((t) => !t.groupId);
  return targets.filter((t) => t.groupId === groupFilter);
}

export function countByGroup(targets: Target[], groups: TargetGroup[]): { id: string; name: string; color: string; total: number; online: number; offline: number }[] {
  const rows = groups.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color || "#22d3ee",
    total: 0,
    online: 0,
    offline: 0,
  }));
  const ungrouped = { id: GROUP_NONE, name: "Ungrouped", color: "#64748b", total: 0, online: 0, offline: 0 };
  for (const t of targets) {
    const row = t.groupId ? rows.find((g) => g.id === t.groupId) : ungrouped;
    if (!row) continue;
    row.total += 1;
    if (t.enabled && t.lastStatus === "online") row.online += 1;
    if (t.enabled && t.lastStatus === "offline") row.offline += 1;
  }
  const out = rows.filter((r) => r.total > 0);
  if (ungrouped.total > 0) out.push(ungrouped);
  return out;
}
