/**
 * Cockpit HUD primitives — small composable pieces used by the dashboard
 * to build a spaceship-cockpit aesthetic out of dark surfaces, brand-orange
 * accents, monospace telemetry labels and SVG gauges.
 *
 * Server components only (no useState / useEffect). All animation is CSS.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/** Corner-bracketed HUD frame. Wraps a section like a viewport. */
export function HudFrame({
  label,
  meta,
  tone = "default",
  className,
  bodyClassName,
  children
}: {
  label: string;
  meta?: React.ReactNode;
  tone?: "default" | "alert" | "success";
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const accent =
    tone === "alert"
      ? "rgba(239,68,68,0.5)"
      : tone === "success"
        ? "rgba(74,222,128,0.45)"
        : "rgba(249,115,22,0.55)";

  return (
    <div
      className={cn("relative rounded-xl scan-line-animated", className)}
      style={{
        background:
          "linear-gradient(180deg, rgba(8,12,28,0.92) 0%, rgba(4,8,20,0.88) 100%)",
        border: "1px solid rgba(249,115,22,0.14)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 40px rgba(0,0,0,0.45)",
        backdropFilter: "blur(20px) saturate(1.1)"
      }}
    >
      {/* corner brackets */}
      <span aria-hidden style={cornerStyle("tl", accent)} />
      <span aria-hidden style={cornerStyle("tr", accent)} />
      <span aria-hidden style={cornerStyle("bl", accent)} />
      <span aria-hidden style={cornerStyle("br", accent)} />

      {/* header */}
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-2"
        style={{ borderColor: "rgba(249,115,22,0.10)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <StatusLight tone={tone} />
          <span className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-orange-400/80">
            {label}
          </span>
        </div>
        {meta ? (
          <span className="shrink-0 font-mono text-[10px] tracking-[0.16em] text-slate-400">
            {meta}
          </span>
        ) : null}
      </div>

      {/* body */}
      <div className={cn("relative p-4", bodyClassName)}>{children}</div>
    </div>
  );
}

function cornerStyle(corner: "tl" | "tr" | "bl" | "br", color: string): React.CSSProperties {
  const size = 12;
  const base: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    pointerEvents: "none",
    zIndex: 2
  };
  if (corner === "tl") {
    return {
      ...base,
      top: -1,
      left: -1,
      borderTop: `1.5px solid ${color}`,
      borderLeft: `1.5px solid ${color}`,
      borderTopLeftRadius: 6
    };
  }
  if (corner === "tr") {
    return {
      ...base,
      top: -1,
      right: -1,
      borderTop: `1.5px solid ${color}`,
      borderRight: `1.5px solid ${color}`,
      borderTopRightRadius: 6
    };
  }
  if (corner === "bl") {
    return {
      ...base,
      bottom: -1,
      left: -1,
      borderBottom: `1.5px solid ${color}`,
      borderLeft: `1.5px solid ${color}`,
      borderBottomLeftRadius: 6
    };
  }
  return {
    ...base,
    bottom: -1,
    right: -1,
    borderBottom: `1.5px solid ${color}`,
    borderRight: `1.5px solid ${color}`,
    borderBottomRightRadius: 6
  };
}

export function StatusLight({
  tone = "default"
}: {
  tone?: "default" | "alert" | "success";
}) {
  const color =
    tone === "alert"
      ? "rgb(248,113,113)"
      : tone === "success"
        ? "rgb(74,222,128)"
        : "rgb(251,146,60)";
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{
        background: color,
        boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
        animation: "neon-dot-pulse 2s ease-in-out infinite"
      }}
    />
  );
}

/** Big number with monospace label above. The boss-facing core stat tile. */
export function Telemetry({
  label,
  value,
  unit,
  delta,
  tone = "default",
  helper,
  href
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: { value: number; suffix?: string } | null;
  tone?: "default" | "alert" | "success";
  helper?: string;
  href?: string;
}) {
  const valueGradient =
    tone === "alert"
      ? "from-red-200 via-red-300 to-red-400"
      : tone === "success"
        ? "from-emerald-200 via-emerald-300 to-emerald-400"
        : "from-white via-orange-100 to-orange-300";

  const content = (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-orange-400/70">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "bg-gradient-to-br bg-clip-text text-3xl font-bold tabular-nums tracking-tight text-transparent",
            valueGradient
          )}
          style={{ filter: "drop-shadow(0 0 16px rgba(249,115,22,0.22))" }}
        >
          {value}
        </span>
        {unit ? <span className="text-xs font-medium text-slate-400">{unit}</span> : null}
      </div>
      {delta ? (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-1 font-mono text-[11px] tabular-nums",
            delta.value >= 0 ? "text-emerald-300" : "text-red-300"
          )}
        >
          <span>{delta.value >= 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(delta.value).toLocaleString("zh-CN")}{delta.suffix ?? ""}</span>
        </div>
      ) : null}
      {helper ? (
        <div className="mt-2 text-[11px] leading-snug text-slate-500">{helper}</div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className="block transition-colors hover:text-orange-200">
        {content}
      </a>
    );
  }
  return <div>{content}</div>;
}

