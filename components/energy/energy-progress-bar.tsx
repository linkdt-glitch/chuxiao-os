import { cn } from "@/lib/utils";

export function EnergyProgressBar({
  value,
  max = 40,
  label,
  className
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{value} 能量</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-white/75 bg-white/70 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 via-cyan-400 to-indigo-500 shadow-[0_0_18px_rgba(14,165,233,0.36)] transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
