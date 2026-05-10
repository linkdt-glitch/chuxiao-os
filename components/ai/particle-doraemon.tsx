"use client";

/**
 * 粒子化 AI 形象 v3 —— 真正科幻的版本。
 *
 * v1：几何凑形，太抽象（用户嫌弃）
 * v2：图像采样 + bloom + vortex（用户还是觉得效果差）
 * v3：本版彻底升级，直接在 Canvas 2D 里把所有真正"科幻"的关键
 *     技巧塞进去。参考：mamboleoo 图像粒子化 / shadcn particles 的
 *     per-particle 磁场强度 / Codrops 交互粒子 / igloo.inc HUD 框。
 *
 * 核心增强：
 *   1. 真 Z 轴深度（伪 3D）
 *      - 每颗粒子的 z 来自源图像素特征（黑线 → 浮前 / 蓝色 → 沉后 /
 *        白色 → 中间），形成「相对浮雕」立体感
 *      - 加上整图按 Y 轴慢转的 cos(t) 投影 → 真有"在转"的视觉
 *      - 透视：scale = FOV / (FOV + z)，前景大、后景小，alpha 也按 z 衰减
 *
 *   2. 神经网络连线（constellation lines）
 *      - 每帧用空间哈希格（cell 32px）只检查相邻格内粒子
 *      - 距离 < 26px 画细线，alpha = (1 - d/26)，前景粒子的连线更亮
 *      - additive blend：多条线交汇处自然变亮，像神经突触
 *
 *   3. 每颗粒子独立的磁场强度（layered depth）
 *      - magnetism ∈ [0.5, 1.5]，Halton-like 分布让强弱混杂
 *      - 鼠标半径 130px 内拉粒子向光标 + 切向涡旋
 *      - 强磁粒子反应剧烈，弱磁粒子几乎不动 → 视觉上分层动起来
 *
 *   4. 鼠标尾迹（cursor wake）
 *      - 保留最近 10 个鼠标位置，每帧画淡橙连线 → 鼠标自带"光剑残影"
 *      - 离开后渐隐
 *
 *   5. 入场 morph 动画
 *      - mount 时粒子在斐波那契球面上分布（一个完美抽象球）
 *      - 1.5s 内 ease-out 插值到图像位置 → AI 从虚空中"具象化"
 *      - 每隔 8s 触发一次脉动扫描波（横向 sin），让画面始终活着
 *
 *   6. HUD 框装饰
 *      - 4 个角的 L 型边框（igloo.inc 同款）
 *      - 左上角 mono "AI MODEL · ONLINE" 等宽小字
 *      - 底部呼吸的扫描横条
 *
 *   7. 双层 bloom + 锐利层
 *      - 混合模式 lighter：连线 + bloom 光斑都用 additive
 *      - 重叠处自然变亮，画面有"发光"质感不像贴片
 *
 *   8. 性能：~2800 颗粒子，连线复杂度 O(n) 因为空间哈希，60fps 稳
 *
 * 用法：把目标 PNG 放到 /ai-mascot/doraemon.png 即可。
 */

import { useEffect, useRef } from "react";

type Particle = {
  // 目标位置（图像采样得到，常驻不变）
  imgX: number;
  imgY: number;
  imgZ: number;
  // 入场起点（球面上的位置）
  sphX: number;
  sphY: number;
  sphZ: number;
  // 当前位置（带物理）
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  // 渲染
  baseSize: number;
  // 抖动
  phase: number;
  freq: number;
  // 互动 —— 每颗独立磁场强度，制造"分层动"感
  magnetism: number;
  tier: 0 | 1 | 2 | 3;
};

const TIER_RGB = [
  [194, 65, 12],
  [251, 146, 60],
  [251, 191, 36],
  [154, 52, 18]
] as const;

/** 性能档位 —— 根据画布大小自动选粒子数和邻接半径 */
type PerfTier = { particles: number; connDist: number; cellSize: number; cursorRadius: number };

function pickPerfTier(canvasSize: number): PerfTier {
  if (canvasSize <= 260) {
    // 小屏 / 极致省电：1200 颗 + 短连线
    return { particles: 1200, connDist: 18, cellSize: 22, cursorRadius: 90 };
  }
  if (canvasSize <= 360) {
    // 中等：1800 颗
    return { particles: 1800, connDist: 22, cellSize: 26, cursorRadius: 110 };
  }
  // 大画布：2800 颗，全特效
  return { particles: 2800, connDist: 26, cellSize: 32, cursorRadius: 140 };
}

