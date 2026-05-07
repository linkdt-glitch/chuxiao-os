"use client";

import { useEffect } from "react";
import Image from "next/image";

/**
 * Sci-fi welcome overlay shown for ~2.5s after a successful login.
 *
 * Timeline:
 *   0.00s — backdrop fade-in + dot grid + 4 corner HUD brackets
 *   0.20s — horizontal scan line sweeps top → bottom
 *   0.30s — logo zoom-in (scale 0.5 → 1) with glow pulse
 *   0.50s — 3 orbiting particles around logo
 *   0.80s — main text "欢迎登录启明时刻" gradient + glow fade-in
 *   1.30s — subtitle "一起创造奇迹" letter-spaced fade-in
 *   1.70s — "SYS://ONLINE" status bar fade-in
 *   2.20s — start fade-out
 *   2.70s — onComplete() fires → caller redirects
 */
const HOLD_AFTER_FADE_IN_MS = 2200;
const FADE_OUT_MS = 500;
const TOTAL_MS = HOLD_AFTER_FADE_IN_MS + FADE_OUT_MS;

export function WelcomeOverlay({
  displayName,
  onComplete
}: {
  displayName?: string;
  onComplete: () => void;
}) {
  useEffect(() => {
    const fadeOutAt = setTimeout(() => {
      // CSS class swap done via inline style + setTimeout to avoid extra state
    }, HOLD_AFTER_FADE_IN_MS);
    const done = setTimeout(() => onComplete(), TOTAL_MS);
    return () => {
      clearTimeout(fadeOutAt);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(28,14,4,0.96) 0%, rgba(0,0,0,0.99) 70%)",
        backdropFilter: "blur(8px)",
        animation: `wo-overlay-life ${TOTAL_MS}ms ease-out forwards`
      }}
      aria-live="polite"
    >
      {/* Dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(249,115,22,0.20) 1px, transparent 1px)",
          backgroundSize: "26px 26px"
        }}
      />

      {/* Faint vertical glow column */}
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 w-[420px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(249,115,22,0.15) 0%, transparent 70%)"
        }}
      />

      {/* 4 corner HUD brackets */}
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <CornerBracket key={pos} pos={pos} />
      ))}

      {/* Horizontal scan line */}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{
          height: 2,
          background:
            "linear-gradient(90deg, transparent, rgba(249,115,22,0.95), transparent)",
          boxShadow:
            "0 0 18px rgba(249,115,22,0.7), 0 0 36px rgba(249,115,22,0.35)",
          animation: "wo-scan 1.6s cubic-bezier(0.2,0.8,0.2,1) 200ms"
        }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-7 text-center">
        {/* Sonar rings */}
        <div
          className="pointer-events-none absolute -top-6 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full"
          style={{
            border: "1px solid rgba(249,115,22,0.50)",
            animation: "wo-sonar 2.4s ease-out infinite"
          }}
        />
        <div
          className="pointer-events-none absolute -top-6 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full"
          style={{
            border: "1px solid rgba(249,115,22,0.30)",
            animation: "wo-sonar 2.4s ease-out 1.1s infinite"
          }}
        />

        {/* Logo + orbiting particles */}
        <div
          className="relative h-28 w-28"
          style={{ animation: "wo-logo-in 700ms cubic-bezier(0.2,0.8,0.2,1) 300ms backwards" }}
        >
          {/* Particle 1 — large bright */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 block h-2 w-2 rounded-full"
            style={{
              marginLeft: -4,
              marginTop: -4,
              background: "rgba(255,210,150,1)",
              boxShadow:
                "0 0 14px rgba(249,115,22,1), 0 0 28px rgba(249,115,22,0.55)",
              animation: "wo-orbit-lg 4s linear infinite"
            }}
          />
          {/* Particle 2 — medium */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full"
            style={{
              marginLeft: -3,
              marginTop: -3,
              background: "rgba(255,180,120,0.92)",
              boxShadow: "0 0 10px rgba(249,115,22,0.8)",
              animation: "wo-orbit-md 6s linear infinite reverse",
              animationDelay: "-2s"
            }}
          />
          {/* Particle 3 — small distant */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 block h-1 w-1 rounded-full"
            style={{
              marginLeft: -2,
              marginTop: -2,
              background: "rgba(255,200,140,0.78)",
              boxShadow: "0 0 8px rgba(249,115,22,0.55)",
              animation: "wo-orbit-sm 8s linear infinite",
              animationDelay: "-4s"
            }}
          />

          {/* Logo frame with breathing glow */}
          <div
            className="flex h-full w-full items-center justify-center rounded-2xl"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.30), rgba(2,4,10,0.96))",
              boxShadow:
                "0 0 50px rgba(249,115,22,0.55), 0 0 0 1px rgba(249,115,22,0.60)",
              animation: "wo-logo-glow 2.2s ease-in-out infinite"
            }}
          >
            <Image
              src="/brand/kairosmini-mark.svg"
              alt="启明时刻 OS"
              width={512}
              height={512}
              className="h-3/4 w-3/4 object-contain"
              priority
            />
          </div>
        </div>

        {/* Main headline — gradient + glow */}
        <h1
          className="bg-gradient-to-r from-orange-200 via-amber-100 to-orange-300 bg-clip-text text-3xl font-bold tracking-wide text-transparent sm:text-4xl"
          style={{
            animation: "wo-text-in 700ms cubic-bezier(0.2,0.8,0.2,1) 800ms backwards",
            filter: "drop-shadow(0 0 18px rgba(249,115,22,0.50))"
          }}
        >
          欢迎登录启明时刻{displayName ? `，${displayName}` : ""}
        </h1>

        {/* Subtitle — wide letter-spacing, neon */}
        <p
          className="-mt-2 font-mono text-base tracking-[0.4em] text-orange-300 sm:text-lg"
          style={{
            animation: "wo-text-in 700ms cubic-bezier(0.2,0.8,0.2,1) 1300ms backwards",
            textShadow:
              "0 0 14px rgba(249,115,22,0.65), 0 0 28px rgba(249,115,22,0.35)"
          }}
        >
          一起创造奇迹
        </p>

        {/* SYS status bar */}
        <div
          className="mt-3 flex items-center gap-3 font-mono text-[11px] tracking-[0.5em] text-orange-400/70"
          style={{
            animation: "wo-text-in 600ms cubic-bezier(0.2,0.8,0.2,1) 1700ms backwards"
          }}
        >
          <span
            className="h-px w-14"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(249,115,22,0.55))"
            }}
          />
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"
              style={{ boxShadow: "0 0 8px rgba(74,222,128,0.85)" }}
            />
            系统在线
          </span>
          <span
            className="h-px w-14"
            style={{
              background:
                "linear-gradient(90deg, rgba(249,115,22,0.55), transparent)"
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const isTop = pos.startsWith("t");
  const isLeft = pos.endsWith("l");
  return (
    <div
      className="pointer-events-none absolute h-14 w-14"
      style={{
        top: isTop ? 28 : undefined,
        bottom: isTop ? undefined : 28,
        left: isLeft ? 28 : undefined,
        right: isLeft ? undefined : 28,
        animation: `wo-bracket-${pos} 600ms cubic-bezier(0.2,0.8,0.2,1) 100ms backwards`
      }}
    >
      {/* Horizontal line */}
      <div
        className="absolute h-px w-14"
        style={{
          top: isTop ? 0 : "auto",
          bottom: isTop ? "auto" : 0,
          left: isLeft ? 0 : "auto",
          right: isLeft ? "auto" : 0,
          background: isLeft
            ? "linear-gradient(90deg, rgba(249,115,22,0.95), transparent)"
            : "linear-gradient(90deg, transparent, rgba(249,115,22,0.95))",
          boxShadow: "0 0 8px rgba(249,115,22,0.55)"
        }}
      />
      {/* Vertical line */}
      <div
        className="absolute h-14 w-px"
        style={{
          top: isTop ? 0 : "auto",
          bottom: isTop ? "auto" : 0,
          left: isLeft ? 0 : "auto",
          right: isLeft ? "auto" : 0,
          background: isTop
            ? "linear-gradient(180deg, rgba(249,115,22,0.95), transparent)"
            : "linear-gradient(180deg, transparent, rgba(249,115,22,0.95))",
          boxShadow: "0 0 8px rgba(249,115,22,0.55)"
        }}
      />
    </div>
  );
}
