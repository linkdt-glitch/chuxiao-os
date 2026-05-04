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
  { key: "dashboard", label: "首页", icon: Home },
  { key: "finance", label: "财务", icon: WalletCards },
  { key: "projects", label: "项目", icon: ListTodo },
  { key: "ai_workforce", label: "AI", icon: BrainCircuit }
];

const menuSections = [
  { title: "核心入口", keys: ["dashboard"] },
  { title: "核心业务舱", keys: ["finance", "projects", "ai_workforce"] },
  { title: "底座能力", keys: ["governance", "knowledge"] },
  { title: "进化机制", keys: ["evolution", "energy"] },
  { title: "系统管理", keys: ["organization", "modules", "ai-settings", "settings"] }
];

function isActive(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function MobileTabbar({ modules }: { modules: NavigationModule[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moduleByKey = useMemo(() => new Map(modules.map((module) => [module.key, module])), [modules]);
  const primaryModules = primaryTabs
    .map((tab) => ({ ...tab, module: moduleByKey.get(tab.key) }))
    .filter((item) => item.module);
  const moreActive = modules.some(
    (module) => !primaryTabs.some((tab) => tab.key === module.key) && isActive(pathname, module.route)
  );

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/18 backdrop-blur-[2px]"
            aria-label="关闭移动导航"
            onClick={() => setOpen(false)}
          />
          <div className="surface-gradient fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] max-h-[72vh] overflow-hidden rounded-[28px] border border-white/80 shadow-[0_28px_80px_rgba(15,23,42,0.18)] animate-app-sheet-in">
            <div className="flex items-center justify-between border-b border-white/70 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">全部入口</div>
                <div className="text-xs text-muted-foreground">像 App 一样快速切换模块</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-slate-600 shadow-sm ring-1 ring-white/80 transition active:scale-95"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(72vh-4.5rem)] overflow-y-auto px-3 py-4">
              {menuSections.map((section) => {
                const sectionModules = section.keys
                  .map((key) => moduleByKey.get(key))
                  .filter(Boolean) as NavigationModule[];
                if (!sectionModules.length) return null;

                return (
                  <div key={section.title} className="mb-5 last:mb-1">
                    <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">{section.title}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {sectionModules.map((module) => {
                        const Icon = iconMap[module.icon as IconName] ?? LayoutGrid;
                        const disabled = module.status === "coming_soon";
                        const active = isActive(pathname, module.route);
                        const content = (
                          <div
                            className={cn(
                              "flex min-h-14 items-center gap-3 rounded-2xl border px-3 text-sm transition active:scale-[0.98]",
                              active
                                ? "border-orange-200 bg-white/92 text-slate-950 shadow-[0_14px_34px_rgba(238,97,25,0.12)]"
                                : "border-white/70 bg-white/58 text-slate-600 shadow-sm",
                              disabled && "opacity-55"
                            )}
                          >
                            <Icon className={cn("h-4 w-4 shrink-0", active && "text-orange-600")} />
                            <span className="min-w-0 flex-1 truncate">{module.name}</span>
                            {disabled ? <Badge variant="warning">Soon</Badge> : null}
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
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/75 bg-white/72 px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_46px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {primaryModules.map(({ key, label, icon: Icon, module }) => {
            const active = module ? isActive(pathname, module.route) : false;
            return (
              <Link
                key={key}
                href={module!.route}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition active:scale-95",
                  active
                    ? "bg-gradient-to-b from-white via-orange-50 to-amber-50 text-orange-700 shadow-[0_10px_24px_rgba(238,97,25,0.16)] ring-1 ring-orange-100"
                    : "text-slate-500 hover:bg-white/60"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition active:scale-95",
              moreActive
                ? "bg-gradient-to-b from-white via-orange-50 to-amber-50 text-orange-700 shadow-[0_10px_24px_rgba(238,97,25,0.16)] ring-1 ring-orange-100"
                : "text-slate-500 hover:bg-white/60"
            )}
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
