/**
 * Executive Dashboard primitives — a calm, modern, magazine-style set of
 * components inspired by Mercury Bank, Linear, Stripe and Ramp dashboards.
 *
 * Design principles:
 *  - Type-first hierarchy: big numbers, restrained labels.
 *  - Single warm-amber accent used sparingly on CTAs and key signals.
 *  - Soft elevation (subtle shadow + 1px low-opacity border) instead of
 *    decorative chrome (no corner brackets, scan lines, neon glows).
 *  - Generous whitespace; cards breathe.
 *
 * All components are server-renderable (no useState / useEffect). Sparklines
 * and ring/bar gauges render as inline SVG.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────── Surfaces ────────────────────────── */

/** Standard executive card — soft elevation, no aggressive borders. */
export function ExecCard({
  className,
  children,
  as: Tag = "section"
}: {
  className?: string;
  children: React.ReactNode;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-white/[0.06] bg-white/[0.025]",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-24px_rgba(0,0,0,0.55)]",
        "backdrop-blur-md",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** Card section header — small label + optional right-aligned meta. */
export function CardHead({
  title,
  meta,
  hint,
  cta
}: {
  title: string;
  meta?: React.ReactNode;
  hint?: React.ReactNode;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-2">
      <div className="min-w-0">
        <h3 className="truncate text-[13px] font-semibold tracking-tight text-slate-200">
          {title}
        </h3>
        {hint ? (
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{hint}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {meta ? (
          <span className="text-[11px] tabular-nums text-slate-500">{meta}</span>
        ) : null}
        {cta ? (
          <Link
            href={cta.href}
            className="group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-amber-300/85 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
          >
            {cta.label}
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────────────── Today's Brief ────────────────────────── */

/**
 * The hero band at the top: greeting + AI-curated headline.
 * Calm, prose-style — no chrome.
 */
export function TodayBrief({
  greeting,
  dateString,
  headline,
  detail,
  cta,
  tone = "default"
}: {
  greeting: string;
  dateString: string;
  headline: string;
  detail?: string;
  cta?: { label: string; href: string };
  tone?: "default" | "good" | "warn" | "alert";
}) {
  const dot = {
    default: "bg-slate-400",
    good: "bg-emerald-400",
    warn: "bg-amber-400",
    alert: "bg-red-400"
  }[tone];

  return (
    <section className="mb-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-[28px]">
          {greeting}
        </div>
        <div className="font-mono text-[11px] tracking-wider text-slate-500">
          {dateString}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-relaxed text-slate-100">
              {headline}
            </p>
            {detail ? (
              <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
                {detail}
              </p>
            ) : null}
          </div>
          {cta ? (
            <Link
              href={cta.href}
              className="group inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-amber-500/15 px-3 py-1.5 text-[12px] font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
            >
              {cta.label}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Hero Metric ────────────────────────── */

/**
 * The big-number hero metric card. Used in the top row.
 * - Title (small)
 * - Big number (prominent, optionally with unit)
 * - Delta (colored chip with arrow)
 * - Footer: helper text + optional sparkline / progress bar / link
 */
export function HeroMetric({
  label,
  value,
  unit,
  tone = "default",
  delta,
  helper,
  visual,
  href
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "good" | "bad" | "warn";
  delta?: { value: string; direction: "up" | "down" | "flat"; tone?: "good" | "bad" | "neutral" };
  helper?: React.ReactNode;
  visual?: React.ReactNode;
  href?: string;
}) {
  const valueColor = {
    default: "text-slate-50",
    good: "text-emerald-300",
    bad: "text-rose-300",
    warn: "text-amber-300"
  }[tone];

  const Wrapper: React.ElementType = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <ExecCard className="group transition-colors hover:border-white/[0.10]">
      <Wrapper
        {...wrapperProps}
        className="block px-5 pb-5 pt-5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-slate-500">
            {label}
          </span>
          {delta ? <DeltaChip {...delta} /> : null}
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className={cn("text-[40px] font-semibold leading-none tracking-tight tabular-nums sm:text-[44px]", valueColor)}>
            {value}
          </span>
          {unit ? (
            <span className="text-[15px] font-medium text-slate-400">{unit}</span>
          ) : null}
        </div>
        {helper ? (
          <div className="mt-3 text-[12px] leading-relaxed text-slate-400">
            {helper}
          </div>
        ) : null}
        {visual ? <div className="mt-4">{visual}</div> : null}
      </Wrapper>
    </ExecCard>
  );
}

/** Small inline delta chip (▲ +12% / ▼ -3%). */
export function DeltaChip({
  value,
  direction,
  tone = "neutral"
}: {
  value: string;
  direction: "up" | "down" | "flat";
  tone?: "good" | "bad" | "neutral";
}) {
  const palette = {
    good: "text-emerald-300 bg-emerald-500/10",
    bad: "text-rose-300 bg-rose-500/10",
    neutral: "text-slate-300 bg-white/5"
  }[tone];
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "·";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums", palette)}>
      <span aria-hidden>{arrow}</span>
      {value}
    </span>
  );
}

/* ────────────────────────── Sparkline ────────────────────────── */

/**
 * Inline SVG sparkline.
 * - `data` is an array of numbers (any range, will be normalized).
 * - Soft gradient under the line.
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  tone = "amber"
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: "amber" | "emerald" | "rose" | "slate";
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d - min) / range) * height;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const stroke = {
    amber: "#fbbf24",
    emerald: "#34d399",
    rose: "#fb7185",
    slate: "#94a3b8"
  }[tone];
  const fillId = `sparkline-fill-${tone}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block overflow-visible">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      {/* end dot */}
      {points.length ? (
        <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={2.4} fill={stroke} />
      ) : null}
    </svg>
  );
}

/* ────────────────────────── Runway gauge ────────────────────────── */

/**
 * Cash runway visualization — soft horizontal bar with month markers.
 * - `months` actual runway (or null when not derivable)
 * - target reference at 6 months (the safe baseline)
 */
export function RunwayBar({
  months,
  cap = 12
}: {
  months: number | null;
  cap?: number;
}) {
  if (months === null) {
    return (
      <div className="text-[11px] text-slate-500">需积累 ≥3 个月支出数据后估算</div>
    );
  }
  const pct = Math.min(100, (months / cap) * 100);
  const tone = months < 3 ? "rose" : months < 6 ? "amber" : "emerald";
  const fill = { rose: "#fb7185", amber: "#fbbf24", emerald: "#34d399" }[tone];
  return (
    <div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, background: fill, boxShadow: `0 0 12px ${fill}80` }}
        />
        {/* 6-month safe-line marker */}
        <div
          className="absolute inset-y-0 w-px bg-white/[0.20]"
          style={{ left: `${(6 / cap) * 100}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-500">
        <span>0</span>
        <span className="text-slate-400">6 月安全线</span>
        <span>{cap}+</span>
      </div>
    </div>
  );
}

/* ────────────────────────── Bar pair (income/expense by month) ────────────────────────── */

export function MonthBars({
  data
}: {
  data: Array<{ label: string; income: number; expense: number }>;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const inPct = (d.income / max) * 100;
        const exPct = (d.expense / max) * 100;
        return (
          <div key={d.label} className="grid grid-cols-[36px_1fr] items-center gap-3">
            <div className="font-mono text-[11px] tabular-nums text-slate-500">{d.label}</div>
            <div className="space-y-1">
              <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${inPct}%`, background: "linear-gradient(90deg, #34d399 0%, #6ee7b7 100%)" }}
                />
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${exPct}%`, background: "linear-gradient(90deg, #fb923c 0%, #fbbf24 100%)" }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────── Ranked list rows ────────────────────────── */

export function RankRow({
  rank,
  primary,
  primaryHint,
  secondary,
  bar,
  href
}: {
  rank: number;
  primary: React.ReactNode;
  primaryHint?: React.ReactNode;
  secondary: React.ReactNode;
  bar?: { value: number; max: number; tone?: "amber" | "emerald" | "rose" };
  href?: string;
}) {
  const Wrapper: React.ElementType = href ? Link : "div";
  const wrapperProps = href ? { href } : {};
  const fill = bar
    ? { amber: "#fbbf24", emerald: "#34d399", rose: "#fb7185" }[bar.tone ?? "amber"]
    : undefined;
  const pct = bar ? Math.min(100, (bar.value / Math.max(1, bar.max)) * 100) : 0;

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "block rounded-xl px-3 py-2.5 transition-colors",
        href ? "hover:bg-white/[0.04]" : ""
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
            {String(rank).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-slate-100">{primary}</div>
            {primaryHint ? (
              <div className="mt-0.5 truncate text-[11px] text-slate-500">{primaryHint}</div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right text-[14px] font-semibold tabular-nums text-slate-100">
          {secondary}
        </div>
      </div>
      {bar ? (
        <div className="ml-8 mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: fill }}
          />
        </div>
      ) : null}
    </Wrapper>
  );
}

/* ────────────────────────── Decision card ────────────────────────── */

export function DecisionCard({
  severity,
  title,
  judgment,
  action,
  metric
}: {
  severity: "success" | "info" | "warning" | "danger";
  title: string;
  judgment: string;
  action: string;
  metric?: string;
}) {
  const palette = {
    success: { dot: "bg-emerald-400", label: "稳健", labelStyle: "text-emerald-300 bg-emerald-500/10" },
    info: { dot: "bg-sky-400", label: "提醒", labelStyle: "text-sky-300 bg-sky-500/10" },
    warning: { dot: "bg-amber-400", label: "关注", labelStyle: "text-amber-300 bg-amber-500/10" },
    danger: { dot: "bg-rose-400", label: "警示", labelStyle: "text-rose-300 bg-rose-500/10" }
  }[severity];

  return (
    <ExecCard className="flex flex-col">
      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", palette.labelStyle)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", palette.dot)} />
            {palette.label}
          </span>
          {metric ? (
            <span className="font-mono text-[10px] tabular-nums text-slate-500">{metric}</span>
          ) : null}
        </div>
        <h4 className="mt-3 text-[15px] font-semibold leading-snug text-slate-100">
          {title}
        </h4>
        <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-slate-400">
          {judgment}
        </p>
        <div className="mt-3 border-t border-white/[0.05] pt-3 text-[12px] font-medium text-amber-300/90">
          → {action}
        </div>
      </div>
    </ExecCard>
  );
}

/* ────────────────────────── Mini alert pill ────────────────────────── */

export function AlertPill({
  icon: Icon,
  label,
  value,
  href,
  tone = "default"
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  href: string;
  tone?: "default" | "alert" | "ok";
}) {
  const numericValue = typeof value === "number" ? value : 0;
  const isHot = tone === "alert" || numericValue > 0;
  const tonePalette = isHot
    ? { dot: "bg-amber-400", text: "text-amber-200", value: "text-amber-200" }
    : { dot: "bg-slate-600", text: "text-slate-300", value: "text-slate-400" };

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 backdrop-blur-md transition-colors",
        "hover:border-white/[0.12] hover:bg-white/[0.04]"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tonePalette.dot)} />
        <Icon className={cn("h-4 w-4 shrink-0", tonePalette.text)} />
        <span className="truncate text-[13px] text-slate-300">{label}</span>
      </div>
      <span className={cn("shrink-0 text-[16px] font-semibold tabular-nums", tonePalette.value)}>
        {value}
      </span>
    </Link>
  );
}

/* ────────────────────────── Inline mini-stat ────────────────────────── */

export function InlineStat({
  label,
  value,
  tone
}: {
  label: string;
  value: React.ReactNode;
  tone?: "good" | "bad" | "warn";
}) {
  const color =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-rose-300"
        : tone === "warn"
          ? "text-amber-300"
          : "text-slate-100";
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className={cn("mt-0.5 text-[14px] font-semibold tabular-nums", color)}>
        {value}
      </div>
    </div>
  );
}
