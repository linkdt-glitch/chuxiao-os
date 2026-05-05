"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ModuleDefinition } from "@/lib/types/core";
import { iconMap, type IconName } from "@/components/layout/icons";
import { NeuralPulse } from "@/components/effects/neural-pulse";

export function Sidebar({ modules }: { modules: Array<ModuleDefinition & { canAccess?: boolean; isEnabled?: boolean }> }) {
  const pathname = usePathname();
  const byKey = new Map(modules.map((m) => [m.key, m]));

  const sections = [
    { title: "CORE",      keys: ["dashboard"] },
    { title: "MODULES",   keys: ["finance", "projects", "ai_workforce"] },
    { title: "PLATFORM",  keys: ["governance", "knowledge"] },
    { title: "EVOLUTION", keys: ["evolution", "energy"] },
    { title: "SYSTEM",    keys: ["organization", "modules", "ai-settings", "settings"] }
  ].map((s) => ({
    ...s,
    modules: s.keys.map((k) => byKey.get(k)).filter(Boolean) as ModuleDefinition[]
  }));

  const fallback = modules.filter(
    (m) => !sections.some((s) => s.keys.includes(m.key))
  );

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 hidden w-72 lg:block"
      style={{
        background: "linear-gradient(180deg, rgba(3,7,18,0.98) 0%, rgba(2,6,16,0.97) 100%)",
        borderRight: "1px solid rgba(249,115,22,0.14)",
        boxShadow: "8px 0 32px rgba(249,115,22,0.05), 18px 0 60px rgba(0,0,0,0.65)",
      }}
    >
      {/* Dot-grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.13) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.35,
        }}
      />

      {/* Logo header */}
      <div
        className="relative flex h-20 items-center px-5"
        style={{ borderBottom: "1px solid rgba(249,115,22,0.10)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          {/* Logo mark — always animating */}
          <div className="relative h-10 w-10 shrink-0">
            {/* Outer dashed ring — slow clockwise */}
            <div
              className="pointer-events-none absolute"
              style={{
                inset: -5, borderRadius: 20,
                border: "1px dashed rgba(249,115,22,0.38)",
                animation: "logo-ring-spin 7s linear infinite",
              }}
            />
            {/* Inner partial arc — fast counter-clockwise */}
            <div
              className="pointer-events-none absolute"
              style={{
                inset: -2, borderRadius: 15,
                borderTop: "1.5px solid rgba(249,115,22,0.75)",
                borderRight: "1.5px solid rgba(249,115,22,0.20)",
                borderBottom: "1.5px solid transparent",
                borderLeft: "1.5px solid transparent",
                animation: "logo-ring-spin 2.8s linear infinite reverse",
              }}
            />
            {/* Logo frame */}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden"
              style={{
                background: "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.18), rgba(3,7,18,0.97))",
                animation: "logo-glow-pulse 3s ease-in-out infinite",
              }}
            >
              {/* The sphere itself — 3D gyro tilt + energy pulse + glitch */}
              <div
                style={{
                  width: "100%", height: "100%",
                  animation: "logo-sphere-3d 8s ease-in-out infinite",
                  transformOrigin: "center center",
                  transformStyle: "preserve-3d",
                }}
              >
                <Image
                  src="/brand/kairosmini-mark.svg"
                  alt="初晓 OS"
                  width={512}
                  height={512}
                  className="h-full w-full object-contain"
                  style={{
                    animation: "logo-sphere-energy 3.2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Brand text */}
          <div className="min-w-0">
            <div className="truncate bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-sm font-semibold text-transparent">
              初晓 OS 系统
            </div>
            <div className="font-mono text-[10px] tracking-[0.18em] text-orange-500/45">
              SYS://KAIROSMINI
            </div>
          </div>
        </div>

        {/* Online indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          <div
            className="h-1.5 w-1.5 rounded-full bg-green-400 animate-neon-dot"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex h-[calc(100vh-5rem)] flex-col overflow-y-auto scrollbar-thin">
        <div className="flex-1 p-3">
        {sections.map((section) =>
          section.modules.length ? (
            <div key={section.title} className="mb-5">
              {/* Section label */}
              <div className="mb-1.5 flex items-center gap-2 px-2">
                <span className="font-mono text-[10px] font-medium tracking-[0.22em] text-orange-500/40">
                  {section.title}
                </span>
                <div
                  className="flex-1"
                  style={{ height: "1px", background: "rgba(249,115,22,0.09)" }}
                />
              </div>
              <NavSection modules={section.modules} pathname={pathname} />
            </div>
          ) : null
        )}

        {fallback.length ? (
          <div className="mb-5">
            <div className="mb-1.5 flex items-center gap-2 px-2">
              <span className="font-mono text-[10px] font-medium tracking-[0.22em] text-orange-500/40">OTHER</span>
              <div className="flex-1" style={{ height: "1px", background: "rgba(249,115,22,0.09)" }} />
            </div>
            <NavSection modules={fallback} pathname={pathname} />
          </div>
        ) : null}
        </div>

        {/* Spacer pushes neural pulse to bottom */}
        <div className="flex-1" />

        {/* Always-animating neural core */}
        <div style={{ borderTop: "1px solid rgba(249,115,22,0.08)" }}>
          <NeuralPulse />
        </div>
      </nav>
    </aside>
  );
}

function NavSection({
  modules,
  pathname,
}: {
  modules: ModuleDefinition[];
  pathname: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-1 space-y-0.5">
      {modules.map((module) => {
        const Icon = iconMap[module.icon as IconName] ?? iconMap.Blocks;
        const disabled = module.status === "coming_soon";
        const active = pathname === module.route || pathname.startsWith(`${module.route}/`);

        const content = (
          <div
            className={cn(
              "group relative flex min-h-[2.4rem] items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 overflow-hidden",
              active ? "text-orange-400" : "text-slate-400",
              disabled && "cursor-not-allowed opacity-45"
            )}
            style={
              active
                ? {
                    background: "rgba(249,115,22,0.09)",
                    borderLeft: "2px solid rgba(249,115,22,0.85)",
                    boxShadow:
                      "inset 0 0 24px rgba(249,115,22,0.07), 0 0 14px rgba(249,115,22,0.07)",
                  }
                : { borderLeft: "2px solid transparent" }
            }
          >
            {/* Hover glow layer */}
            {!active && !disabled && (
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 rounded-md"
                style={{ background: "rgba(249,115,22,0.05)" }}
              />
            )}

            {/* Icon */}
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 relative z-10 transition-colors",
                active ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300"
              )}
              style={
                active
                  ? { filter: "drop-shadow(0 0 5px rgba(249,115,22,0.7))" }
                  : undefined
              }
            />

            {/* Label */}
            <span className="min-w-0 flex-1 truncate relative z-10">{module.name}</span>

            {/* Badge */}
            {module.status === "coming_soon" ? (
              <Badge variant="warning" className="relative z-10 text-[10px]">Soon</Badge>
            ) : null}
          </div>
        );

        if (disabled) return <div key={module.id}>{content}</div>;
        return <Link key={module.id} href={module.route}>{content}</Link>;
      })}
    </div>
  );
}
