"use client";

import { Sunrise, X } from "lucide-react";
import type { OrganizationEnergyEvent } from "@/lib/types/core";

const motivations = [
  "今天不需要做很多事，只需要把最重要的一件事推进一步。",
  "伟大的公司不是一天建成的，但每天都可以更清晰一点。",
  "先完成一个小动作，飞轮就开始转动。",
  "记录越完整，判断越准确。",
  "不要追求忙碌，追求有效推进。",
  "今天让系统多记住一点，明天公司就会更聪明一点。",
  "每一次完成，都是组织能力的一次累积。",
  "让 AI 和人一起工作，让经验留在系统里。"
];

function pickMotivation() {
  const day = new Date().getDate();
  return motivations[day % motivations.length];
}

export function DailyMotivationCard({
  event,
  streakCount,
  onClose
}: {
  event: OrganizationEnergyEvent | null;
  streakCount: number;
  onClose: () => void;
}) {
  if (!event) return null;

  return (
    <div className="fixed inset-x-4 top-24 z-40 mx-auto w-[min(520px,calc(100vw-2rem))] animate-energy-card-in rounded-xl border border-white/80 bg-white/90 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-white hover:text-foreground"
        aria-label="关闭每日鼓励卡"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 via-cyan-100 to-white text-amber-600 shadow-[0_0_42px_rgba(251,191,36,0.30)]">
          <span className="absolute inset-1 rounded-2xl bg-white/40" />
          <Sunrise className="relative h-6 w-6" />
        </div>
        <div className="pr-8">
          <div className="text-sm font-semibold text-slate-950">早上好，今天让飞轮再转动一点。</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{pickMotivation()}</p>
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="rounded-lg border border-white/70 bg-white/60 px-3 py-2">连续登录 {streakCount || 1} 天</div>
            <div className="rounded-lg border border-white/70 bg-white/60 px-3 py-2">今日建议：完成一个小动作并让系统记住</div>
          </div>
        </div>
      </div>
    </div>
  );
}
