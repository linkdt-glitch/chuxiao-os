"use client";

import { useEffect, useState } from "react";
import { Package, Truck } from "lucide-react";

/**
 * "正在拼命搬运" 上传中动画。
 *
 * 视觉：暗色卡片 + 一辆卡车在中间轻微颠簸 + 4 个包裹小方块从左飞到右（不同延迟）+
 * 文字"正在上传数据..." 配 dot 动画 + 已用秒数。
 */
const PHRASES = [
  "正在上传数据",
  "搬运到云端中",
  "压实最后一公里",
  "马上就好"
];

export function UploadingAnimation({
  label = "正在上传数据",
  estimatedSeconds
}: {
  label?: string;
  estimatedSeconds?: number;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const phraseTimer = setInterval(() => setPhraseIndex((i) => (i + 1) % PHRASES.length), 1500);
    const elapsedTimer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(phraseTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-xl p-6"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, rgba(8,13,28,0.65) 70%)",
        border: "1px solid rgba(249,115,22,0.28)",
        boxShadow:
          "0 0 30px rgba(249,115,22,0.10), inset 0 0 24px rgba(249,115,22,0.04)"
      }}
    >
      {/* dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(249,115,22,0.2) 1px, transparent 1px)",
          backgroundSize: "18px 18px"
        }}
      />

      {/* Conveyor "track" */}
      <div className="relative z-10 flex h-20 w-full max-w-[280px] items-center justify-center">
        {/* Track line */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.55) 50%, transparent 100%)",
            boxShadow: "0 0 8px rgba(249,115,22,0.4)",
            top: "62%"
          }}
        />

        {/* 4 packages flying across at different delays */}
        {[
          { delay: 0, size: 14 },
          { delay: 0.4, size: 11 },
          { delay: 0.8, size: 16 },
          { delay: 1.2, size: 12 }
        ].map((p, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `calc(62% - ${p.size / 2}px)`,
              left: 0,
              right: 0,
              animation: `ul-box-fly 1.6s linear infinite`,
              animationDelay: `${p.delay}s`
            }}
          >
            <div
              className="flex items-center justify-center rounded"
              style={{
                width: p.size,
                height: p.size,
                background:
                  "linear-gradient(135deg, rgba(249,115,22,0.85) 0%, rgba(239,68,68,0.85) 100%)",
                boxShadow:
                  "0 0 8px rgba(249,115,22,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                border: "1px solid rgba(255,200,140,0.5)"
              }}
            >
              <Package className="text-white" style={{ width: p.size * 0.6, height: p.size * 0.6 }} />
            </div>
          </div>
        ))}

        {/* Truck — bobs in place */}
        <div
          className="relative z-10 flex h-12 w-12 items-center justify-center rounded-lg"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.45), rgba(2,4,10,0.96))",
            boxShadow:
              "0 0 22px rgba(249,115,22,0.55), 0 0 0 1px rgba(249,115,22,0.55)",
            animation: "ul-truck-bob 0.7s ease-in-out infinite"
          }}
        >
          <Truck className="h-6 w-6 text-orange-200" style={{ filter: "drop-shadow(0 0 6px rgba(249,115,22,0.8))" }} />
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
        <div
          className="bg-gradient-to-r from-orange-200 via-amber-100 to-orange-300 bg-clip-text text-base font-semibold tracking-wide text-transparent"
          style={{ filter: "drop-shadow(0 0 12px rgba(249,115,22,0.40))" }}
        >
          {label}
        </div>
        <div
          key={phraseIndex}
          className="font-mono text-[11px] tracking-[0.2em] text-orange-300/85"
          style={{
            textShadow: "0 0 10px rgba(249,115,22,0.45)",
            animation: "wo-text-in 350ms cubic-bezier(0.2,0.8,0.2,1) both"
          }}
        >
          {PHRASES[phraseIndex]}...
        </div>
        {elapsed > 0 || estimatedSeconds ? (
          <div className="mt-1 font-mono text-[10px] tracking-wider text-slate-500">
            已用 {elapsed}s{estimatedSeconds ? ` / 预计 ${estimatedSeconds}s` : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}
