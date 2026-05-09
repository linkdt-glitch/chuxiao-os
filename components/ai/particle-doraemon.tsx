"use client";

/**
 * 粒子化 AI 形象（默认多啦A梦）—— 灵感来自 igloo.inc 的 3D 粒子角色舱。
 *
 * v2 升级（v1 用几何形状凑外形，太抽象 → 不像）：
 *   1. 改用 **图片像素采样** —— 加载 /ai-mascot/doraemon.png（透明背景 PNG），
 *      在隐藏 canvas 上绘制后用 getImageData 把每个非透明像素变成一颗粒子。
 *      结果：是真正的「多啦A梦轮廓 + 细节」而不是几何积木。
 *   2. 像素颜色 → 橙色调映射 —— 把原图明暗映射到 4 档橙色（深/中/金/暗），
 *      保留细节层次但全身染成系统品牌橙。
 *   3. 加 **Bloom 辉光层** —— 每颗粒子先用 globalCompositeOperation="lighter"
 *      画一个大而透明的光斑（粒子云有"发光"质感），再画清晰主体粒子。
 *   4. 鼠标 / 触摸接近时改成 **vortex 涡旋斥力** —— 粒子既被推开也带切向旋转，
 *      离手指 30-80px 时受力最大，外圈到 120px 衰减为 0。
 *   5. 加 **环境星尘** —— 主体外随机飘 ~60 颗微小星，缓慢漂移衰减后重生。
 *
 * 使用方法：
 *   1. 默认载入 /ai-mascot/doraemon.png（建议 PNG 透明背景，512×512+，
 *      正面对镜头，留 10% 边距）
 *   2. 若图未上传 / 加载失败，自动降级到几何回退版（仍可用，但抽象）
 *   3. 自定义其它形象只需把 imageSrc 换成别的文件
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

type Sparkle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

/**
 * 4 档橙色调（按 RGB 数组返回，方便 globalCompositeOperation="lighter"
 * 配合不同 alpha 用同一组颜色画 bloom + sharp）。
 *   - tier 0：深橙轮廓（rgb(194,65,12)）
 *   - tier 1：中橙填充（rgb(251,146,60)）
 *   - tier 2：金橙特征（rgb(251,191,36)）—— 项圈 / 铃铛 / 嘴
 *   - tier 3：暗橙红瞳孔（rgb(154,52,18)）
 */
const TIER_RGB: ReadonlyArray<readonly [number, number, number]> = [
  [194, 65, 12],
  [251, 146, 60],
  [251, 191, 36],
  [154, 52, 18]
];

/**
 * 把源图像素的明暗映射到 4 档橙色。
 *   - 极暗（轮廓 / 头部色块）→ tier 0 深橙
 *   - 中暗（项圈 / 铃铛 / 眼睛）→ tier 2 金橙
 *   - 中亮（脸 / 肚 / 手脚）→ tier 1 中橙
 *   - 极暗+饱和（瞳孔 / 极线）→ tier 3 暗橙红
 */
function brightnessToTier(r: number, g: number, b: number): 0 | 1 | 2 | 3 {
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  // 蓝色（多啦A梦头/身）通常 r 低、b 高 —— 映成 tier 0（深橙轮廓）
  if (b > r + 30 && brightness < 180) return 0;
  // 红色（项圈/鼻子）→ tier 2 金橙
  if (r > b + 40 && r > g + 20) return 2;
  // 黑色（眼线/瞳孔）→ tier 3 暗橙红
  if (brightness < 60) return 3;
  // 白色高亮（脸/肚/手脚）→ tier 1 中橙
  if (brightness > 200) return 1;
  // 默认中橙填充
  return 1;
}