/** SVG ring gauge 0-100. */
export function RingGauge({
  value,
  size = 88,
  thickness = 7,
  label,
  tone = "default"
}: {
  value: number | null;
  size?: number;
  thickness?: number;
  label?: string;
  tone?: "default" | "alert" | "success";
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeValue = value === null ? 0 : Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - safeValue / 100);
  const accent =
    tone === "alert"
      ? "rgb(248,113,113)"
      : tone === "success"
        ? "rgb(74,222,128)"
        : "rgb(251,146,60)";

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="block -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={thickness}
          stroke="rgba(249,115,22,0.10)"
          fill="none"
        />
        {value !== null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={thickness}
            stroke={accent}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 6px ${accent})`,
              transition: "stroke-dashoffset 0.6s ease"
            }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="bg-gradient-to-br from-white via-orange-100 to-orange-300 bg-clip-text text-base font-bold tabular-nums text-transparent"
          style={{ filter: "drop-shadow(0 0 6px rgba(249,115,22,0.22))" }}
        >
          {value === null ? "—" : value}
        </span>
        {label ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Horizontal bar (single row). For TOP-N expense / revenue rankings. */
export function HBar({
  label,
  value,
  max,
  rightLabel,
  tone = "default"
}: {
  label: React.ReactNode;
  value: number;
  max: number;
  rightLabel?: React.ReactNode;
  tone?: "default" | "alert" | "success";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const accentFrom =
    tone === "alert"
      ? "rgba(239,68,68,0.85)"
      : tone === "success"
        ? "rgba(74,222,128,0.85)"
        : "rgba(249,115,22,0.85)";
  const accentTo =
    tone === "alert"
      ? "rgba(239,68,68,0.25)"
      : tone === "success"
        ? "rgba(74,222,128,0.25)"
        : "rgba(239,68,68,0.45)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <div className="min-w-0 truncate text-slate-300">{label}</div>
        {rightLabel ? (
          <div className="shrink-0 font-mono tabular-nums text-slate-400">{rightLabel}</div>
        ) : null}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{
          background: "rgba(8,13,28,0.7)",
          border: "1px solid rgba(249,115,22,0.10)"
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accentFrom}, ${accentTo})`,
            boxShadow: `0 0 8px ${accentFrom}`
          }}
        />
      </div>
    </div>
  );
}

/** 6-month income vs expense vertical mini-bars (no SVG, pure CSS). */
export function MonthlyMiniBars({
  data
}: {
  data: Array<{ label: string; income: number; expense: number }>;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-24 w-full items-end justify-center gap-0.5">
            <div
              className="w-1/2 rounded-t-sm"
              style={{
                height: `${(d.income / max) * 100}%`,
                background: "linear-gradient(180deg, rgba(74,222,128,0.85) 0%, rgba(74,222,128,0.25) 100%)",
                boxShadow: "0 0 6px rgba(74,222,128,0.35)"
              }}
              title={`收入 ${d.income.toLocaleString("zh-CN")}`}
            />
            <div
              className="w-1/2 rounded-t-sm"
              style={{
                height: `${(d.expense / max) * 100}%`,
                background: "linear-gradient(180deg, rgba(249,115,22,0.85) 0%, rgba(239,68,68,0.25) 100%)",
                boxShadow: "0 0 6px rgba(249,115,22,0.35)"
              }}
              title={`支出 ${d.expense.toLocaleString("zh-CN")}`}
            />
          </div>
          <div className="font-mono text-[10px] tracking-wide text-slate-500">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Horizontal segmented potential meter, like a ship power gauge. */
export function PotentialMeter({ value }: { value: number | null }) {
  const segments = 10;
  const filled = value === null ? 0 : Math.round((Math.max(0, Math.min(100, value)) / 100) * segments);
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: segments }).map((_, i) => {
        const isOn = i < filled;
        // Color shifts orange → red as it fills toward max.
        const color = i < 5 ? "rgba(74,222,128,0.85)" : i < 8 ? "rgba(251,191,36,0.9)" : "rgba(249,115,22,0.95)";
        return (
          <span
            key={i}
            className="block h-3 w-2 rounded-sm transition-colors"
            style={{
              background: isOn ? color : "rgba(8,13,28,0.6)",
              border: `1px solid ${isOn ? color : "rgba(249,115,22,0.10)"}`,
              boxShadow: isOn ? `0 0 6px ${color}` : "none"
            }}
          />
        );
      })}
    </div>
  );
}
