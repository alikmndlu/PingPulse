import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatPercent } from "@/lib/format";

export function ResultsDonut({ successful, failed, uptimePercent }: { successful: number; failed: number; uptimePercent: number }) {
  const data = [
    { name: "Success", value: successful, color: "#34d399" },
    { name: "Failure", value: failed, color: "#fb7185" },
  ].filter((d) => d.value > 0);
  const total = successful + failed;

  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data.length ? data : [{ name: "Empty", value: 1, color: "hsl(var(--muted))" }]} dataKey="value" innerRadius="70%" outerRadius="90%" paddingAngle={data.length > 1 ? 4 : 0} stroke="none">
            {(data.length ? data : [{ color: "hsl(var(--muted))" }]).map((d) => (
              <Cell key={d.color} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-mono text-2xl font-semibold">{total ? formatPercent(uptimePercent) : "—"}</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{total} checks</p>
      </div>
    </div>
  );
}