/** 把 image 转成粒子数组。失败抛异常让 caller 走 fallback。 */
function sampleImageToParticles(src: string): Promise<Particle[]> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // 把图缩到一个统一坐标系（300 宽，高度按比例），方便后续 fitScale 控制
      const TARGET_W = 300;
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const TARGET_H = Math.round(TARGET_W * aspectRatio);
      const off = document.createElement("canvas");
      off.width = TARGET_W;
      off.height = TARGET_H;
      const offCtx = off.getContext("2d", { willReadFrequently: true });
      if (!offCtx) {
        reject(new Error("offscreen canvas ctx fail"));
        return;
      }
      offCtx.drawImage(img, 0, 0, TARGET_W, TARGET_H);
      let data: Uint8ClampedArray;
      try {
        data = offCtx.getImageData(0, 0, TARGET_W, TARGET_H).data;
      } catch (err) {
        // 跨域 taint，无法 read → 走 fallback
        reject(err);
        return;
      }

      const STRIDE = 3; // 每 3 像素采一颗，~3000-4500 颗粒子
      const particles: Particle[] = [];

      for (let y = 0; y < TARGET_H; y += STRIDE) {
        for (let x = 0; x < TARGET_W; x += STRIDE) {
          const idx = (y * TARGET_W + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          // 跳过透明像素（透明 PNG）
          if (a < 100) continue;
          // 跳过白底背景（webp / jpg 转 png 后可能没 alpha，靠灰度过滤）
          // 阈值 218：略低于真实白色（255）但比通常 anti-aliased 边缘灰度（200~210）高，
          // 既能滤掉白底 + 边缘灰区，又保留浅色细节如脸颊高光
          if (r > 218 && g > 218 && b > 218) continue;
          const cx = x - TARGET_W / 2;
          const cy = y - TARGET_H / 2;
          particles.push({
            baseX: cx,
            baseY: cy,
            x: cx,
            y: cy,
            vx: 0,
            vy: 0,
            size: 0.7 + Math.random() * 1.0,
            phase: Math.random() * Math.PI * 2,
            freq: 0.6 + Math.random() * 0.8,
            tier: brightnessToTier(r, g, b)
          });
        }
      }

      if (particles.length < 200) {
        reject(new Error("too few particles sampled (image might be empty)"));
        return;
      }
      resolve(particles);
    };
    img.onerror = () => reject(new Error("image load fail"));
    img.src = src;
  });
}

// ─────────────────────────────────────────────────────────────────────
// Fallback：图加载失败时用几何形状凑（v1 老代码精简版，仍可用）
// ─────────────────────────────────────────────────────────────────────
function generateFallbackParticles(): Particle[] {
  const particles: Particle[] = [];
  const push = (x: number, y: number, tier: 0 | 1 | 2 | 3) => {
    particles.push({
      baseX: x,
      baseY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      size: 0.7 + Math.random() * 1.0,
      phase: Math.random() * Math.PI * 2,
      freq: 0.6 + Math.random() * 0.8,
      tier
    });
  };
  // 头（深橙环 + 中橙填充）
  for (let i = 0; i < 700; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 100 + (Math.random() - 0.5) * 8;
    push(Math.cos(angle) * r, -110 + Math.sin(angle) * r, 0);
  }
  for (let i = 0; i < 400; i++) {
    const angle = Math.random() * Math.PI * 2;
    const t = Math.sqrt(Math.random()) * 70;
    push(Math.cos(angle) * t, -90 + Math.sin(angle) * t * 0.85, 1);
  }
  // 身体
  for (let i = 0; i < 800; i++) {
    const angle = Math.random() * Math.PI * 2;
    const t = 1 + (Math.random() - 0.5) * 0.06;
    push(Math.cos(angle) * 90 * t, 70 + Math.sin(angle) * 78 * t, 0);
  }
  for (let i = 0; i < 400; i++) {
    const angle = Math.random() * Math.PI * 2;
    const t = Math.sqrt(Math.random()) * 60;
    push(Math.cos(angle) * t, 70 + Math.sin(angle) * t, 1);
  }
  return particles;
}

