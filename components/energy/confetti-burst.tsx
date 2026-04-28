"use client";

import type { CSSProperties } from "react";

export function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <div className="absolute left-1/2 top-20 h-1 w-1">
        {Array.from({ length: 28 }).map((_, index) => {
          const angle = index * 13 - 170;
          const distance = 80 + (index % 7) * 18;
          const color = ["#22d3ee", "#fbbf24", "#818cf8", "#34d399", "#f472b6"][index % 5];
          return (
            <span
              key={index}
              className="absolute h-2 w-1 rounded-full animate-energy-confetti"
              style={{
                backgroundColor: color,
                "--energy-x": `${Math.cos((angle * Math.PI) / 180) * distance}px`,
                animationDelay: `${index * 16}ms`
              } as CSSProperties & Record<"--energy-x", string>}
            />
          );
        })}
      </div>
    </div>
  );
}
