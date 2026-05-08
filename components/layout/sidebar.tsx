"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ModuleDefinition } from "@/lib/types/core";
import { iconMap, type IconName } from "@/components/layout/icons";
import { NeuralPulse } from "@/components/effects/neural-pulse";

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed-sections";
const DEFAULT_COLLAPSED = ["系统", "其他"];

function readCollapsed(): string[] {
  if (typeof window === "undefined") return DEFAULT_COLLAPSED;
  try {
    const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (!raw) return DEFAULT_COLLAPSED;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_COLLAPSED;
  } catch {
    return DEFAULT_COLLAPSED;
  }
}

export function Sidebar({ modules }: { modules: Array<ModuleDefinition & { canAccess?: boolean; isEnabled?: boolean }> }) {
  const pathname = usePathname();
  const byKey = new Map(modules.map((m) => [m.key, m]));

  // SSR-safe 默认值；mount 后从 localStorage 同步用户偏好。
  const [collapsed, setCollapsed] = useState<string[]>(DEFAULT_COLLAPSED);
  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  function toggleSection(title: string) {
    setCollapsed((prev) => {
      const next = prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title];
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore — storage 不可用时仅本会话生效
      }
      return next;
    });
  }

  const sections = [
    { title: "核心",     keys: ["dashboard"] },
    { title: "业务模块", keys: ["projects", "finance", "ai_workforce"] },
    { title: "平台",     keys: ["governance", "knowledge"] },
    { title: "进化",     keys: ["evolution", "energy"] },
    { title: "系统",     keys: ["organization", "modules", "ai-settings", "settings"] }
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
          {/* Logo mark — 精简动画：发光呼吸 + 单粒子绕轨 + 主图微缩。
              旧版有 conic-gradient blur ring + 3 颗轨道粒子 + sphere-3d 共 7 道动画
              全屏一直跑，GPU 压力大；删掉重复装饰，只保留特征性动效。 */}
          <div className="relative h-10 w-10 shrink-0">
            {/* 单颗轨道粒子 */}
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full"
              style={{
                marginLeft: -3, marginTop: -3,
                background: "rgba(249,200,140,0.95)",
                boxShadow: "0 0 8px rgba(249,115,22,0.95)",
                animation: "logo-orbit 7s linear infinite",
              }}
            />

            {/* Logo frame + glow pulse */}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden"
              style={{
                background: "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.18), rgba(3,7,18,0.97))",
                animation: "logo-glow-pulse 3s ease-in-out infinite",
              }}
            >
              <Image
                src="/brand/kairosmini-mark.svg"
                alt="初晓 OS"
                width={512}
                height={512}
                className="h-full w-full object-contain"
                style={{ animation: "logo-sphere-energy 3.2s ease-in-out infinite" }}
              />
            </div>
          </div>

          {/* Brand text */}
          <div className="min-w-0">
            <div className="truncate bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-sm font-semibold text-transparent">
              初晓 OS 系统
            </div>
            <div className="font-mono text-[10px] tracking-[0.18em] text-orange-500/45">
              企业智能操作系统
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
            <CollapsibleSection
              key={section.title}
              title={section.title}
              collapsed={collapsed.includes(section.title)}
              onToggle={() => toggleSection(section.title)}
            >
              <NavSection modules={section.modules} pathname={pathname} />
            </CollapsibleSection>
          ) : null
        )}

        {fallback.length ? (
          <CollapsibleSection
            title="其他"
            collapsed={collapsed.includes("其他")}
            onToggle={() => toggleSection("其他")}
          >
            <NavSection modules={fallback} pathname={pathname} />
          </CollapsibleSection>
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
              <Badge variant="warning" className="relative z-10 text-[10px]">即将上线</Badge>
            ) : null}
          </div>
        );

        if (disabled) return <div key={module.id}>{content}</div>;
        return <Link key={module.id} href={module.route}>{content}</Link>;
      })}
    </div>
  );
}

/**
 * 可折叠的 sidebar 分组：标题点击切换展开/收起，状态由父组件管理
 * 并持久化到 localStorage（"系统"/"其他"默认折叠以减少视觉杂乱）。
 */
function CollapsibleSection({
  title,
  collapsed,
  onToggle,
  children
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group mb-1.5 flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-orange-500/[0.05]"
      >
        <ChevronDown
          className="h-3 w-3 shrink-0 text-orange-500/50 transition-transform group-hover:text-orange-400"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        />
        <span className="font-mono text-[10px] font-medium tracking-[0.22em] text-orange-500/40 group-hover:text-orange-400/70">
          {title}
        </span>
        <div
          className="flex-1"
          style={{ height: "1px", background: "rgba(249,115,22,0.09)" }}
        />
      </button>
      {!collapsed ? children : null}
    </div>
  );
}
