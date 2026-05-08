/**
 * 首页欢迎 hero —— 初晓主题：日出、暖光、欢迎回家。
 *
 * Server component；动画全部 CSS keyframes，无 JS 状态。
 */

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

function dateLabel(d: Date) {
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${m}.${day} · ${week}`;
}

export function WelcomeHero({
  userName,
  organizationName
}: {
  userName: string;
  organizationName: string;
}) {
  const now = new Date();
  const greeting = greetForHour(now.getHours());

  return (
    <section
      className="relative isolate mb-8 overflow-hidden rounded-3xl border border-amber-500/15"
      style={{
        background:
          "linear-gradient(160deg, rgba(251,146,60,0.10) 0%, rgba(251,191,36,0.06) 30%, rgba(8,12,28,0.92) 70%, rgba(4,8,20,0.95) 100%)",
        boxShadow:
          "0 24px 48px -16px rgba(251,146,60,0.15), inset 0 1px 0 rgba(255,255,255,0.04)"
      }}
    >
      {/* 太阳光晕（背景） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.55) 0%, rgba(251,146,60,0.25) 35%, rgba(251,146,60,0) 70%)",
          filter: "blur(8px)",
          animation: "home-sun-pulse 6s ease-in-out infinite"
        }}
      />
      {/* 朝霞光线 (subtle rays) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-4 h-44 w-44"
        style={{
          background:
            "conic-gradient(from 200deg, rgba(251,191,36,0.20) 0deg, transparent 50deg, rgba(251,146,60,0.18) 110deg, transparent 160deg, rgba(251,191,36,0.15) 220deg, transparent 280deg)",
          mask: "radial-gradient(circle at 50% 50%, transparent 35%, black 70%, transparent 100%)",
          WebkitMask:
            "radial-gradient(circle at 50% 50%, transparent 35%, black 70%, transparent 100%)",
          animation: "home-rays-spin 28s linear infinite"
        }}
      />
      {/* 漂浮粒子 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { left: "12%", top: "32%", size: 3, delay: "0s", dur: "9s" },
          { left: "28%", top: "68%", size: 2, delay: "1.4s", dur: "11s" },
          { left: "44%", top: "22%", size: 2.5, delay: "3.2s", dur: "10s" },
          { left: "62%", top: "78%", size: 2, delay: "0.7s", dur: "12s" },
          { left: "78%", top: "52%", size: 3, delay: "2.4s", dur: "8.5s" },
          { left: "90%", top: "30%", size: 2, delay: "4s", dur: "10.5s" }
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
              boxShadow: "0 0 8px rgba(251,191,36,0.65)",
              animation: `home-particle-drift ${p.dur} ease-in-out infinite`,
              animationDelay: p.delay
            }}
          />
        ))}
      </div>

      {/* 内容 */}
      <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
        <div
          className="font-mono text-[11px] font-medium tracking-[0.28em] text-amber-300/70"
          style={{ animation: "home-greet-in 600ms cubic-bezier(0.2,0.8,0.2,1) both" }}
        >
          {organizationName.toUpperCase()}
        </div>
        <h1
          className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-[44px] sm:leading-[1.15]"
          style={{ animation: "home-greet-in 700ms cubic-bezier(0.2,0.8,0.2,1) 120ms both" }}
        >
          <span
            className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-200 bg-clip-text text-transparent"
            style={{ filter: "drop-shadow(0 0 18px rgba(251,191,36,0.30))" }}
          >
            欢迎回家
          </span>
          <span className="ml-3 text-slate-200">{userName}</span>
        </h1>
        <p
          className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-300"
          style={{ animation: "home-greet-in 800ms cubic-bezier(0.2,0.8,0.2,1) 240ms both" }}
        >
          {greeting}，新的一天又从你这里开始。这里是大家共同的方向：使命、愿景、价值观、近期目标，和最近的公司动态。
        </p>
        <div
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 font-mono text-[11px] tabular-nums tracking-wider text-amber-200"
          style={{ animation: "home-greet-in 900ms cubic-bezier(0.2,0.8,0.2,1) 360ms both" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.95)]" />
          {dateLabel(now)}
        </div>
      </div>
    </section>
  );
}
