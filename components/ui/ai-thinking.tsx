"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * AI 思考中等待动画 — sci-fi 风格，跟欢迎动画 / 侧栏神经核心呼应。
 *
 * 视觉元素：
 *  - 中央 logo / 火花图标 + 发光呼吸
 *  - 5 颗轨道粒子（不同半径 / 速度 / 方向）
 *  - 同心扩散光环（sonar）
 *  - 文字循环切换"分析中..." → "思考最佳答案" → "组合推理结果" → "即将完成"
 *  - 数据条进度
 *
 * 用法：
 *   {loading ? <AIThinking label="AI 解析中" /> : null}
 *   {loading ? <AIThinking variant="compact" /> : null}  // 内联小尺寸
 */

const PHRASES = [
  "正在解析你的输入",
  "调用神经网络中",
  "组合最佳推理路径",
  "即将给出答案"
];

export function AIThinking({
  label,
  variant = "card",
  estimatedSeconds
}: {
  /** 顶部主标题，比如"AI 解析记账中" / "AI 思考中"。默认"AI 思考中"。 */
  label?: string;
  /** card：完整卡片（默认）；compact：内联小尺寸；inline：单行带粒子 */
  variant?: "card" | "compact" | "inline";
  /** 预估秒数显示（如 6 / 12 / 20） */
  estimatedSeconds?: number;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const phraseTimer = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
    }, 1800);
    const elapsedTimer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(phraseTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-xs text-orange-300">
        <span className="relative inline-block h-3 w-3">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: "rgba(249,115,22,0.9)",
              boxShadow: "0 0 8px rgba(249,115,22,0.8)",
              animation: "wo-logo-glow 1.4s ease-in-out infinite"
            }}
          />
        </span>
        {PHRASES[phraseIndex]}
        <DotDot />
      </span>
    );
  }

  const orbHeight = variant === "compact" ? 80 : 120;
  const containerPadding = variant === "compact" ? "p-4" : "p-6";

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-xl ${containerPadding}`}
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, rgba(8,13,28,0.65) 70%)",
        border: "1px solid rgba(249,115,22,0.28)",
        boxShadow:
          "0 0 30px rgba(249,115,22,0.10), inset 0 0 24px rgba(249,115,22,0.04)"
      }}
    >
      {/* Sweeping scan line */}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(249,115,22,0.7), transparent)",
          boxShadow: "0 0 12px rgba(249,115,22,0.5)",
          animation: "wo-scan 2.4s linear infinite"
        }}
      />

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(249,115,22,0.18) 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }}
      />

      {/* Orbital rig */}
      <div
        className="relative"
        style={{ width: orbHeight, height: orbHeight }}
      >
        {/* sonar rings */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: orbHeight,
            height: orbHeight,
            marginLeft: -orbHeight / 2,
            marginTop: -orbHeight / 2,
            border: "1px solid rgba(249,115,22,0.30)",
            animation: "wo-sonar 2s ease-out infinite"
          }}
        />
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: orbHeight,
            height: orbHeight,
            marginLeft: -orbHeight / 2,
            marginTop: -orbHeight / 2,
            border: "1px solid rgba(249,115,22,0.18)",
            animation: "wo-sonar 2s ease-out 0.9s infinite"
          }}
        />

        {/* center sparkle */}
        <div
          className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full"
          style={{
            width: orbHeight * 0.42,
            height: orbHeight * 0.42,
            marginLeft: -orbHeight * 0.21,
            marginTop: -orbHeight * 0.21,
            background:
              "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.45), rgba(2,4,10,0.96))",
            boxShadow:
              "0 0 30px rgba(249,115,22,0.55), 0 0 0 1px rgba(249,115,22,0.55)",
            animation: "wo-logo-glow 1.6s ease-in-out infinite"
          }}
        >
          <Sparkles
            className="text-orange-200"
            style={{
              width: orbHeight * 0.22,
              height: orbHeight * 0.22,
              filter: "drop-shadow(0 0 6px rgba(249,115,22,0.85))",
              animation: "wo-logo-in 600ms cubic-bezier(0.2,0.8,0.2,1) backwards"
            }}
          />
        </div>

        {/* 5 orbiting particles — same radius, different speeds + delays
            so they spread evenly around the orbit. Direction alternates. */}
        <Particle duration={3.5} size={6} delay={0} />
        <Particle duration={5} size={4} delay={-1} reverse />
        <Particle duration={4} size={5} delay={-2} />
        <Particle duration={7} size={3} delay={-3} reverse />
        <Particle duration={6} size={3.5} delay={-1.5} />
      </div>

      {/* Title + cycling phrase */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
        <div
          className="bg-gradient-to-r from-orange-200 via-amber-100 to-orange-300 bg-clip-text text-base font-semibold tracking-wide text-transparent"
          style={{ filter: "drop-shadow(0 0 12px rgba(249,115,22,0.40))" }}
        >
          {label ?? "AI 思考中"}
        </div>
        <div
          key={phraseIndex}
          className="font-mono text-[11px] tracking-[0.2em] text-orange-300/85"
          style={{
            textShadow: "0 0 10px rgba(249,115,22,0.45)",
            animation: "wo-text-in 350ms cubic-bezier(0.2,0.8,0.2,1) both"
          }}
        >
          {PHRASES[phraseIndex]}
          <DotDot />
        </div>
        {estimatedSeconds || elapsed > 0 ? (
          <div className="mt-1 font-mono text-[10px] tracking-wider text-slate-500">
            已用 {elapsed}s
            {estimatedSeconds ? ` / 预计 ${estimatedSeconds}s` : ""}
          </div>
        ) : null}
      </div>

      {/* Progress shimmer bar */}
      <div className="relative z-10 h-1 w-32 overflow-hidden rounded-full" style={{ background: "rgba(8,13,28,0.6)" }}>
        <div
          className="absolute h-full"
          style={{
            width: "40%",
            background:
              "linear-gradient(90deg, transparent, rgba(249,115,22,0.9), transparent)",
            animation: "wo-shimmer 1.4s cubic-bezier(0.4,0,0.2,1) infinite"
          }}
        />
      </div>
    </div>
  );
}

function Particle({
  duration,
  size,
  delay,
  reverse
}: {
  duration: number;
  size: number;
  delay: number;
  reverse?: boolean;
}) {
  return (
    <span
      className="pointer-events-none absolute left-1/2 top-1/2 block rounded-full"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        background: "rgba(255,210,150,0.95)",
        boxShadow: `0 0 ${size * 1.6}px rgba(249,115,22,0.9), 0 0 ${size * 3}px rgba(249,115,22,0.4)`,
        animation: `at-orbit ${duration}s linear ${reverse ? "reverse" : ""} infinite`,
        animationDelay: `${delay}s`
      }}
    />
  );
}

function DotDot() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 350);
    return () => clearInterval(t);
  }, []);
  return <span className="inline-block w-3">{dots}</span>;
}
