"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

/**
 * 保存成功庆祝动画。
 *
 * 视觉：
 *  - 中央 emerald 圆形 + 白色勾选图标，弹性放大入场
 *  - 同心绿色光环向外扩散（sonar 风）
 *  - 12 颗五彩纸屑从中心向外飞溅 + 旋转
 *  - 顶部"恭喜！"渐入字距动画
 *  - 副文"已经保存成功了"配光晕
 *
 * 用法：
 *   {success ? <SuccessCelebration message="..." /> : null}
 */

const CONFETTI_COLORS = [
  "#fbbf24", // amber
  "#fb923c", // orange
  "#34d399", // emerald
  "#60a5fa", // sky
  "#f472b6", // pink
  "#a78bfa"  // violet
];

export function SuccessCelebration({
  title = "恭喜！",
  message = "已经保存成功了",
  onClose
}: {
  title?: string;
  message?: string;
  /** 可选：n 秒后自动隐藏（父组件需配合 state） */
  onClose?: () => void;
}) {
  const [confetti] = useState(() =>
    Array.from({ length: 14 }).map((_, i) => {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 80 + Math.random() * 60;
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.15,
        size: 5 + Math.random() * 5
      };
    })
  );

  useEffect(() => {
    if (!onClose) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-4 overflow-visible rounded-xl px-6 py-8"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(16,185,129,0.10) 0%, rgba(8,13,28,0.65) 70%)",
        border: "1px solid rgba(16,185,129,0.34)",
        boxShadow:
          "0 0 36px rgba(16,185,129,0.18), inset 0 0 24px rgba(16,185,129,0.04)"
      }}
    >
      {/* Center check + sonar rings */}
      <div className="relative" style={{ width: 80, height: 80 }}>
        {/* sonar rings */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: 80,
            height: 80,
            marginLeft: -40,
            marginTop: -40,
            border: "2px solid rgba(74,222,128,0.55)",
            animation: "sc-ring-out 1.4s ease-out infinite"
          }}
        />
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: 80,
            height: 80,
            marginLeft: -40,
            marginTop: -40,
            border: "1.5px solid rgba(74,222,128,0.40)",
            animation: "sc-ring-out 1.4s ease-out 0.5s infinite"
          }}
        />
        {/* Check badge */}
        <div
          className="absolute left-1/2 top-1/2 flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            marginLeft: -32,
            marginTop: -32,
            background:
              "radial-gradient(circle at 50% 35%, rgba(74,222,128,0.95), rgba(5,46,22,0.96))",
            boxShadow:
              "0 0 30px rgba(74,222,128,0.7), 0 0 0 2px rgba(74,222,128,0.7), 0 0 60px rgba(74,222,128,0.3)",
            animation: "sc-check-pop 600ms cubic-bezier(0.2,0.8,0.2,1) both"
          }}
        >
          <Check
            className="h-9 w-9 text-white"
            strokeWidth={3.5}
            style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.6))" }}
          />
        </div>

        {/* 14 confetti pieces flying outward */}
        {confetti.map((c, i) => (
          <span
            key={i}
            className="pointer-events-none absolute left-1/2 top-1/2 block rounded-sm"
            style={
              {
                width: c.size,
                height: c.size * 0.55,
                marginLeft: -c.size / 2,
                marginTop: (-c.size * 0.55) / 2,
                background: c.color,
                boxShadow: `0 0 6px ${c.color}99`,
                animation: `sc-confetti 1.6s cubic-bezier(0.2,0.6,0.2,1) ${c.delay}s both`,
                "--sc-x": `${c.x}px`,
                "--sc-y": `${c.y}px`
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Text */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
        <div
          className="bg-gradient-to-r from-emerald-200 via-amber-100 to-emerald-300 bg-clip-text text-2xl font-bold text-transparent"
          style={{
            filter: "drop-shadow(0 0 14px rgba(74,222,128,0.40))",
            animation: "sc-text-rise 500ms cubic-bezier(0.2,0.8,0.2,1) 100ms backwards"
          }}
        >
          {title}
        </div>
        <div
          className="font-mono text-sm text-emerald-200/90"
          style={{
            textShadow: "0 0 12px rgba(74,222,128,0.45)",
            animation: "sc-text-rise 500ms cubic-bezier(0.2,0.8,0.2,1) 300ms backwards"
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
