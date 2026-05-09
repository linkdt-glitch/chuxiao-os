"use client";

/**
 * 橙色多啦A梦粒子云 —— 灵感来自 igloo.inc 那个 3D 粒子角色舱。
 *
 * 不用 Three.js（500KB+ bundle 不值），纯 Canvas 2D 手写：
 *   - ~3500 颗粒子按多啦A梦轮廓分布（头/脸/眼/项圈/铃铛/身体/口袋/手脚）
 *   - 每颗粒子独立呼吸 + 整体缓慢左右轻微摇摆 + 整体呼吸缩放
 *   - 鼠标悬停：粒子向光标方向被「斥力推开」，光标离开后弹簧回归原位
 *   - 移动端：触摸代替鼠标
 *   - 全部 4 个 tier 的橙色调（深橙轮廓 / 浅橙填充 / 亮橙高光 / 暗橙特征）
 *
 * 性能考量：
 *   - 粒子位置预计算，每帧只算 jitter + 斥力
 *   - 不画粒子之间的连线（O(n²) 太贵）
 *   - 用 CSS blur(0.5px) 让粒子有柔和的"果冻"感而非硬点
 *   - DPR 自适应（HiDPI 屏不发糊）
 *
 * 用法：
 *   <ParticleDoraemon size={420} />
 */

import { useEffect, useRef } from "react";

type Particle = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  freq: number;
  tier: 0 | 1 | 2 | 3;
};

/** 4 个橙色档位 —— 越深的档位用得越少（轮廓 / 特征），越浅的越多（填充）。 */
const TIER_COLORS = [
  "rgba(194,65,12,0.95)",  // tier 0：深橙（轮廓）
  "rgba(251,146,60,0.85)", // tier 1：中橙（填充）
  "rgba(251,191,36,0.95)", // tier 2：金橙（特征：项圈、铃铛、嘴）
  "rgba(154,52,18,0.95)"   // tier 3：暗橙红（瞳孔）
] as const;

/** 多啦A梦的轮廓由几个简单几何体组成，用相对坐标（中心为原点，y 向下）。 */
type Part =
  | { kind: "circle"; cx: number; cy: number; r: number; density: number; tier: 0 | 1 | 2 | 3; ring?: boolean }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; density: number; tier: 0 | 1 | 2 | 3; ring?: boolean }
  | { kind: "rect"; x: number; y: number; w: number; h: number; density: number; tier: 0 | 1 | 2 | 3 }
  | { kind: "arc"; cx: number; cy: number; r: number; from: number; to: number; density: number; tier: 0 | 1 | 2 | 3 };

/**
 * 多啦A梦零件清单（橙色调）。坐标系：中心 (0,0)，单位 px，y 向下。
 * 整个图大约 320 × 380px，会按 size 缩放。
 */
