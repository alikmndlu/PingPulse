import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AvailabilityStrip({ points }: { points: Array<{ time: string; up: boolean }> }) {
  if (!points.length) {
    return <p className="flex h-full items-center text-sm text-muted-foreground">No samples yet.</p>;
  }
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex h-12 overflow-hidden rounded-full border border-border/70">
        {points.map((p, i) => (
          <Tooltip key={`${p.time}-${i}`}>
            <TooltipTrigger asChild>
              <span className={cn("h-full flex-1", p.up ? "bg-emerald-400/90 hover:bg-emerald-300" : "bg-rose-400/90 hover:bg-rose-300")} />
            </TooltipTrigger>
            <TooltipContent>
              {p.time} · {p.up ? "up" : "down"}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Older</span>
        <span>Now</span>
      </div>
    </div>
  );
}
