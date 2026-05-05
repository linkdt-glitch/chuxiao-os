"use client";

/**
 * NeuralPulse — always-animating AI core indicator
 *
 * Three dots orbit a glowing center node — like Claude's thinking animation,
 * but sci-fi flavored with neon orange + concentric breathing rings.
 * Intended for the sidebar footer; always running, never stops.
 */
export function NeuralPulse() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Orbital rig */}
      <div className="relative" style={{ width: 48, height: 48 }}>
        {/* Outer ring (slow breathe) */}
        <div
          className="animate-neural-ring-slow absolute rounded-full"
          style={{
            top: "50%", left: "50%",
            width: 44, height: 44,
            border: "1px solid rgba(249,115,22,0.20)",
          }}
        />
        {/* Inner ring (faster breathe) */}
        <div
          className="animate-neural-ring absolute rounded-full"
          style={{
            top: "50%", left: "50%",
            width: 28, height: 28,
            border: "1px solid rgba(249,115,22,0.35)",
          }}
        />
        {/* Center node */}
        <div
          className="animate-neural-center absolute rounded-full"
          style={{
            top: "50%", left: "50%",
            width: 5, height: 5,
            background: "#f97316",
            boxShadow: "0 0 8px rgba(249,115,22,1), 0 0 18px rgba(249,115,22,0.6)",
          }}
        />
        {/* Orbiting dot 1 — base speed */}
        <div
          className="animate-neural-orbit absolute"
          style={{ top: "50%", left: "50%", animationDuration: "3s" }}
        >
          <div
            style={{
              width: 4, height: 4, borderRadius: "50%",
              background: "rgba(249,115,22,0.95)",
              boxShadow: "0 0 6px rgba(249,115,22,0.9)",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
        {/* Orbiting dot 2 — offset 120° */}
        <div
          className="animate-neural-orbit absolute"
          style={{ top: "50%", left: "50%", animationDuration: "3s", animationDelay: "-1s" }}
        >
          <div
            style={{
              width: 3, height: 3, borderRadius: "50%",
              background: "rgba(249,115,22,0.7)",
              boxShadow: "0 0 5px rgba(249,115,22,0.7)",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
        {/* Orbiting dot 3 — offset 240° */}
        <div
          className="animate-neural-orbit absolute"
          style={{ top: "50%", left: "50%", animationDuration: "3s", animationDelay: "-2s" }}
        >
          <div
            style={{
              width: 3, height: 3, borderRadius: "50%",
              background: "rgba(249,115,22,0.5)",
              boxShadow: "0 0 4px rgba(249,115,22,0.5)",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <div
          className="font-mono text-[9px] font-semibold tracking-[0.24em]"
          style={{ color: "rgba(249,115,22,0.65)", textShadow: "0 0 8px rgba(249,115,22,0.4)" }}
        >
          AI CORE ACTIVE
        </div>
        <div className="mt-0.5 font-mono text-[8px] tracking-[0.14em] text-slate-600">
          KAIROSMINI v1.0
        </div>
      </div>
    </div>
  );
}
