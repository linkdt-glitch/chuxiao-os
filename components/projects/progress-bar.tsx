import { cn } from "@/lib/utils";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const progress = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-medium text-muted-foreground">{progress}%</span>
    </div>
  );
}
