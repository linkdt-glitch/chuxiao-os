"use client";

/**
 * 咪咪 —— 三花曼基康电子宠物 (cuteness pass v3)
 *
 * 一只长着双翅的曼基康（短腿）三花猫，跟着每个人在系统底部 padding 区里
 * 走动 / 发呆 / 打哈欠 / 睡觉 / 撒娇。
 *
 * v3 升级：
 *  - 加了一对天使风双翅（白绒 + 琥珀线 + 内羽细节），idle / walking 时
 *    缓拍，撒娇时疾拍，睡觉时折叠
 *  - 走动时身后有 sparkle 残留点 (✦) 错位时差冒出 — 像踩着星光
 *  - 撒娇时眼睛变成爱心 ♥
 *  - 替换硬地面阴影为柔色 radial glow，sit 时呼吸感
 *  - 严格禁止"倒退跑": walking → 不再直接走到 walking; 边界停在 sit;
 *    rAF 延后 32ms 启动让翻转视觉先 commit
 *
 * 行为约束：
 *  - 永远面向走动方向（视觉与位移方向同步）
 *  - 撞墙不会原地反弹，而是切回 sit，下一轮再选方向
 *  - 起步前如离墙太近自动选反方向
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CatState = "sit" | "walking" | "sleeping" | "playing" | "yawning";
type Direction = "left" | "right";
type IdleQuirk = "calm" | "ear-twitch" | "tail-flick";

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
    // 严格不允许 walking → walking, 防止瞬间换向"倒退"; 必须经过 sit / playing
    if (r < 0.85) return "sit";
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
  const router = useRouter();
  const [state, setState] = useState<CatState>("sit");
  const [direction, setDirection] = useState<Direction>("right");
  const [showHearts, setShowHearts] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [jiggling, setJiggling] = useState(false);
  const [idleQuirk, setIdleQuirk] = useState<IdleQuirk>("calm");
  const [bottomOffset, setBottomOffset] = useState(20);
  const [hidden, setHidden] = useState(false);
  // SSR / 首帧不渲染，避免初始 transform 把猫闪到屏幕左边再 snap 回中心
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const stateRef = useRef<CatState>("sit");
  // 位置完全用 ref 管理：rAF 直接写 DOM transform，不走 React 渲染。
  // 避免 60fps 的 setState 触发整棵 SVG 树 reconcile（之前是卡顿主因）。
  const positionRef = useRef(50);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jiggleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quirkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 把当前位置百分比直接写到 wrapper 的 transform 上（GPU 合成，不触发 layout/paint）
  const applyPosition = useCallback((percent: number) => {
    const clamped = Math.max(4, Math.min(96, percent));
    positionRef.current = clamped;
    const node = wrapperRef.current;
    if (node && typeof window !== "undefined") {
      const px = (clamped / 100) * window.innerWidth;
      // translate3d 强制开 GPU 层；后跟 -50% 居中
      node.style.transform = `translate3d(${px}px, 0, 0) translateX(-50%)`;
    }
  }, []);

  // 移动端要让开 tabbar (~64px) + 安全区；resize 时同步重写 transform
  useEffect(() => {
    const checkLayout = () => {
      if (typeof window === "undefined") return;
      const isMobile = window.innerWidth < 1024;
      setBottomOffset(isMobile ? 84 : 20);
      setHidden(window.innerHeight < 480);
      applyPosition(positionRef.current); // 视窗变了重新映射 px
    };
    checkLayout();
    window.addEventListener("resize", checkLayout);
    return () => window.removeEventListener("resize", checkLayout);
  }, [applyPosition]);

  // 首次 mount 把初始 50% 位置写到 DOM（避免首帧居左）
  useEffect(() => {
    applyPosition(positionRef.current);
  }, [applyPosition]);

  // 状态机：到点切换。direction 只在 sit/yawning/playing → walking 转换时
  // 选定一次，避免任何 walking 中途换向。
  useEffect(() => {
    const duration = randInRange(STATE_DURATIONS[state]);
    stateTimerRef.current = setTimeout(() => {
      const next = nextStateFrom(stateRef.current);
      if (next === "walking") {
        const pos = positionRef.current;
        // 离墙太近时朝相反方向走，不会"撞墙倒退"
        const dir: Direction =
          pos < 18 ? "right" : pos > 82 ? "left" : Math.random() < 0.5 ? "left" : "right";
        setDirection(dir);
      }
      if (next === "playing") {
        setShowHearts(true);
        if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
        heartTimerRef.current = setTimeout(() => setShowHearts(false), 2200);
      }
      setState(next);
    }, duration);
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    };
  }, [state]);

  // 走动：捕获本次启动时的 direction，rAF 里直接写 DOM transform，
  // 不走 setState（避免每帧整棵 SVG reconcile）。
  useEffect(() => {
    if (state !== "walking") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const initialDirection = direction;
    let cancelled = false;
    const startId = setTimeout(() => {
      if (cancelled) return;
      let lastT = performance.now();
      const step = (t: number) => {
        const dt = (t - lastT) / 1000;
        lastT = t;
        const speed = 5.5;
        const dir = initialDirection === "right" ? 1 : -1;
        const next = positionRef.current + dir * speed * dt;
        const reachedEdge = next < 4 || next > 96;
        if (reachedEdge) {
          applyPosition(Math.max(4, Math.min(96, next)));
          if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
          stateTimerRef.current = null;
          setState("sit");
          return;
        }
        applyPosition(next);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }, 32);

    return () => {
      cancelled = true;
      clearTimeout(startId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, direction, applyPosition]);

  // sit 期间偶发 micro-action：耳朵抽动 / 尾巴翻飞
  useEffect(() => {
    if (state !== "sit") {
      setIdleQuirk("calm");
      if (quirkTimerRef.current) clearTimeout(quirkTimerRef.current);
      return;
    }
    const schedule = () => {
      const wait = 3500 + Math.random() * 4000;
      quirkTimerRef.current = setTimeout(() => {
        const r = Math.random();
        const quirk: IdleQuirk = r < 0.5 ? "ear-twitch" : "tail-flick";
        setIdleQuirk(quirk);
        setTimeout(() => setIdleQuirk("calm"), 700);
        schedule();
      }, wait);
    };
    schedule();
    return () => {
      if (quirkTimerRef.current) clearTimeout(quirkTimerRef.current);
    };
  }, [state]);

  // 点击逗弄 → 立即撒娇（颤抖 + 跳跃 + 爱心）
  const handlePlay = useCallback(() => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    setShowHearts(true);
    if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
    heartTimerRef.current = setTimeout(() => setShowHearts(false), 2200);
    setJiggling(true);
    if (jiggleTimerRef.current) clearTimeout(jiggleTimerRef.current);
    jiggleTimerRef.current = setTimeout(() => setJiggling(false), 450);
    setState("playing");
  }, []);

  /**
   * 双击咪咪 → 进入 AI 对话页面。
   *
   * 等于把猫咪本身变成「召唤 AI 助手」的快捷入口。先跑一次 playing
   * 状态（撒娇 + 爱心特效）让用户看到反馈，再 router.push 跳转。
   */
  const handleDoubleClick = useCallback(() => {
    handlePlay();
    // 延 ~200ms 跳转，让爱心动画先 commit 一帧
    setTimeout(() => router.push("/ai-workforce/chat"), 200);
  }, [handlePlay, router]);

  if (!mounted || hidden) return null;

  const showCute = hovering || state === "playing" || state === "yawning";
  const showHeartEyes = state === "playing" || jiggling;

  return (
    <div
      ref={wrapperRef}
      className="cat-companion-root"
      style={{
        position: "fixed",
        left: 0,
        bottom: bottomOffset,
        zIndex: 30,
        pointerEvents: "none",
        willChange: "transform",
        contain: "layout paint",
        // 默认初始 transform；mount 后 applyPosition() 会覆盖为正确位置
        transform: "translate3d(0, 0, 0) translateX(-50%)"
      }}
      aria-hidden={false}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="逗弄咪咪 · 双击进入 AI 对话"
        title="单击：逗弄 / 双击：进入 AI 对话"
        onClick={handlePlay}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handlePlay();
          }
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="group relative inline-block select-none"
        style={{ pointerEvents: "auto", cursor: "pointer", outline: "none" }}
      >
        {/* hearts (撒娇时冒出，4 颗大小不一) */}
        {showHearts ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: -10,
              transform: "translateX(-50%)",
              width: 60,
              height: 28,
              pointerEvents: "none"
            }}
          >
            <span style={heartStyle(0, 0, 16)}>❤</span>
            <span style={heartStyle(-14, 0.18, 12)}>❤</span>
            <span style={heartStyle(14, 0.32, 12)}>❤</span>
            <span style={heartStyle(-6, 0.55, 10)}>❤</span>
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
          咪咪 · {MOOD_LABEL[state]}
        </span>

        {/* 猫本体 */}
        <div
          style={{
            animation: jiggling ? "cat-jiggle 0.45s ease-in-out 1" : "none",
            transformOrigin: "center bottom"
          }}
        >
          <CatSvg
            state={state}
            direction={direction}
            idleQuirk={idleQuirk}
            showCute={showCute}
            showHeartEyes={showHeartEyes}
          />
        </div>
      </div>
    </div>
  );
}

