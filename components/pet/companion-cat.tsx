"use client";

/**
 * 晓晓 —— 三花曼基康电子宠物
 *
 * 一只用站点琥珀色线条画的曼基康（短腿）三花猫，跟着每个人在系统里走动、
 * 睡觉、撒娇。不会盖到正文：固定在视窗底部 padding 区（layout 已留 7rem 底
 * padding，移动端会自动让到 tabbar 上方）。
 *
 * 设计要点：
 *  - 暖琥珀色描线 + 奶黄色 fill，与品牌色契合
 *  - 三花特征：体侧橙色斑 + 黑色斑、头部橙色斑、耳廓橙色
 *  - 曼基康特征：短腿 + 圆滚身体 + 大头
 *  - 状态机：sit → walking → sit / sleeping / playing
 *    · 走动：随机方向，撞墙转身
 *    · 睡觉：蜷缩 + Z 飘浮 + 呼吸缩放
 *    · 撒娇：跳跃 + 爱心冒出
 *  - 交互：点击逗弄触发撒娇；hover 显示心情
 *  - 性能：document hidden 时暂停状态机；transition 省力
 *  - 无障碍：role=button + tabIndex；尊重 prefers-reduced-motion（CSS 已处理）
 */

import { useCallback, useEffect, useRef, useState } from "react";

type CatState = "sit" | "walking" | "sleeping" | "playing" | "yawning";
type Direction = "left" | "right";

const STATE_DURATIONS: Record<CatState, [number, number]> = {
  sit: [4500, 9500],
  walking: [5500, 13000],
  sleeping: [22000, 50000],
  playing: [2200, 3200],
  yawning: [1400, 2200]
};

function randInRange([min, max]: [number, number]) {
  return min + Math.random() * (max - min);
}

function nextStateFrom(current: CatState): CatState {
  const r = Math.random();
  if (current === "sit") {
    if (r < 0.45) return "walking";
    if (r < 0.62) return "sit";
    if (r < 0.85) return "yawning";
    return "playing";
  }
  if (current === "walking") {
    if (r < 0.65) return "sit";
    if (r < 0.85) return "walking";
    return "playing";
  }
  if (current === "sleeping") return "yawning";
  if (current === "yawning") return Math.random() < 0.55 ? "sleeping" : "sit";
  if (current === "playing") return "sit";
  return "sit";
}

const MOOD_LABEL: Record<CatState, string> = {
  sit: "在发呆",
  walking: "散步中",
  sleeping: "正在睡觉…",
  playing: "好开心！",
  yawning: "打哈欠"
};

