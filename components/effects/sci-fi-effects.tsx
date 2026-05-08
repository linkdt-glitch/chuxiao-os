"use client";

import { useEffect } from "react";

/**
 * SciFiEffects — global interactive + ambient visual engine
 *
 * 1. Particle constellation  – 40 floating dots with connecting lines (always running)
 * 2. Cursor glow orb         – soft 380px orange radial gradient trails the cursor
 * 3. Card spotlight           – inner light follows mouse inside [data-spotlight] cards
 * 4. Click ripple             – expanding neon ring on every click
 * 5. Interactive boost        – orb intensifies near buttons / links
 */
export function SciFiEffects() {
  useEffect(() => {
    // Respect reduced-motion + skip on small devices to save battery / CPU.
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = typeof window !== "undefined" && window.innerWidth < 640;

    // ── 1. Particle constellation canvas ──────────────────────────
    // Tuned for performance: lower N, no per-frame radial-gradient halos,
    // squared-distance check (no sqrt), visibility-aware RAF.
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `
      position: fixed; inset: 0; z-index: 0;
      pointer-events: none; user-select: none;
      opacity: 1;
    `;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true })!;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; o: number };
    // 45 → 18 desktop, 0 mobile. Halve N if reduced motion.
    const N = reducedMotion ? 0 : isSmall ? 0 : 18;
    const particles: Particle[] = Array.from({ length: N }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.30,
      vy: (Math.random() - 0.5) * 0.30,
      r:  Math.random() * 1.2 + 0.5,
      // 白底下橙色粒子需要更低 alpha 才不显眼（深色主题用 0.15-0.55）
      o:  Math.random() * 0.16 + 0.06,
    }));

    let particleRaf: number | undefined;
    const LINK_DIST = 130;
    const LINK_DIST_SQ = LINK_DIST * LINK_DIST;

    // shadowBlur once instead of per-particle radial gradient
    ctx.shadowColor = "rgba(249,115,22,0.55)";

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Lines between nearby particles — squared distance, no sqrt.
      ctx.lineWidth = 0.6;
      for (let i = 0; i < N; i++) {
        const pi = particles[i];
        for (let j = i + 1; j < N; j++) {
          const pj = particles[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < LINK_DIST_SQ) {
            const alpha = 0.04 * (1 - Math.sqrt(dSq) / LINK_DIST);
            ctx.strokeStyle = `rgba(249,115,22,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.stroke();
          }
        }
      }

      // Dots — single fillStyle batch per particle, shadowBlur for halo.
      ctx.shadowBlur = 6;
      for (const p of particles) {
        ctx.fillStyle = `rgba(249,115,22,${p.o.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Move + wrap
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = canvas.width + 10;
        else if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        else if (p.y > canvas.height + 10) p.y = -10;
      }
      ctx.shadowBlur = 0;

      particleRaf = requestAnimationFrame(drawParticles);
    };

    // Pause animation when tab is hidden — meaningful CPU saving.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (particleRaf) cancelAnimationFrame(particleRaf);
        particleRaf = undefined;
      } else if (!particleRaf && N > 0) {
        drawParticles();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (N > 0) drawParticles();

    // ── 2. Cursor glow orb ──────────────────────────────────────────
    const ORB = 400;
    const orb = document.createElement("div");
    orb.id = "__sci_orb";
    orb.style.cssText = `
      position: fixed; top: 0; left: 0; z-index: 9990;
      width: ${ORB}px; height: ${ORB}px; border-radius: 50%;
      pointer-events: none; user-select: none;
      background: radial-gradient(circle,
        rgba(249,115,22,0.10) 0%,
        rgba(249,115,22,0.05) 40%,
        transparent 70%
      );
      transform: translate(-9999px, -9999px);
      will-change: transform;
      transition: background 0.35s ease;
    `;
    document.body.appendChild(orb);

    let ox = -9999, oy = -9999, tx = -9999, ty = -9999;
    let boosted = false;
    let orbRaf: number;

    const onMouseMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };

    const setBoost = (on: boolean) => {
      if (boosted === on) return;
      boosted = on;
      orb.style.background = on
        ? `radial-gradient(circle, rgba(249,115,22,0.20) 0%, rgba(249,115,22,0.10) 40%, transparent 70%)`
        : `radial-gradient(circle, rgba(249,115,22,0.10) 0%, rgba(249,115,22,0.05) 40%, transparent 70%)`;
    };

    const onMouseOver = (e: MouseEvent) => {
      setBoost(Boolean((e.target as HTMLElement).closest(
        "button, a[href], [role='button'], [data-interactive]"
      )));
    };

    const animateOrb = () => {
      ox += (tx - ox) * 0.07;
      oy += (ty - oy) * 0.07;
      orb.style.transform = `translate(${ox - ORB / 2}px, ${oy - ORB / 2}px)`;
      orbRaf = requestAnimationFrame(animateOrb);
    };

    // ── 3. Card spotlight ──────────────────────────────────────────
    const onSpotMove = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>("[data-spotlight]");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
      card.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
      card.style.setProperty("--spot-o", "1");
    };
    const onSpotLeave = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>("[data-spotlight]");
      if (card) card.style.setProperty("--spot-o", "0");
    };

    // ── 4. Click ripple ────────────────────────────────────────────
    const onClickRipple = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(
        "input, textarea, select, [data-radix-popper-content-wrapper], [role='dialog'], [role='listbox']"
      )) return;

      // Primary expanding ring
      const ring = document.createElement("div");
      ring.style.cssText = `
        position: fixed;
        left: ${e.clientX}px; top: ${e.clientY}px;
        width: 4px; height: 4px; border-radius: 50%;
        pointer-events: none; z-index: 9989;
        transform: translate(-50%, -50%);
        border: 1.5px solid rgba(249,115,22,0.95);
        box-shadow: 0 0 10px rgba(249,115,22,0.7), 0 0 22px rgba(249,115,22,0.35);
        animation: __sci_ripple_a 750ms cubic-bezier(0.2,0.8,0.2,1) forwards;
      `;
      // Secondary delayed ring
      const ring2 = document.createElement("div");
      ring2.style.cssText = `
        position: fixed;
        left: ${e.clientX}px; top: ${e.clientY}px;
        width: 4px; height: 4px; border-radius: 50%;
        pointer-events: none; z-index: 9989;
        transform: translate(-50%, -50%);
        border: 1px solid rgba(249,115,22,0.45);
        animation: __sci_ripple_a 900ms cubic-bezier(0.2,0.8,0.2,1) 120ms forwards;
      `;
      document.body.appendChild(ring);
      document.body.appendChild(ring2);
      setTimeout(() => { ring.remove(); ring2.remove(); }, 1050);
    };

    // ── Style injection ────────────────────────────────────────────
    const style = document.createElement("style");
    style.id = "__sci_styles";
    style.textContent = `
      @keyframes __sci_ripple_a {
        0%   { width: 4px;  height: 4px;  opacity: 1; }
        55%  { opacity: 0.7; }
        100% { width: 100px; height: 100px; opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // ── Bind all listeners ────────────────────────────────────────
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousemove", onSpotMove,  { passive: true });
    window.addEventListener("mouseover", onMouseOver, { passive: true });
    window.addEventListener("click",     onClickRipple);
    document.addEventListener("mouseleave", onSpotLeave, { capture: true, passive: true });
    orbRaf = requestAnimationFrame(animateOrb);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousemove", onSpotMove);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("click",     onClickRipple);
      window.removeEventListener("resize",    resize);
      document.removeEventListener("mouseleave", onSpotLeave, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      if (particleRaf) cancelAnimationFrame(particleRaf);
      cancelAnimationFrame(orbRaf);
      canvas.remove();
      orb.remove();
      style.remove();
    };
  }, []);

  return null;
}
