import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

const COLORS = {
  online: "#34d399",
  offline: "#fb7185",
  unknown: "#fbbf24",
  disabled: "#64748b",
};

export function StatusDonut({
  online,
  offline,
  unknown,
  disabled,
}: {
  online: number;
  offline: number;
  unknown: number;
  disabled: number;
}) {
  const data = [
    { name: "Online", value: online, color: COLORS.online },
    { name: "Offline", value: offline, color: COLORS.offline },
    { name: "Unknown", value: unknown, color: COLORS.unknown },
    { name: "Disabled", value: disabled, color: COLORS.disabled },
  ].filter((d) => d.value > 0);
  const total = online + offline + unknown + disabled;
  const upPct = total > 0 ? Math.round((online / Math.max(online + offline + unknown, 1)) * 100) : 0;

  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data.length ? data : [{ name: "Empty", value: 1, color: "hsl(var(--muted))" }]} dataKey="value" innerRadius="68%" outerRadius="88%" paddingAngle={data.length > 1 ? 3 : 0} stroke="none">
            {(data.length ? data : [{ color: "hsl(var(--muted))" }]).map((d) => (
              <Cell key={d.color} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-mono text-3xl font-semibold tracking-tight">{total ? `${upPct}%` : "—"}</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">online</p>
      </div>
    </div>
  );
}