export function CompanionCat() {
  const [state, setState] = useState<CatState>("sit");
  const [direction, setDirection] = useState<Direction>("right");
  const [position, setPosition] = useState(50);
  const [showHearts, setShowHearts] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(20);
  const [hidden, setHidden] = useState(false);

  const stateRef = useRef<CatState>("sit");
  const directionRef = useRef<Direction>("right");
  const positionRef = useRef(50);
  const rafRef = useRef<number | null>(null);
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // 移动端要让开 tabbar (~64px) + 安全区
  useEffect(() => {
    const checkLayout = () => {
      if (typeof window === "undefined") return;
      const isMobile = window.innerWidth < 1024;
      setBottomOffset(isMobile ? 84 : 20);
      setHidden(window.innerHeight < 480);
    };
    checkLayout();
    window.addEventListener("resize", checkLayout);
    return () => window.removeEventListener("resize", checkLayout);
  }, []);

  // 状态机：到点切换
  useEffect(() => {
    const duration = randInRange(STATE_DURATIONS[state]);
    stateTimerRef.current = setTimeout(() => {
      const next = nextStateFrom(stateRef.current);
      if (next === "walking") {
        const pos = positionRef.current;
        // 离墙太近时朝相反方向走
        const dir: Direction = pos < 15 ? "right" : pos > 85 ? "left" : Math.random() < 0.5 ? "left" : "right";
        setDirection(dir);
      }
      if (next === "playing") {
        setShowHearts(true);
        if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
        heartTimerRef.current = setTimeout(() => setShowHearts(false), 2000);
      }
      setState(next);
    }, duration);
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    };
  }, [state]);

  // 走动动画：rAF 沿 x 轴推进
  useEffect(() => {
    if (state !== "walking") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    let lastT = performance.now();
    const step = (t: number) => {
      const dt = (t - lastT) / 1000;
      lastT = t;
      const speed = 5.5; // % per second of viewport width
      const dir = directionRef.current === "right" ? 1 : -1;
      let next = positionRef.current + dir * speed * dt;
      if (next < 4) {
        next = 4;
        setDirection("right");
      } else if (next > 96) {
        next = 96;
        setDirection("left");
      }
      positionRef.current = next;
      setPosition(next);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state]);

  // 标签页隐藏时浏览器自动节流 setTimeout / 暂停 rAF，无需手动处理。

  // 点击逗弄 → 立即撒娇
  const handlePlay = useCallback(() => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    setShowHearts(true);
    if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
    heartTimerRef.current = setTimeout(() => setShowHearts(false), 2000);
    setState("playing");
  }, []);

  if (hidden) return null;

  return (
    <div
      className="cat-companion-root"
      style={{
        position: "fixed",
        left: `${position}%`,
        bottom: bottomOffset,
        transform: "translateX(-50%)",
        zIndex: 30,
        pointerEvents: "none",
        // 走路时禁用过渡（rAF 会逐帧更新）；其它状态下平滑滑入
        transition: state === "walking" ? "none" : "left 0.4s ease-out, bottom 0.3s ease-out"
      }}
      aria-hidden={false}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="逗弄晓晓（三花曼基康）"
        onClick={handlePlay}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handlePlay();
          }
        }}
        className="group relative inline-block select-none"
        style={{ pointerEvents: "auto", cursor: "pointer", outline: "none" }}
      >
        {/* hearts (撒娇时冒出) */}
        {showHearts ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: -6,
              transform: "translateX(-50%)",
              width: 40,
              height: 24,
              pointerEvents: "none"
            }}
          >
            <span style={heartStyle(0, 0)}>❤</span>
            <span style={heartStyle(-12, 0.3)}>❤</span>
            <span style={heartStyle(12, 0.6)}>❤</span>
          </div>
        ) : null}

        {/* hover 心情提示 */}
        <span
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
          style={{
            top: -22,
            background: "rgba(245,158,11,0.10)",
            borderColor: "rgba(245,158,11,0.32)",
            color: "rgb(252, 211, 77)",
            backdropFilter: "blur(6px)"
          }}
        >
          晓晓 · {MOOD_LABEL[state]}
        </span>

        {/* 猫本体 */}
        <CatSvg state={state} direction={direction} />
      </div>
    </div>
  );
}

function heartStyle(offsetX: number, delay: number): React.CSSProperties {
  return {
    position: "absolute",
    left: `calc(50% + ${offsetX}px)`,
    top: 0,
    transform: "translateX(-50%)",
    fontSize: 14,
    color: "#fb7185",
    filter: "drop-shadow(0 0 6px rgba(251,113,133,0.65))",
    animation: "cat-heart-float 1.8s ease-out forwards",
    animationDelay: `${delay}s`
  };
}

function CatSvg({ state, direction }: { state: CatState; direction: Direction }) {
  if (state === "sleeping") return <CatSleeping />;
  return <CatStanding state={state} direction={direction} />;
}

/* ─── 站立 / 走动 / 坐 / 撒娇 ─────────────────────────────────────── */