function heartStyle(offsetX: number, delay: number, size: number): React.CSSProperties {
  return {
    position: "absolute",
    left: `calc(50% + ${offsetX}px)`,
    top: 0,
    transform: "translateX(-50%)",
    fontSize: size,
    color: "#fb7185",
    filter: "drop-shadow(0 0 6px rgba(251,113,133,0.65))",
    animation: "cat-heart-float 1.9s ease-out forwards",
    animationDelay: `${delay}s`
  };
}

function CatSvg({
  state,
  direction,
  idleQuirk,
  showCute,
  showHeartEyes
}: {
  state: CatState;
  direction: Direction;
  idleQuirk: IdleQuirk;
  showCute: boolean;
  showHeartEyes: boolean;
}) {
  if (state === "sleeping") return <CatSleeping />;
  return (
    <CatStanding
      state={state}
      direction={direction}
      idleQuirk={idleQuirk}
      showCute={showCute}
      showHeartEyes={showHeartEyes}
    />
  );
}

/* ─── 站立 / 走动 / 坐 / 撒娇 ─────────────────────────────────────── */

function CatStanding({
  state,
  direction,
  idleQuirk,
  showCute,
  showHeartEyes
}: {
  state: CatState;
  direction: Direction;
  idleQuirk: IdleQuirk;
  showCute: boolean;
  showHeartEyes: boolean;
}) {
  const flip = direction === "left" ? "scaleX(-1)" : "scaleX(1)";
  const bob =
    state === "walking"
      ? "cat-walk-bob 0.6s ease-in-out infinite"
      : state === "playing"
        ? "cat-cute-hop 0.75s ease-in-out infinite"
        : state === "yawning"
          ? "cat-breathe 1.6s ease-in-out infinite"
          : "none";

  const earTwitchAnim = idleQuirk === "ear-twitch" ? "cat-ear-twitch 0.7s ease-in-out 1" : "none";
  const tailFlickAnim =
    idleQuirk === "tail-flick"
      ? "cat-tail-sway 0.5s ease-in-out 1"
      : "cat-tail-sway 2.4s ease-in-out infinite";

  return (
    <svg
      viewBox="0 0 80 60"
      width="72"
      height="56"
      style={{
        overflow: "visible",
        transform: flip,
        animation: bob,
        transformOrigin: "center bottom",
        filter: "drop-shadow(0 3px 10px rgba(245,158,11,0.22))"
      }}
    >
      <defs>
        <radialGradient id="cat-ground-glow" cx="0.5" cy="1" r="0.55">
          <stop offset="0%" stopColor="rgba(251, 191, 36, 0.55)" />
          <stop offset="60%" stopColor="rgba(251, 191, 36, 0.18)" />
          <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
        </radialGradient>
      </defs>

      {/* 地面柔光（替代硬阴影） */}
      <ellipse
        cx="42"
        cy="58"
        rx="26"
        ry="4.5"
        fill="url(#cat-ground-glow)"
        style={{
          transformOrigin: "42px 58px",
          animation: state === "sit" ? "cat-glow-pulse 2.8s ease-in-out infinite" : "none"
        }}
      />

      {/* 走动时身后 sparkle 残留 */}
      {state === "walking" ? (
        <g aria-hidden style={{ pointerEvents: "none" }}>
          <Sparkle x={20} y={54} size={2.4} delay={0} />
          <Sparkle x={22} y={50} size={1.8} delay={0.45} />
          <Sparkle x={18} y={56} size={1.4} delay={0.9} />
        </g>
      ) : null}

      {/* 尾巴主段 + 尾尖二次摆动 */}
      <g style={{ transformOrigin: "22px 46px", animation: tailFlickAnim }}>
        <path
          d="M 22 46 C 8 42, 4 28, 12 18"
          stroke="#f59e0b"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <g style={{ transformOrigin: "12px 18px", animation: "cat-tail-tip-wave 1.6s ease-in-out infinite" }}>
          <circle cx="12" cy="18" r="2.2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
        </g>
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
      {/* 小肉垫 */}
      <circle cx="30" cy="58.4" r="0.8" fill="#fb923c" />
      <circle cx="50" cy="58.4" r="0.8" fill="#fb923c" />

      {/* 头 */}
      <circle cx="60" cy="32" r="13" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.8" />

      {/* 耳朵：耳根偶发抽动 */}
      <g style={{ transformOrigin: "53px 23px", animation: earTwitchAnim }}>
        <path d="M 50 23 L 52 13 L 58 22 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M 52 15 L 54 21 L 56 18 Z" fill="#fb923c" />
      </g>
      <g style={{ transformOrigin: "67px 23px" }}>
        <path d="M 62 22 L 66 12 L 70 23 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M 64 15 L 66 22 L 68 17 Z" fill="#fb923c" />
      </g>

      {/* 头部橙色斑（三花头花） */}
      <path d="M 53 25 Q 58 22, 63 27 Q 60 31, 54 30 Z" fill="#fb923c" opacity="0.7" />

      {/* 眼睛：撒娇 → 爱心；hover/yawn → 眯眼笑；其它 → 大眼带高光 */}
      {showHeartEyes ? (
        <>
          <HeartEye cx={55} cy={32} />
          <HeartEye cx={65} cy={32} />
        </>
      ) : showCute ? (
        <>
          <path d="M 53 31.5 Q 55 33.5, 57 31.5" stroke="#1e293b" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M 63 31.5 Q 65 33.5, 67 31.5" stroke="#1e293b" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <g style={{ transformOrigin: "60px 32px", animation: "cat-blink 5.5s ease-in-out infinite" }}>
          <ellipse cx="55" cy="32" rx="2.4" ry="2.8" fill="#fef9c3" stroke="#1e293b" strokeWidth="0.6" />
          <ellipse cx="65" cy="32" rx="2.4" ry="2.8" fill="#fef9c3" stroke="#1e293b" strokeWidth="0.6" />
          <ellipse cx="55" cy="32.2" rx="1.4" ry="2.2" fill="#1e293b" />
          <ellipse cx="65" cy="32.2" rx="1.4" ry="2.2" fill="#1e293b" />
          <circle cx="55.6" cy="31" r="0.7" fill="#ffffff" />
          <circle cx="65.6" cy="31" r="0.7" fill="#ffffff" />
          <circle cx="54.4" cy="32.6" r="0.3" fill="#ffffff" opacity="0.7" />
          <circle cx="64.4" cy="32.6" r="0.3" fill="#ffffff" opacity="0.7" />
        </g>
      )}

      {/* 脸颊红晕（cute 状态出现） */}
      {showCute ? (
        <>
          <ellipse
            cx="51"
            cy="36"
            rx="2.2"
            ry="1.3"
            fill="#fb7185"
            opacity="0.55"
            style={{ animation: "cat-blush-pulse 1.4s ease-in-out infinite" }}
          />
          <ellipse
            cx="69"
            cy="36"
            rx="2.2"
            ry="1.3"
            fill="#fb7185"
            opacity="0.55"
            style={{ animation: "cat-blush-pulse 1.4s ease-in-out infinite" }}
          />
        </>
      ) : null}

      {/* 鼻 */}
      <path d="M 59 35.5 L 61 35.5 L 60 37 Z" fill="#fb923c" />

      {/* 嘴 :3 风（撒娇时张嘴笑） */}
      {state === "playing" ? (
        <>
          <path d="M 60 37 Q 58 39.5, 56 38.5" stroke="#1e293b" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M 60 37 Q 62 39.5, 64 38.5" stroke="#1e293b" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <ellipse cx="60" cy="39" rx="1.2" ry="0.7" fill="#fb7185" />
        </>
      ) : (
        <>
          <path d="M 60 37 Q 58 39, 56 38" stroke="#1e293b" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M 60 37 Q 62 39, 64 38" stroke="#1e293b" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* 胡须 */}
      <path d="M 53 35 L 47 34" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M 53 36.5 L 47 36.5" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M 67 35 L 73 34" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M 67 36.5 L 73 36.5" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
}

/** 4-pointed sparkle. */
function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <g
      style={{
        transformOrigin: `${x}px ${y}px`,
        animation: "cat-walk-trail 1.4s ease-out infinite",
        animationDelay: `${delay}s`
      }}
    >
      <path
        d={`M ${x} ${y - size} L ${x + size * 0.25} ${y - size * 0.25} L ${x + size} ${y} L ${x + size * 0.25} ${y + size * 0.25} L ${x} ${y + size} L ${x - size * 0.25} ${y + size * 0.25} L ${x - size} ${y} L ${x - size * 0.25} ${y - size * 0.25} Z`}
        fill="#fbbf24"
        opacity="0.95"
      />
    </g>
  );
}

/** 心形眼（撒娇 / 点击瞬间）。 */
function HeartEye({ cx, cy }: { cx: number; cy: number }) {
  // 中心 (cx, cy) 周围画一个 ~6px 宽的爱心
  const d = `
    M ${cx} ${cy + 2}
    C ${cx - 3} ${cy}, ${cx - 3} ${cy - 2.5}, ${cx - 1.5} ${cy - 2.5}
    C ${cx - 0.5} ${cy - 2.5}, ${cx} ${cy - 1.5}, ${cx} ${cy - 0.5}
    C ${cx} ${cy - 1.5}, ${cx + 0.5} ${cy - 2.5}, ${cx + 1.5} ${cy - 2.5}
    C ${cx + 3} ${cy - 2.5}, ${cx + 3} ${cy}, ${cx} ${cy + 2}
    Z
  `;
  return <path d={d} fill="#fb7185" stroke="#1e293b" strokeWidth="0.5" strokeLinejoin="round" />;
}

/* ─── 睡觉（蜷缩）────────────────────────────────────────── */

function CatSleeping() {
  return (
    <svg
      viewBox="0 0 80 60"
      width="72"
      height="56"
      style={{
        overflow: "visible",
        animation: "cat-breathe 3.4s ease-in-out infinite",
        filter: "drop-shadow(0 3px 8px rgba(245,158,11,0.16))"
      }}
    >
      <defs>
        <radialGradient id="cat-ground-glow-sleep" cx="0.5" cy="1" r="0.55">
          <stop offset="0%" stopColor="rgba(251, 191, 36, 0.45)" />
          <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
        </radialGradient>
      </defs>

      <ellipse cx="42" cy="58" rx="28" ry="4.5" fill="url(#cat-ground-glow-sleep)" />

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
      <path d="M 30 50 Q 36 47, 40 50 Q 36 52, 30 51 Z" fill="#fb923c" opacity="0.55" />
      <path d="M 50 51 Q 56 48, 60 52 Q 56 54, 50 53 Z" fill="#1e293b" opacity="0.45" />

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

      {/* Z 飘浮 */}
      <text
        x="68"
        y="22"
        fontSize="10"
        fill="#f59e0b"
        fontWeight="700"
        style={{ animation: "cat-z-float 2.6s ease-out infinite" }}
      >
        z
      </text>
      <text
        x="74"
        y="14"
        fontSize="7"
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
