"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import type { OrganizationEnergyEvent } from "@/lib/types/core";

export function FireworkCelebration({
  event,
  onDone
}: {
  event: OrganizationEnergyEvent | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!event) return;
    const timeout = window.setTimeout(onDone, 5200);
    return () => window.clearTimeout(timeout);
  }, [event, onDone]);

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/16 backdrop-blur-[2px]">
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 42 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-1.5 w-1.5 rounded-full animate-energy-firework"
            style={{
              left: `${8 + ((index * 19) % 86)}%`,
              top: `${12 + ((index * 23) % 68)}%`,
              backgroundColor: ["#fbbf24", "#22d3ee", "#a78bfa", "#34d399"][index % 4],
              animationDelay: `${(index % 12) * 120}ms`
            }}
          />
        ))}
      </div>
      <div className="relative w-[min(520px,calc(100vw-2rem))] rounded-xl border border-white/80 bg-white/90 p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={onDone}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-white hover:text-foreground"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-cyan-200 to-indigo-200 text-2xl shadow-[0_0_38px_rgba(14,165,233,0.28)]">
          ✦
        </div>
        <div className="text-lg font-semibold text-slate-950">重大成就完成</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.message}</p>
        <div className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
          组织能量 +{event.energy_points}
        </div>
      </div>
    </div>
  );
}