const PARTS: Part[] = [
  // 头部轮廓（深橙环）
  { kind: "circle", cx: 0, cy: -110, r: 100, density: 1.6, tier: 0, ring: true },
  // 脸部填充（中橙）
  { kind: "ellipse", cx: 0, cy: -90, rx: 75, ry: 65, density: 0.55, tier: 1 },
  // 左眼眼白（金橙）
  { kind: "circle", cx: -22, cy: -125, r: 16, density: 1.6, tier: 2 },
  // 右眼眼白（金橙）
  { kind: "circle", cx: 22, cy: -125, r: 16, density: 1.6, tier: 2 },
  // 左瞳（暗橙）
  { kind: "circle", cx: -16, cy: -122, r: 5, density: 4.5, tier: 3 },
  // 右瞳（暗橙）
  { kind: "circle", cx: 16, cy: -122, r: 5, density: 4.5, tier: 3 },
  // 鼻子（暗橙小圆）
  { kind: "circle", cx: 0, cy: -90, r: 8, density: 3.2, tier: 3 },
  // 嘴巴（金橙小弧）
  { kind: "arc", cx: 0, cy: -65, r: 18, from: Math.PI * 0.15, to: Math.PI * 0.85, density: 2.0, tier: 2 },
  // 项圈（金橙横条）
  { kind: "rect", x: -75, y: -25, w: 150, h: 11, density: 1.4, tier: 2 },
  // 铃铛（金橙圆）
  { kind: "circle", cx: 0, cy: -8, r: 14, density: 2.0, tier: 2 },
  // 铃铛中心（暗橙）
  { kind: "circle", cx: 0, cy: -8, r: 4, density: 4.0, tier: 3 },
  // 身体轮廓（深橙环）
  { kind: "ellipse", cx: 0, cy: 70, rx: 90, ry: 78, density: 1.4, tier: 0, ring: true },
  // 肚子白圈（中橙填充，密度低让头脸视觉对比）
  { kind: "circle", cx: 0, cy: 70, r: 60, density: 0.4, tier: 1 },
  // 4D 口袋轮廓（深橙弧）
  { kind: "arc", cx: 0, cy: 70, r: 42, from: 0, to: Math.PI, density: 2.4, tier: 0 },
  // 左手（中橙圆）
  { kind: "circle", cx: -100, cy: 50, r: 20, density: 1.4, tier: 1 },
  // 右手（中橙圆）
  { kind: "circle", cx: 100, cy: 50, r: 20, density: 1.4, tier: 1 },
  // 左脚（中橙椭圆）
  { kind: "ellipse", cx: -32, cy: 160, rx: 32, ry: 14, density: 1.4, tier: 1 },
  // 右脚（中橙椭圆）
  { kind: "ellipse", cx: 32, cy: 160, rx: 32, ry: 14, density: 1.4, tier: 1 }
];

const TARGET_PARTICLES = 3500;

function generateParticles(): Particle[] {
  // 总「面积权重」用于决定每个 part 分到多少粒子
  const totalWeight = PARTS.reduce((sum, p) => sum + partWeight(p) * p.density, 0);
  const particles: Particle[] = [];

  for (const part of PARTS) {
    const count = Math.floor((partWeight(part) * part.density / totalWeight) * TARGET_PARTICLES);
    for (let i = 0; i < count; i++) {
      const pos = sampleInPart(part);
      particles.push({
        baseX: pos.x,
        baseY: pos.y,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        size: 0.7 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
        freq: 0.6 + Math.random() * 0.8,
        tier: part.tier
      });
    }
  }
  return particles;
}

function partWeight(part: Part): number {
  if (part.kind === "circle") return Math.PI * part.r * part.r;
  if (part.kind === "ellipse") return Math.PI * part.rx * part.ry;
  if (part.kind === "rect") return part.w * part.h;
  // arc: 弧形带宽近似 r * (to-from) * thickness
  return part.r * (part.to - part.from) * 8;
}

function sampleInPart(part: Part): { x: number; y: number } {
  if (part.kind === "circle") {
    if (part.ring) {
      // 环：均匀采样在 r 附近 ± 5
      const angle = Math.random() * Math.PI * 2;
      const r = part.r + (Math.random() - 0.5) * 8;
      return { x: part.cx + Math.cos(angle) * r, y: part.cy + Math.sin(angle) * r };
    }
    // 实心圆：sqrt 分布保证均匀面积
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * part.r;
    return { x: part.cx + Math.cos(angle) * r, y: part.cy + Math.sin(angle) * r };
  }
  if (part.kind === "ellipse") {
    if (part.ring) {
      const angle = Math.random() * Math.PI * 2;
      const t = 1 + (Math.random() - 0.5) * 0.08;
      return { x: part.cx + Math.cos(angle) * part.rx * t, y: part.cy + Math.sin(angle) * part.ry * t };
    }
    const angle = Math.random() * Math.PI * 2;
    const t = Math.sqrt(Math.random());
    return { x: part.cx + Math.cos(angle) * part.rx * t, y: part.cy + Math.sin(angle) * part.ry * t };
  }
  if (part.kind === "rect") {
    return { x: part.x + Math.random() * part.w, y: part.y + Math.random() * part.h };
  }
  // arc：弧上采样 + 厚度
  const angle = part.from + Math.random() * (part.to - part.from);
  const r = part.r + (Math.random() - 0.5) * 8;
  return { x: part.cx + Math.cos(angle) * r, y: part.cy + Math.sin(angle) * r };
}