export function ParticleDoraemon({
  size = 420,
  className,
  imageSrc = "/ai-mascot/doraemon.png",
  ariaLabel = "AI 智能体（多啦A梦形象）"
}: {
  size?: number;
  className?: string;
  imageSrc?: string;
  ariaLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const rafRef = useRef<number | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // 异步加载图，失败走 fallback
    sampleImageToParticles(imageSrc)
      .then((particles) => {
        particlesRef.current = particles;
        readyRef.current = true;
      })
      .catch(() => {
        particlesRef.current = generateFallbackParticles();
        readyRef.current = true;
      });

    // 初始化环境星尘
    sparklesRef.current = Array.from({ length: 60 }, () => makeSparkle(size));

    const fitScale = (size * 0.86) / 380;
    const cx = size / 2;
    const cy = size / 2;

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
      const t = frame / 60;
      const breathe = 1 + Math.sin(t * 1.2) * 0.014;
      const sway = Math.cos(t * 0.5) * 6;
      const rotateCos = Math.cos(t * 0.4) * 0.04 + 1;

      // 完全清空
      ctx.clearRect(0, 0, size, size);

      // 背景柔光（顶部 spotlight）
      const grad = ctx.createRadialGradient(cx, size * 0.08, size * 0.02, cx, size * 0.45, size * 0.75);
      grad.addColorStop(0, "rgba(254,243,199,0.55)");
      grad.addColorStop(0.4, "rgba(255,247,237,0.25)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // 反光地面
      const floor = ctx.createRadialGradient(cx, size * 0.88, size * 0.05, cx, size * 0.88, size * 0.4);
      floor.addColorStop(0, "rgba(249,115,22,0.20)");
      floor.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, size, size);

      // ── 环境星尘（主体外飘动的小亮点）──
      ctx.globalCompositeOperation = "lighter";
      for (const s of sparklesRef.current) {
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 1;
        const alpha = Math.max(0, Math.sin((s.life / s.maxLife) * Math.PI)) * 0.6;
        ctx.fillStyle = `rgba(251,191,36,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        if (s.life <= 0) {
          // 重生
          Object.assign(s, makeSparkle(size));
        }
      }

      if (!readyRef.current) {
        // 还没加载完粒子 —— 画个临时 loading 圈
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(249,115,22,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 28 + Math.sin(t * 3) * 4, 0, Math.PI * 2);
        ctx.stroke();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const repelInner = 30;
      const repelOuter = 110;

      // ── 第一遍：BLOOM 辉光层（lighter 混合，大半径低 alpha 形成发光）──
      for (const p of particles) {
        // 抖动
        const jx = Math.sin(p.phase + t * p.freq) * 1.4;
        const jy = Math.cos(p.phase + t * p.freq) * 1.4;
        const targetX = cx + (p.baseX * rotateCos + jx + sway) * fitScale * breathe;
        const targetY = cy + (p.baseY + jy) * fitScale * breathe;

        // Vortex 斥力 + 切向旋转
        if (mouse.active) {
          const dx = targetX - mouse.x;
          const dy = targetY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < repelOuter && dist > 0.01) {
            // 距离归一化（中心 0 → 内圈最强、外圈衰减为 0）
            const norm = dist < repelInner ? 1 : 1 - (dist - repelInner) / (repelOuter - repelInner);
            const force = norm * 30;
            // 径向斥力
            p.vx += (dx / dist) * force * 0.08;
            p.vy += (dy / dist) * force * 0.08;
            // 切向旋转（90° 旋转向量 = -dy, dx）→ 制造涡旋
            p.vx += (-dy / dist) * force * 0.025;
            p.vy += (dx / dist) * force * 0.025;
          }
        }

        // 弹簧 + 阻尼
        p.vx += (targetX - p.x) * 0.085;
        p.vy += (targetY - p.y) * 0.085;
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += p.vx;
        p.y += p.vy;

        const [r, g, b] = TIER_RGB[p.tier];
        ctx.fillStyle = `rgba(${r},${g},${b},0.18)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 第二遍：清晰主体粒子（恢复正常混合）──
      ctx.globalCompositeOperation = "source-over";
      for (const p of particles) {
        const [r, g, b] = TIER_RGB[p.tier];
        ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
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
  }, [size, imageSrc]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
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
          // 微 blur + 浮动让粒子云有"活体"感
          filter: "blur(0.3px)",
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

function makeSparkle(size: number): Sparkle {
  const angle = Math.random() * Math.PI * 2;
  const r = size * (0.4 + Math.random() * 0.45); // 远离中心区出现
  const cx = size / 2 + Math.cos(angle) * r;
  const cy = size / 2 + Math.sin(angle) * r;
  return {
    x: cx,
    y: cy,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3 - 0.1, // 略向上飘
    life: 60 + Math.random() * 240,
    maxLife: 200,
    size: 0.6 + Math.random() * 1.2
  };
}