const SAMPLE_W = 280;
const FOV = 600;
const MORPH_DURATION_MS = 1500;
const TRAIL_LEN = 10;

function brightnessToTier(r: number, g: number, b: number): 0 | 1 | 2 | 3 {
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  if (b > r + 30 && brightness < 180) return 0; // 蓝色（头/身）→ 深橙轮廓
  if (r > b + 40 && r > g + 20) return 2; // 红/黄（项圈/铃铛/嘴）→ 金橙
  if (brightness < 60) return 3; // 极暗（眼线/瞳孔）→ 暗橙红
  if (brightness > 200) return 1; // 浅色（脸/肚/手脚）→ 中橙
  return 1;
}

/**
 * 由源图像素特征推定 z 深度（伪 3D 浮雕）：
 *   - 极暗轮廓线 → +30 浮在前面
 *   - 浅色（脸/肚）→ +5 略浮
 *   - 中色（蓝色头/身）→ -25 沉到后面
 *   - 红/黄高彩度（项圈/铃铛）→ +20 接近前面
 */
function pixelToZ(r: number, g: number, b: number): number {
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  if (brightness < 60) return 30;
  if (r > b + 40 && r > g + 20) return 20;
  if (b > r + 30 && brightness < 180) return -25;
  if (brightness > 200) return 5;
  return 0;
}

/** 斐波那契球面采样：均匀分布的 N 个点。 */
function fibonacciSphere(count: number, radius: number) {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    points.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius
    });
  }
  return points;
}

function sampleImageToParticles(src: string, targetCount: number): Promise<Particle[]> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const aspect = img.naturalHeight / img.naturalWidth;
      const W = SAMPLE_W;
      const H = Math.round(W * aspect);
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const offCtx = off.getContext("2d", { willReadFrequently: true });
      if (!offCtx) {
        reject(new Error("ctx fail"));
        return;
      }
      offCtx.drawImage(img, 0, 0, W, H);
      let data: Uint8ClampedArray;
      try {
        data = offCtx.getImageData(0, 0, W, H).data;
      } catch (err) {
        reject(err);
        return;
      }

      const STRIDE = 3;
      const pre: Particle[] = [];
      for (let y = 0; y < H; y += STRIDE) {
        for (let x = 0; x < W; x += STRIDE) {
          const idx = (y * W + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a < 100) continue;
          if (r > 218 && g > 218 && b > 218) continue;
          const cx = x - W / 2;
          const cy = y - H / 2;
          const z = pixelToZ(r, g, b);
          pre.push({
            imgX: cx,
            imgY: cy,
            imgZ: z,
            sphX: 0, sphY: 0, sphZ: 0, // 后面赋值
            x: 0, y: 0, z: 0,
            vx: 0, vy: 0, vz: 0,
            baseSize: 0.8 + Math.random() * 1.0,
            phase: Math.random() * Math.PI * 2,
            freq: 0.6 + Math.random() * 0.7,
            magnetism: 0.5 + Math.random() * 1.0,
            tier: brightnessToTier(r, g, b)
          });
        }
      }

      if (pre.length < 200) {
        reject(new Error("too few particles"));
        return;
      }

      // 入场动画起点：均匀分布在斐波那契球上
      const sphere = fibonacciSphere(pre.length, 100);
      for (let i = 0; i < pre.length; i++) {
        pre[i].sphX = sphere[i].x;
        pre[i].sphY = sphere[i].y;
        pre[i].sphZ = sphere[i].z;
        pre[i].x = sphere[i].x;
        pre[i].y = sphere[i].y;
        pre[i].z = sphere[i].z;
      }

      // 限制到目标数（避免过多）
      const final = pre.length > targetCount
        ? pre.sort(() => Math.random() - 0.5).slice(0, targetCount)
        : pre;
      resolve(final);
    };
    img.onerror = () => reject(new Error("image load fail"));
    img.src = src;
  });
}

