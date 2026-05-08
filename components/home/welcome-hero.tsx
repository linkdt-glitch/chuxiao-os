/**
 * 首页欢迎 hero —— 紧凑版（一行式横向布局）。
 * 左边：暖光太阳图标 + 时段问候 + 用户名
 * 右边：组织名 + 日期 + 在线指示
 *
 * 动画全部 CSS keyframes，无 JS 状态。
 * 时间统一显示北京时间 (Asia/Shanghai)，避免服务端跑在 UTC 时区时差。
 */

import { formatBeijingDateTime, getBeijingHour } from "@/lib/utils/beijing-time";

const HOURLY_GREETING: Array<{ from: number; text: string }> = [
  { from: 5, text: "早上好" },
  { from: 11, text: "中午好" },
  { from: 13, text: "下午好" },
  { from: 18, text: "晚上好" },
  { from: 0, text: "深夜好" }
];

function greetForHour(h: number) {
  return [...HOURLY_GREETING].sort((a, b) => b.from - a.from).find((g) => h >= g.from)?.text ?? "你好";
}

export function WelcomeHero({
  userName,
  organizationName
}: {
  userName: string;
  organizationName: string;
}) {
  const now = new Date();
  const greeting = greetForHour(getBeijingHour(now));

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-amber-500/15"
      style={{
        background:
          "linear-gradient(110deg, rgba(251,146,60,0.10) 0%, rgba(251,191,36,0.06) 25%, rgba(8,12,28,0.92) 65%, rgba(4,8,20,0.95) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)"
      }}
    >
      {/* 太阳光晕（背景） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(251,146,60,0.20) 35%, rgba(251,146,60,0) 70%)",
          filter: "blur(6px)",
          animation: "home-sun-pulse 6s ease-in-out infinite"
        }}
      />
      {/* 漂浮粒子 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { left: "18%", top: "28%", size: 2, delay: "0s", dur: "9s" },
          { left: "46%", top: "62%", size: 2.5, delay: "1.4s", dur: "11s" },
          { left: "72%", top: "32%", size: 2, delay: "2.8s", dur: "10s" }
        ].map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: "rgba(251,191,36,0.85)",
              boxShadow: "0 0 6px rgba(251,191,36,0.6)",
              animation: `home-particle-drift ${p.dur} ease-in-out infinite`,
              animationDelay: p.delay
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div
            className="font-mono text-[10px] tracking-[0.26em] text-amber-300/70"
            style={{ animation: "home-greet-in 500ms cubic-bezier(0.2,0.8,0.2,1) both" }}
          >
            {organizationName.toUpperCase()}
          </div>
          <h1
            className="mt-1 truncate text-[22px] font-semibold tracking-tight text-slate-50 sm:text-[26px]"
            style={{ animation: "home-greet-in 600ms cubic-bezier(0.2,0.8,0.2,1) 80ms both" }}
          >
            <span
              className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-200 bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 14px rgba(251,191,36,0.30))" }}
            >
              {greeting}
            </span>
            <span className="ml-2 text-slate-200">{userName}</span>
            <span className="ml-2 text-[18px] text-slate-400 sm:text-[20px]">·</span>
            <span className="ml-2 text-[15px] font-normal text-slate-300 sm:text-[16px]">欢迎回家</span>
          </h1>
        </div>
        <div
          className="flex shrink-0 items-center gap-2 self-start rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 font-mono text-[11px] tabular-nums tracking-wider text-amber-200 sm:self-center"
          style={{ animation: "home-greet-in 700ms cubic-bezier(0.2,0.8,0.2,1) 200ms both" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.95)]" />
          {formatBeijingDateTime(now)}
        </div>
      </div>
    </section>
  );
}
