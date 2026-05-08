"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Home, LayoutGrid, ListTodo, MoreHorizontal, WalletCards, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { iconMap, type IconName } from "@/components/layout/icons";
import { cn } from "@/lib/utils";
import type { ModuleDefinition } from "@/lib/types/core";

type NavigationModule = ModuleDefinition & { canAccess?: boolean; isEnabled?: boolean };

const primaryTabs = [
  { key: "dashboard",    label: "首页", icon: Home },
  { key: "finance",      label: "财务", icon: WalletCards },
  { key: "projects",     label: "项目", icon: ListTodo },
  { key: "ai_workforce", label: "AI",   icon: BrainCircuit },
];

const menuSections = [
  { title: "CORE",      keys: ["dashboard"] },
  { title: "MODULES",   keys: ["finance", "projects", "ai_workforce"] },
  { title: "PLATFORM",  keys: ["governance", "knowledge"] },
  { title: "EVOLUTION", keys: ["evolution", "energy"] },
  { title: "SYSTEM",    keys: ["organization", "modules", "ai-settings", "settings"] },
];

function isActive(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function MobileTabbar({ modules }: { modules: NavigationModule[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moduleByKey = useMemo(
    () => new Map(modules.map((m) => [m.key, m])),
    [modules]
  );
  const primaryModules = primaryTabs
    .map((tab) => ({ ...tab, module: moduleByKey.get(tab.key) }))
    .filter((item) => item.module);
  const moreActive = modules.some(
    (m) => !primaryTabs.some((t) => t.key === m.key) && isActive(pathname, m.route)
  );

  return (
    <>
      {/* Full-screen module picker */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <button
            className="absolute inset-0"
            style={{ background: "rgba(1,3,12,0.75)", backdropFilter: "blur(4px)" }}
            aria-label="关闭移动导航"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div
            className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] max-h-[72vh] overflow-hidden rounded-[20px] animate-app-sheet-in"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 -8px 32px -8px rgba(15,23,42,0.18), 0 1px 2px rgba(15,23,42,0.06)"
            }}
          >
            {/* Sheet header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid #e2e8f0" }}
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">全部入口</div>
                <div className="font-mono text-[10px] tracking-wider text-orange-600">
                  SELECT MODULE
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-800 active:scale-95"
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                }}
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Module grid */}
            <div className="max-h-[calc(72vh-4.5rem)] overflow-y-auto px-3 py-4">
              {menuSections.map((section) => {
                const sectionModules = section.keys
                  .map((k) => moduleByKey.get(k))
                  .filter(Boolean) as NavigationModule[];
                if (!sectionModules.length) return null;

                return (
                  <div key={section.title} className="mb-5 last:mb-1">
                    {/* Section label */}
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <span className="font-mono text-[10px] font-medium tracking-[0.2em] text-orange-500/40">
                        {section.title}
                      </span>
                      <div
                        className="flex-1"
                        style={{ height: "1px", background: "rgba(249,115,22,0.08)" }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {sectionModules.map((module) => {
                        const Icon = iconMap[module.icon as IconName] ?? LayoutGrid;
                        const disabled = module.status === "coming_soon";
                        const active = isActive(pathname, module.route);

                        const content = (
                          <div
                            className={cn(
                              "flex min-h-14 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-200 active:scale-[0.97]",
                              disabled && "opacity-45 cursor-not-allowed"
                            )}
                            style={
                              active
                                ? {
                                    background: "rgba(249,115,22,0.12)",
                                    border: "1px solid rgba(249,115,22,0.30)",
                                    boxShadow: "0 0 16px rgba(249,115,22,0.12)",
                                    color: "#fb923c",
                                  }
                                : {
                                    background: "rgba(249,115,22,0.04)",
                                    border: "1px solid rgba(249,115,22,0.10)",
                                    color: "#94a3b8",
                                  }
                            }
                          >
                            <Icon
                              className="h-4 w-4 shrink-0"
                              style={
                                active
                                  ? { filter: "drop-shadow(0 0 4px rgba(249,115,22,0.7))" }
                                  : undefined
                              }
                            />
                            <span className="min-w-0 flex-1 truncate">{module.name}</span>
                            {disabled ? <Badge variant="warning">即将上线</Badge> : null}
                          </div>
                        );

                        return disabled ? (
                          <div key={module.id}>{content}</div>
                        ) : (
                          <Link key={module.id} href={module.route} onClick={() => setOpen(false)}>
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 lg:hidden"
        style={{
          background: "rgba(255,255,255,0.94)",
          borderTop: "1px solid #e2e8f0",
          boxShadow: "0 -1px 2px rgba(15,23,42,0.04)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {primaryModules.map(({ key, label, icon: Icon, module }) => {
            const active = module ? isActive(pathname, module.route) : false;
            return (
              <Link
                key={key}
                href={module!.route}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-all duration-200 active:scale-95"
                )}
                style={
                  active
                    ? {
                        background: "rgba(249,115,22,0.10)",
                        border: "1px solid rgba(249,115,22,0.30)",
                        color: "#c2410c",
                      }
                    : {
                        color: "#475569",
                      }
                }
              >
                <Icon
                  className="h-5 w-5"
                  style={
                    active
                      ? { filter: "drop-shadow(0 0 5px rgba(249,115,22,0.7))" }
                      : undefined
                  }
                />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-all duration-200 active:scale-95"
            style={
              moreActive
                ? {
                    background: "rgba(249,115,22,0.10)",
                    border: "1px solid rgba(249,115,22,0.30)",
                    color: "#c2410c",
                  }
                : { color: "#475569" }
            }
            aria-label="打开更多模块"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>更多</span>
          </button>
        </div>
      </nav>
    </>
  );
}