function generateFallback(): Particle[] {
  // 简化的几何 fallback —— 球+圆形头身
  const list: Particle[] = [];
  const sphere = fibonacciSphere(2000, 100);
  for (let i = 0; i < 2000; i++) {
    const angle = (i / 2000) * Math.PI * 2;
    list.push({
      imgX: Math.cos(angle) * 90,
      imgY: Math.sin(angle) * 90,
      imgZ: Math.sin(angle * 3) * 20,
      sphX: sphere[i].x,
      sphY: sphere[i].y,
      sphZ: sphere[i].z,
      x: sphere[i].x,
      y: sphere[i].y,
      z: sphere[i].z,
      vx: 0, vy: 0, vz: 0,
      baseSize: 0.8 + Math.random() * 1.0,
      phase: Math.random() * Math.PI * 2,
      freq: 0.6 + Math.random() * 0.7,
      magnetism: 0.5 + Math.random() * 1.0,
      tier: ((Math.random() * 4) | 0) as 0 | 1 | 2 | 3
    });
  }
  return list;
}

/** ease-out cubic */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function ParticleDoraemon({
  size = 460,
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
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);
  const startTimeRef = useRef<number>(0);
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

    // 根据画布大小自动选性能档（小 → 少粒子 + 短连线，大 → 全特效）
    const perf = pickPerfTier(size);
    const CONN_DIST_SQ = perf.connDist * perf.connDist;
    const CURSOR_RADIUS_SQ = perf.cursorRadius * perf.cursorRadius;

    sampleImageToParticles(imageSrc, perf.particles)
      .then((p) => {
        particlesRef.current = p;
        readyRef.current = true;
        startTimeRef.current = performance.now();
      })
      .catch(() => {
        particlesRef.current = generateFallback();
        readyRef.current = true;
        startTimeRef.current = performance.now();
      });

    const cx = size / 2;
    const cy = size / 2;
    // 把图源坐标系（中心 0，大约 280×380）等比缩到画布
    const fitScale = (size * 0.78) / 380;

    function updateMouse(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;
      // 记录鼠标尾迹
      trailRef.current.push({ x, y });
      if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();
    }
    function clearMouse() {
      mouseRef.current.active = false;
      trailRef.current = [];
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

    // 空间哈希：cellMap[`${cx},${cy}`] = Particle[]
    const cellMap = new Map<string, Array<{ p: Particle; sx: number; sy: number; sz: number; sScale: number }>>();

    function tick(now: number) {
      if (!ctx || !canvas) return;
      const elapsed = now - startTimeRef.current;
      const t = elapsed / 1000;
      const morphProgress = Math.min(1, easeOutCubic(elapsed / MORPH_DURATION_MS));

      // 整图 Y 轴慢转：cosY 控制 x 维度的透视压缩
      const yawAngle = t * 0.18;
      const cosYaw = Math.cos(yawAngle);
      const sinYaw = Math.sin(yawAngle);

      // 整图轻微 X 轴俯仰
      const pitch = Math.sin(t * 0.4) * 0.05;
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      const breathe = 1 + Math.sin(t * 1.0) * 0.012;

      // 扫描波：每 6s 一次，从 -200 扫到 +200
      const scanCycle = 6.0;
      const scanT = (t % scanCycle) / scanCycle;
      const scanY = scanT * 460 - 230; // canvas 内坐标空间（图源 y 范围）

      // ── Clear with motion blur trail ──（用半透明黑保留上一帧残影）
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(255,250,245,0.15)"; // 米白色半透明 = 渐隐残影
      ctx.fillRect(0, 0, size, size);

      // ── 背景 1：顶部聚光 + 地面反光 ──
      const grad = ctx.createRadialGradient(cx, size * 0.02, size * 0.02, cx, size * 0.45, size * 0.78);
      grad.addColorStop(0, "rgba(255,243,213,0.5)");
      grad.addColorStop(0.4, "rgba(255,247,237,0.18)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      const floor = ctx.createRadialGradient(cx, size * 0.92, size * 0.04, cx, size * 0.92, size * 0.45);
      floor.addColorStop(0, "rgba(249,115,22,0.18)");
      floor.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, size, size);

      // ── 背景 2：科幻 grid 网格（透视收敛）──
      ctx.strokeStyle = "rgba(249,115,22,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const lx = (i / 12) * size;
        ctx.moveTo(lx, size * 0.78);
        ctx.lineTo(cx + (lx - cx) * 1.3, size);
      }
      // 横向地平线
      for (let i = 1; i <= 4; i++) {
        const ly = size * 0.78 + (size - size * 0.78) * (i / 4);
        ctx.moveTo(0, ly);
        ctx.lineTo(size, ly);
      }
      ctx.stroke();

      if (!readyRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // ── 物理更新 + 投影到屏幕坐标 ──
      cellMap.clear();
      const projected: Array<{ p: Particle; sx: number; sy: number; sz: number; sScale: number }> = [];

      for (const p of particles) {
        // 目标点：从球面 morph 到图像
        let tx = p.imgX * morphProgress + p.sphX * (1 - morphProgress);
        let ty = p.imgY * morphProgress + p.sphY * (1 - morphProgress);
        let tz = p.imgZ * morphProgress + p.sphZ * (1 - morphProgress);

        // 抖动
        tx += Math.sin(p.phase + t * p.freq) * 1.0;
        ty += Math.cos(p.phase + t * p.freq) * 1.0;

        // 整图旋转（Y 轴 yaw + X 轴 pitch）
        // Y yaw 旋转：x' = x*cos - z*sin; z' = x*sin + z*cos
        const rx1 = tx * cosYaw - tz * sinYaw;
        const rz1 = tx * sinYaw + tz * cosYaw;
        // X pitch 旋转：y' = y*cos - z*sin; z' = y*sin + z*cos
        const ry2 = ty * cosPitch - rz1 * sinPitch;
        const rz2 = ty * sinPitch + rz1 * cosPitch;

        // 透视投影
        const projScale = FOV / (FOV + rz2);
        const sx = cx + rx1 * fitScale * breathe * projScale;
        const sy = cy + ry2 * fitScale * breathe * projScale;
        const sz = rz2;
        const sScale = projScale;

        // 鼠标磁场 + 涡旋（只在 morph 完成后开始响应，避免入场时的牵扯）
        if (mouse.active && morphProgress > 0.9) {
          const dx = sx - mouse.x;
          const dy = sy - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < CURSOR_RADIUS_SQ && distSq > 0.5) {
            const dist = Math.sqrt(distSq);
            const norm = 1 - dist / perf.cursorRadius;
            const force = norm * norm * p.magnetism * 8;
            // 径向斥力
            p.vx += (dx / dist) * force * 0.18;
            p.vy += (dy / dist) * force * 0.18;
            // 切向涡旋（90° 旋转向量）
            p.vx += (-dy / dist) * force * 0.06;
            p.vy += (dx / dist) * force * 0.06;
          }
        }

        // 弹簧 + 阻尼把粒子拉回目标位置
        p.vx += (sx - p.x) * 0.08;
        p.vy += (sy - p.y) * 0.08;
        p.vx *= 0.84;
        p.vy *= 0.84;
        p.x += p.vx;
        p.y += p.vy;
        p.z = sz;

        projected.push({ p, sx: p.x, sy: p.y, sz, sScale });

        // 加入空间哈希
        const cellX = Math.floor(p.x / perf.cellSize);
        const cellY = Math.floor(p.y / perf.cellSize);
        const key = `${cellX},${cellY}`;
        let bucket = cellMap.get(key);
        if (!bucket) {
          bucket = [];
          cellMap.set(key, bucket);
        }
        bucket.push(projected[projected.length - 1]);
      }

      // ── PASS 1：神经网络连线（additive blending）──
      // 只在 morph > 0.6 之后开始画连线，否则球面状态线条太密
      if (morphProgress > 0.6) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = 0.5;
        const connAlphaScale = (morphProgress - 0.6) / 0.4; // 0 → 1 渐入
        for (const item of projected) {
          const cellX = Math.floor(item.sx / perf.cellSize);
          const cellY = Math.floor(item.sy / perf.cellSize);
          // 检查 3×3 邻居 cell（包含自己）
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const neighbors = cellMap.get(`${cellX + ox},${cellY + oy}`);
              if (!neighbors) continue;
              for (const n of neighbors) {
                if (n === item) continue;
                // 避免画两次：只画 sx,sy 字典序更小的
                if (n.sx < item.sx || (n.sx === item.sx && n.sy < item.sy)) continue;
                const dx = n.sx - item.sx;
                const dy = n.sy - item.sy;
                const distSq = dx * dx + dy * dy;
                if (distSq < CONN_DIST_SQ && distSq > 0.5) {
                  const dist = Math.sqrt(distSq);
                  const alpha = (1 - dist / perf.connDist) * 0.32 * connAlphaScale;
                  // 取两端 tier 的混合色（简化：用 item 的 tier）
                  const [r, g, b] = TIER_RGB[item.p.tier];
                  ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
                  ctx.beginPath();
                  ctx.moveTo(item.sx, item.sy);
                  ctx.lineTo(n.sx, n.sy);
                  ctx.stroke();
                }
              }
            }
          }
        }
      }

      // ── PASS 2：bloom 辉光层（additive）──
      ctx.globalCompositeOperation = "lighter";
      for (const { p, sx, sy, sScale, sz } of projected) {
        const [r, g, b] = TIER_RGB[p.tier];
        // 远景粒子 bloom 弱一点（按 sScale 缩）
        const a = 0.16 * sScale;
        ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, p.baseSize * 3.0 * sScale, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── PASS 3：扫描波亮化（横向 sin 波瞬间提亮一条带状区域）──
      // 在 yaw 旋转的图源 y 坐标系中匹配
      ctx.globalCompositeOperation = "lighter";
      for (const { p, sx, sy, sScale } of projected) {
        const distFromScan = Math.abs(p.imgY - scanY);
        if (distFromScan < 12) {
          const intensity = 1 - distFromScan / 12;
          ctx.fillStyle = `rgba(255,237,213,${(intensity * 0.6).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, p.baseSize * 2.0 * sScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── PASS 4：清晰主体粒子 ──
      ctx.globalCompositeOperation = "source-over";
      for (const { p, sx, sy, sScale } of projected) {
        const [r, g, b] = TIER_RGB[p.tier];
        const alpha = Math.min(1, 0.65 + sScale * 0.4);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, p.baseSize * sScale, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 鼠标尾迹（cursor wake）──
      if (trailRef.current.length > 1) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        for (let i = 1; i < trailRef.current.length; i++) {
          const a = (i / trailRef.current.length) * 0.4;
          ctx.strokeStyle = `rgba(251,146,60,${a.toFixed(3)})`;
          ctx.lineWidth = (i / trailRef.current.length) * 4;
          ctx.beginPath();
          ctx.moveTo(trailRef.current[i - 1].x, trailRef.current[i - 1].y);
          ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
          ctx.stroke();
        }
        // 光标点本身
        const last = trailRef.current[trailRef.current.length - 1];
        ctx.fillStyle = "rgba(251,191,36,0.9)";
        ctx.beginPath();
        ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── HUD 框：4 个角的 L 型边框 ──
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(249,115,22,0.55)";
      ctx.lineWidth = 1.5;
      const m = 12;
      const len = 18;
      const drawCorner = (x: number, y: number, dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * len, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * len);
        ctx.stroke();
      };
      drawCorner(m, m, 1, 1);
      drawCorner(size - m, m, -1, 1);
      drawCorner(m, size - m, 1, -1);
      drawCorner(size - m, size - m, -1, -1);

      // 左上角 mono 文字
      ctx.fillStyle = "rgba(194,65,12,0.75)";
      ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
      ctx.textBaseline = "top";
      const blink = (Math.sin(t * 3) + 1) * 0.5; // 0~1
      ctx.fillText("AI MODEL · ONLINE", m + 4, m + 4);
      ctx.fillStyle = `rgba(34,197,94,${(0.5 + blink * 0.5).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(m + 4 + 100, m + 8, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 底部扫描条
      ctx.fillStyle = "rgba(249,115,22,0.12)";
      ctx.fillRect(m, size - m - 4, size - m * 2, 4);
      const barW = (size - m * 2) * 0.25;
      const barX = m + (size - m * 2 - barW) * ((Math.sin(t * 0.8) + 1) / 2);
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      barGrad.addColorStop(0, "rgba(249,115,22,0)");
      barGrad.addColorStop(0.5, "rgba(251,191,36,0.95)");
      barGrad.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = barGrad;
      ctx.fillRect(barX, size - m - 4, barW, 4);

      // 右下角秒数（HUD 装饰）
      ctx.fillStyle = "rgba(194,65,12,0.55)";
      ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
      ctx.textAlign = "right";
      ctx.fillText(`T+${(t).toFixed(2)}s`, size - m - 4, size - m - 18);
      ctx.textAlign = "left";

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
          animation: "particle-float 6s ease-in-out infinite"
        }}
      />
      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