export function ParticleDoraemon({
  size = 420,
  className,
  ariaLabel = "AI 智能体（多啦A梦形象）"
}: {
  size?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // DPR 适配：HiDPI 屏不发糊
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // 生成粒子（一次性）
    if (particlesRef.current.length === 0) {
      particlesRef.current = generateParticles();
    }

    // 整个图原始坐标范围 ≈ 280 宽 × 380 高，要 fit 进 size × size
    // 留 12% padding
    const fitScale = (size * 0.88) / 380;
    const cx = size / 2;
    const cy = size / 2;

    // 鼠标 / 触摸 → 转成 canvas 坐标
    function updateMouse(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current.x = clientX - rect.left;
      mouseRef.current.y = clientY - rect.top;
      mouseRef.current.active = true;
    }
    function clearMouse() {
      mouseRef.current.active = false;
    }
    function onMouseMove(e: MouseEvent) {
      updateMouse(e.clientX, e.clientY);
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (t) updateMouse(t.clientX, t.clientY);
    }
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", clearMouse);
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", clearMouse);

    let frame = 0;
    function tick() {
      if (!ctx || !canvas) return;
      frame += 1;
      const t = frame / 60; // 大约秒数

      // 整体呼吸 + 轻微旋转（伪 3D：把 x 乘以 cos(t*0.4)，给粒子云一种"在转"的错觉）
      const breathe = 1 + Math.sin(t * 1.2) * 0.012;
      const sway = Math.cos(t * 0.5) * 6;
      const rotateCos = Math.cos(t * 0.4) * 0.04 + 1; // 0.96 ~ 1.04 范围

      ctx.clearRect(0, 0, size, size);

      // 背景柔光（顶部弧形 spotlight）
      const grad = ctx.createRadialGradient(cx, size * 0.1, size * 0.05, cx, size * 0.4, size * 0.7);
      grad.addColorStop(0, "rgba(254,243,199,0.55)");
      grad.addColorStop(0.4, "rgba(255,247,237,0.25)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // 反光地面（椭圆模糊光斑）
      const floor = ctx.createRadialGradient(cx, size * 0.85, size * 0.05, cx, size * 0.85, size * 0.35);
      floor.addColorStop(0, "rgba(249,115,22,0.18)");
      floor.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, size, size);

      // 画粒子
      const mouse = mouseRef.current;
      const repelRadius = 70;
      const repelStrength = 28;

      for (const p of particlesRef.current) {
        // 粒子自身呼吸（每颗独立 sin 偏移）
        const jx = Math.sin(p.phase + t * p.freq) * 1.2;
        const jy = Math.cos(p.phase + t * p.freq) * 1.2;

        // 目标位置（基础位置 + 抖动 + 全局缩放/摇摆/伪 3D）
        const targetX = cx + (p.baseX * rotateCos + jx + sway) * fitScale * breathe;
        const targetY = cy + (p.baseY + jy) * fitScale * breathe;

        // 鼠标斥力
        if (mouse.active) {
          const dx = targetX - mouse.x;
          const dy = targetY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < repelRadius && dist > 0.001) {
            const force = ((repelRadius - dist) / repelRadius) * repelStrength;
            p.vx += (dx / dist) * force * 0.08;
            p.vy += (dy / dist) * force * 0.08;
          }
        }

        // 弹簧回归到目标位置
        p.vx += (targetX - p.x) * 0.08;
        p.vy += (targetY - p.y) * 0.08;
        // 阻尼
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = TIER_COLORS[p.tier];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", clearMouse);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", clearMouse);
    };
  }, [size]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        // 顶部柔光 + 底部地面渐变（CSS 层，与 canvas 内的 spotlight 配合）
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,237,213,0.6) 0%, rgba(255,255,255,0) 60%)"
      }}
      aria-label={ariaLabel}
      role="img"
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          // 微微 blur 让粒子柔化（"果冻"感而非硬像素）
          filter: "blur(0.4px)",
          // 整体微微浮动
          animation: "particle-float 6s ease-in-out infinite"
        }}
      />
      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
