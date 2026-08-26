import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function Bone({ className }: { className?: string }) {
  return <div className={cn("skeleton-bone", className)} />;
}

export function MetricSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <Bone className="h-2.5 w-16" />
            <Bone className="h-7 w-24" />
            <Bone className="h-3 w-32" />
          </div>
          <Bone className="h-9 w-9 shrink-0 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricSkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <MetricSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 px-3 py-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-9 flex-1 rounded-xl" />
          <Bone className="hidden h-9 w-24 rounded-xl sm:block" />
          <Bone className="h-9 w-16 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex h-56 items-center justify-center">
      <div className="relative">
        <Bone className="h-40 w-40 rounded-full" />
        <div className="absolute inset-[28%] rounded-full bg-card" />
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-primary/8 via-card to-card px-6 py-6">
      <Bone className="h-2.5 w-20" />
      <Bone className="mt-3 h-4 w-64 max-w-full" />
      <div className="mt-5 flex flex-wrap gap-2">
        <Bone className="h-7 w-[4.5rem] rounded-full" />
        <Bone className="h-7 w-14 rounded-full" />
        <Bone className="h-7 w-20 rounded-full" />
        <Bone className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function FilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {["w-12", "w-16", "w-20", "w-14"].map((w) => (
        <Bone key={w} className={cn("h-7 rounded-full", w)} />
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader>
        <Bone className="h-3.5 w-28" />
        <Bone className="h-2.5 w-48 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Bone key={i} className="h-11 w-full rounded-xl" />
        ))}
      </CardContent>
    </Card>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Bone className="h-2.5 w-16" />
        <Bone className="h-8 w-56 max-w-full" />
        <Bone className="h-3.5 w-72 max-w-full" />
      </div>
      <MetricSkeletonGrid count={4} />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Bone className="h-3.5 w-24" />
          </CardHeader>
          <CardContent>
            <ChartSkeleton />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Bone className="h-3.5 w-28" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={4} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
