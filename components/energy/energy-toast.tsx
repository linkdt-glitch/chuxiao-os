"use client";

import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import type { OrganizationEnergyEvent } from "@/lib/types/core";

export function EnergyToast({
  event,
  onDone
}: {
  event: OrganizationEnergyEvent | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!event) return;
    const timeout = window.setTimeout(onDone, 4200);
    return () => window.clearTimeout(timeout);
  }, [event, onDone]);

  if (!event) return null;

  return (
    <div className="fixed right-5 top-5 z-50 w-[min(360px,calc(100vw-2.5rem))] animate-energy-toast-in rounded-lg border border-white/80 bg-white/88 p-4 shadow-[0_22px_65px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 via-cyan-100 to-indigo-100 text-cyan-700">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-950">组织能量 +{event.energy_points}</div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{event.message}</p>
        </div>
      </div>
    </div>
  );
}
