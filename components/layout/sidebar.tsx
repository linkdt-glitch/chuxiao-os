"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, GitCompare, Home, Sparkles } from "lucide-react";
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

export function Sidebar({
  modules,
  isOwner = false
}: {
  modules: Array<ModuleDefinition & { canAccess?: boolean; isEnabled?: boolean }>;
  /** 创始人专属功能（AI 对比室等）的展示开关 */
  isOwner?: boolean;
}) {
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
        background: "#fafaf9",
        borderRight: "1px solid #e2e8f0",
      }}
    >
      {/* 极淡橙色点纹（白底点纹更淡，仅做质感） */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.10) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.4,
        }}
      />

      {/* Logo header */}
      <div
        className="relative flex h-20 items-center px-5"
        style={{ borderBottom: "1px solid #e2e8f0" }}
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
                background: "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.16), #ffffff)",
                border: "1px solid rgba(249,115,22,0.20)",
                animation: "logo-glow-pulse 3s ease-in-out infinite",
              }}
            >
              <Image
                src="/brand/kairosmini-mark.svg"
                alt="初晓 OS"
                width={40}
                height={40}
                priority
                className="h-full w-full object-contain"
                style={{ animation: "logo-sphere-energy 3.2s ease-in-out infinite" }}
              />
            </div>
          </div>

          {/* Brand text */}
          <div className="min-w-0">
            <div className="truncate bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-sm font-semibold text-transparent">
              初晓 OS 系统
            </div>
            <div className="font-mono text-[10px] tracking-[0.18em] text-orange-500/65">
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
        {/* 首页 — 所有人可见，永远在最顶部 */}
        <HomeNavLink pathname={pathname} />

        {/* 创始人专属功能 —— 只对 owner 显示，放在首页之后最醒目位置 */}
        {isOwner ? <FounderOnlyNav pathname={pathname} /> : null}

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
        <div style={{ borderTop: "1px solid #e2e8f0" }}>
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
              active ? "text-orange-700 font-medium" : "text-slate-700",
              disabled && "cursor-not-allowed opacity-45"
            )}
            style={
              active
                ? {
                    background: "rgba(249,115,22,0.10)",
                    borderLeft: "2px solid rgba(249,115,22,0.85)",
                  }
                : { borderLeft: "2px solid transparent" }
            }
          >
            {/* Hover layer */}
            {!active && !disabled && (
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 rounded-md"
                style={{ background: "rgba(249,115,22,0.06)" }}
              />
            )}

            {/* Icon */}
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 relative z-10 transition-colors",
                active ? "text-orange-600" : "text-slate-500 group-hover:text-slate-700"
              )}
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
        className="group mb-1.5 flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-orange-500/[0.06]"
      >
        <ChevronDown
          className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-hover:text-orange-500"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        />
        <span className="font-mono text-[10px] font-medium tracking-[0.22em] text-slate-400 group-hover:text-orange-600">
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

/**
 * 首页 nav —— 所有角色可见，固定在 sidebar 最顶部。
 * 比 NavSection 简单：不读 modules，不需要权限判断。
 */
function HomeNavLink({ pathname }: { pathname: string }) {
  const active = pathname === "/home" || pathname.startsWith("/home/");
  return (
    <div className="mb-4">
      <Link href="/home">
        <div
          className={cn(
            "group relative flex min-h-[2.4rem] items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-sm transition-all duration-200",
            active ? "text-orange-700 font-medium" : "text-slate-700"
          )}
          style={
            active
              ? {
                  background: "rgba(249,115,22,0.10)",
                  borderLeft: "2px solid rgba(249,115,22,0.85)"
                }
              : { borderLeft: "2px solid transparent" }
          }
        >
          {!active && (
            <span
              className="pointer-events-none absolute inset-0 rounded-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ background: "rgba(249,115,22,0.06)" }}
            />
          )}
          <Home
            className={cn(
              "relative z-10 h-4 w-4 shrink-0 transition-colors",
              active ? "text-orange-600" : "text-slate-500 group-hover:text-slate-700"
            )}
          />
          <span className="relative z-10 min-w-0 flex-1 truncate font-medium">首页</span>
        </div>
      </Link>
    </div>
  );
}

/**
 * 创始人专属导航 —— 只对 owner 渲染。
 * 当前包含：AI 双模型对比（Claude 4.5 + GPT-5 并排）。
 * 设计意图：把「需要创始人级判断的工具」单独成组，跟员工版业务模块区分开。
 */
function FounderOnlyNav({ pathname }: { pathname: string }) {
  const active = pathname === "/ai-compare" || pathname.startsWith("/ai-compare/");
  return (
    <div className="mb-4">
      <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600/70">
        创始人专属
      </div>
      <Link href="/ai-compare">
        <div
          className={cn(
            "group relative flex min-h-[2.4rem] items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-sm transition-all duration-200",
            active ? "text-orange-700 font-medium" : "text-slate-700"
          )}
          style={
            active
              ? {
                  background: "rgba(249,115,22,0.10)",
                  borderLeft: "2px solid rgba(249,115,22,0.85)"
                }
              : { borderLeft: "2px solid transparent" }
          }
        >
          {!active && (
            <span
              className="pointer-events-none absolute inset-0 rounded-md opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ background: "rgba(249,115,22,0.06)" }}
            />
          )}
          <GitCompare
            className={cn(
              "relative z-10 h-4 w-4 shrink-0 transition-colors",
              active ? "text-orange-600" : "text-slate-500 group-hover:text-slate-700"
            )}
          />
          <div className="relative z-10 min-w-0 flex-1">
            <div className="truncate font-medium">AI 双模型对比</div>
            <div className="truncate text-[10px] text-muted-foreground">Claude 4.5 + GPT-5 并排</div>
          </div>
          <Sparkles className="relative z-10 h-3 w-3 shrink-0 text-amber-500" />
        </div>
      </Link>
    </div>
  );
}