function CatStanding({ state, direction }: { state: CatState; direction: Direction }) {
  const flip = direction === "left" ? "scaleX(-1)" : "scaleX(1)";
  const bob =
    state === "walking"
      ? "cat-walk-bob 0.6s ease-in-out infinite"
      : state === "playing"
        ? "cat-hop 0.7s ease-in-out infinite"
        : state === "yawning"
          ? "cat-breathe 1.6s ease-in-out infinite"
          : "none";

  return (
    <svg
      viewBox="0 0 80 60"
      width="64"
      height="48"
      style={{
        overflow: "visible",
        transform: flip,
        animation: bob,
        filter: "drop-shadow(0 3px 8px rgba(245,158,11,0.18))"
      }}
    >
      {/* 地面阴影 */}
      <ellipse cx="42" cy="58" rx="22" ry="2" fill="rgba(245,158,11,0.22)" />

      {/* 尾巴 + 尾尖白绒 */}
      <g style={{ transformOrigin: "22px 46px", animation: "cat-tail-sway 2.4s ease-in-out infinite" }}>
        <path
          d="M 22 46 C 8 42, 4 28, 14 18"
          stroke="#f59e0b"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="14" cy="18" r="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
      </g>

      {/* 后腿（半透露） */}
      <line x1="36" y1="52" x2="36" y2="56" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <line x1="48" y1="52" x2="48" y2="56" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.55" />

      {/* 身体 */}
      <ellipse cx="42" cy="46" rx="22" ry="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.8" />

      {/* 三花斑：橙 + 深 */}
      <path d="M 30 42 Q 35 38, 40 42 Q 38 45, 32 45 Z" fill="#fb923c" opacity="0.85" />
      <path d="M 50 48 Q 55 45, 58 49 Q 55 51, 50 50 Z" fill="#1e293b" opacity="0.55" />

      {/* 前腿（短） */}
      <line x1="30" y1="54" x2="30" y2="58" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="50" y1="54" x2="50" y2="58" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />

      {/* 头 */}
      <circle cx="60" cy="32" r="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.8" />

      {/* 耳朵 + 内耳橙色 */}
      <path d="M 51 23 L 53 14 L 58 22 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 62 22 L 65 14 L 69 23 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 53 16 L 55 21 L 57 18 Z" fill="#fb923c" />
      <path d="M 64 16 L 66 22 L 68 17 Z" fill="#fb923c" />

      {/* 头部橙色斑（三花头花） */}
      <path d="M 53 25 Q 58 22, 63 27 Q 60 31, 54 30 Z" fill="#fb923c" opacity="0.7" />

      {/* 眼睛（含眨眼），撒娇时眯眼笑 */}
      {state === "playing" || state === "yawning" ? (
        <>
          <path d="M 53.5 32 Q 55 33.4, 56.5 32" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M 63.5 32 Q 65 33.4, 66.5 32" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <g style={{ transformOrigin: "60px 32px", animation: "cat-blink 5.5s ease-in-out infinite" }}>
          <ellipse cx="55" cy="32" rx="1.2" ry="1.6" fill="#1e293b" />
          <ellipse cx="65" cy="32" rx="1.2" ry="1.6" fill="#1e293b" />
          <circle cx="55.4" cy="31.5" r="0.4" fill="#fef9c3" />
          <circle cx="65.4" cy="31.5" r="0.4" fill="#fef9c3" />
        </g>
      )}

      {/* 鼻 + 嘴 */}
      <path d="M 59 36 L 61 36 L 60 37.5 Z" fill="#fb923c" />
      <path d="M 60 37.5 Q 58 39, 56 38" stroke="#1e293b" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M 60 37.5 Q 62 39, 64 38" stroke="#1e293b" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* 胡须 */}
      <path d="M 53 35 L 47 34" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M 53 36.5 L 47 36.5" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M 67 35 L 73 34" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M 67 36.5 L 73 36.5" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
}

/* ─── 睡觉（蜷缩） ────────────────────────────────────────── */

function CatSleeping() {
  return (
    <svg
      viewBox="0 0 80 60"
      width="64"
      height="48"
      style={{
        overflow: "visible",
        animation: "cat-breathe 3.4s ease-in-out infinite",
        filter: "drop-shadow(0 3px 8px rgba(245,158,11,0.16))"
      }}
    >
      <ellipse cx="42" cy="58" rx="26" ry="2.5" fill="rgba(245,158,11,0.18)" />

      {/* 蜷成大椭圆 */}
      <ellipse cx="42" cy="48" rx="26" ry="11" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.8" />

      {/* 尾巴绕在身体上 */}
      <path
        d="M 18 49 Q 15 39, 25 41 Q 36 42, 42 41"
        stroke="#f59e0b"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* 三花斑 */}
      <path d="M 30 44 Q 36 40, 42 44 Q 38 47, 32 47 Z" fill="#fb923c" opacity="0.8" />
      <path d="M 50 50 Q 56 47, 60 51 Q 56 53, 50 52 Z" fill="#1e293b" opacity="0.5" />

      {/* 头蜷在身上 */}
      <circle cx="58" cy="44" r="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.6" />

      {/* 耳朵 + 内耳橙色 */}
      <path d="M 50 38 L 52 32 L 56 38 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M 60 38 L 63 32 L 66 38 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M 52 33 L 54 37 L 55 35 Z" fill="#fb923c" />
      <path d="M 62 33 L 64 37 L 65 35 Z" fill="#fb923c" />

      {/* 闭眼弧线 */}
      <path d="M 53 43 Q 55 45, 57 43" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M 60 43 Q 62 45, 64 43" stroke="#1e293b" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* 鼻 */}
      <path d="M 57 47 L 59 47 L 58 48 Z" fill="#fb923c" />

      {/* Z 飘浮（错位 + 时差） */}
      <text
        x="68"
        y="22"
        fontSize="9"
        fill="#f59e0b"
        fontWeight="700"
        style={{ animation: "cat-z-float 2.6s ease-out infinite" }}
      >
        z
      </text>
      <text
        x="74"
        y="14"
        fontSize="6"
        fill="#f59e0b"
        fontWeight="700"
        opacity="0.6"
        style={{ animation: "cat-z-float 2.6s ease-out infinite", animationDelay: "0.9s" }}
      >
        z
      </text>
    </svg>
  );
}
