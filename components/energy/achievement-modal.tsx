"use client";

import { Award, X } from "lucide-react";
import { useEffect } from "react";
import type { UserAchievement } from "@/lib/types/core";
import { Badge } from "@/components/ui/badge";

const levelLabel: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum"
};

export function AchievementModal({
  achievement,
  onClose
}: {
  achievement: UserAchievement | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!achievement) return;
    const timeout = window.setTimeout(onClose, 6200);
    return () => window.clearTimeout(timeout);
  }, [achievement, onClose]);

  if (!achievement?.badge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/12 p-4 backdrop-blur-[2px]">
      <div className="relative w-[min(430px,100%)] animate-energy-modal-in rounded-xl border border-white/80 bg-white/92 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.20)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-white hover:text-foreground"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 via-cyan-100 to-indigo-100 text-amber-600 shadow-[0_0_38px_rgba(251,191,36,0.24)]">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">成就解锁</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">{achievement.badge.name}</div>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{achievement.badge.description}</p>
        <div className="mt-5 flex items-center justify-between">
          <Badge variant="warning">{levelLabel[achievement.badge.level] ?? achievement.badge.level}</Badge>
          <span className="font-mono text-sm text-cyan-700">+{achievement.badge.energy_points} energy</span>
        </div>
      </div>
    </div>
  );
}
