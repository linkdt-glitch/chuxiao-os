"use client";

import { useEffect } from "react";

/**
 * SciFiEffects — global interactive visual engine
 *
 * 1. Cursor glow orb   – soft 360px orange radial gradient that trails the cursor
 * 2. Card spotlight     – inner light that follows mouse inside [data-spotlight] cards
 * 3. Click ripple       – expanding neon ring on every click
 * 4. Interactive boost  – cursor orb intensifies when hovering buttons / links
 */
export function SciFiEffects() {
  useEffect(() => {
    // ── 1. Cursor glow orb ──────────────────────────────────────────
    const SIZE = 380;
    const HALF = SIZE / 2;

    const orb = document.createElement("div");
    orb.id = "__sci_orb";
    orb.style.cssText = `
      position: fixed; top: 0; left: 0; z-index: 9990;
      width: ${SIZE}px; height: ${SIZE}px; border-radius: 50%;
      pointer-events: none; user-select: none;
      background: radial-gradient(circle,
        rgba(249,115,22,0.10) 0%,
        rgba(249,115,22,0.05) 38%,
        transparent 68%
      );
      transform: translate(-9999px, -9999px);
      will-change: transform;
      transition: background 0.4s ease, width 0.4s ease, height 0.4s ease;
    `;
    document.body.appendChild(orb);

    let ox = -9999, oy = -9999;
    let tx = -9999, ty = -9999;
    let rafId: number;
    let boosted = false;

    const onMouseMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const setBoost = (on: boolean) => {
      if (boosted === on) return;
      boosted = on;
      if (on) {
        orb.style.background = `radial-gradient(circle,
          rgba(249,115,22,0.18) 0%,
          rgba(249,115,22,0.09) 38%,
          transparent 68%
        )`;
      } else {
        orb.style.background = `radial-gradient(circle,
          rgba(249,115,22,0.10) 0%,
          rgba(249,115,22,0.05) 38%,
          transparent 68%
        )`;
      }
    };

    const onMouseOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      setBoost(Boolean(el.closest("button, a[href], [role='button'], [data-interactive]")));
    };

    const animateOrb = () => {
      ox += (tx - ox) * 0.07;
      oy += (ty - oy) * 0.07;
      orb.style.transform = `translate(${ox - HALF}px, ${oy - HALF}px)`;
      rafId = requestAnimationFrame(animateOrb);
    };

    // ── 2. Card spotlight ──────────────────────────────────────────
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

    // ── 3. Click ripple ────────────────────────────────────────────
    const onClickRipple = (e: MouseEvent) => {
      const skip = (e.target as HTMLElement).closest(
        "input, textarea, select, [data-radix-popper-content-wrapper], [role='dialog'], [role='listbox']"
      );
      if (skip) return;

      const el = document.createElement("div");
      el.className = "__sci_ripple";
      el.style.cssText = `
        position: fixed;
        left: ${e.clientX}px; top: ${e.clientY}px;
        width: 4px; height: 4px;
        border-radius: 50%;
        pointer-events: none; user-select: none;
        z-index: 9989;
        transform: translate(-50%, -50%);
        border: 1.5px solid rgba(249,115,22,0.9);
        box-shadow: 0 0 8px rgba(249,115,22,0.6), 0 0 16px rgba(249,115,22,0.3);
        animation: __sci_ripple_anim 700ms cubic-bezier(0.2,0.8,0.2,1) forwards;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 720);
    };

    // ── Style injection ────────────────────────────────────────────
    const style = document.createElement("style");
    style.id = "__sci_styles";
    style.textContent = `
      @keyframes __sci_ripple_anim {
        0%   { width: 4px; height: 4px; opacity: 1; }
        60%  { opacity: 0.6; }
        100% { width: 88px; height: 88px; opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // ── Bind ──────────────────────────────────────────────────────
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousemove", onSpotMove,  { passive: true });
    window.addEventListener("mouseover", onMouseOver, { passive: true });
    window.addEventListener("click",     onClickRipple);

    // Delegated mouseleave via document
    document.addEventListener("mouseleave", onSpotLeave, { capture: true, passive: true });

    rafId = requestAnimationFrame(animateOrb);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousemove", onSpotMove);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("click",     onClickRipple);
      document.removeEventListener("mouseleave", onSpotLeave, { capture: true });
      cancelAnimationFrame(rafId);
      orb.remove();
      style.remove();
      document.querySelectorAll(".__sci_ripple").forEach((el) => el.remove());
    };
  }, []);

  return null;
}
