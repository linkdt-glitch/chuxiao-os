"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ModuleDefinition } from "@/lib/types/core";
import { iconMap, type IconName } from "@/components/layout/icons";

export function Sidebar({ modules }: { modules: Array<ModuleDefinition & { canAccess?: boolean; isEnabled?: boolean }> }) {
  const pathname = usePathname();
  const byKey = new Map(modules.map((module) => [module.key, module]));
  const sections = [
    { title: "核心入口", keys: ["dashboard"] },
    { title: "核心业务舱", keys: ["finance", "projects", "ai_workforce"] },
    { title: "底座能力", keys: ["governance", "knowledge"] },
    { title: "进化机制", keys: ["evolution", "energy"] },
    { title: "系统管理", keys: ["organization", "modules", "ai-settings", "settings"] }
  ].map((section) => ({
    ...section,
    modules: section.keys.map((key) => byKey.get(key)).filter(Boolean) as ModuleDefinition[]
  }));

  const fallback = modules.filter(
    (module) => !sections.some((section) => section.keys.includes(module.key))
  );

  return (
    <aside className="surface-gradient fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/70 shadow-[18px_0_45px_rgba(15,23,42,0.06)] lg:block">
      <div className="flex h-20 items-center border-b border-white/70 px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="brand-mark-frame flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/brand/kairosmini-mark.svg"
              alt="初晓 OS"
              width={512}
              height={512}
              className="h-full w-full object-contain p-0.5"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate bg-gradient-to-r from-slate-950 via-orange-600 to-red-500 bg-clip-text text-sm font-semibold text-transparent">
              初晓 OS 系统
            </div>
            <div className="text-xs text-muted-foreground">Kairosmini · AI 自进化组织系统</div>
          </div>
        </div>
      </div>
      <nav className="h-[calc(100vh-5rem)] overflow-y-auto p-3 scrollbar-thin">
        {sections.map((section) =>
          section.modules.length ? (
            <div key={section.title} className="mb-5">
              <div className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {section.title}
              </div>
              <NavSection modules={section.modules} pathname={pathname} />
            </div>
          ) : null
        )}
        {fallback.length ? (
          <div className="mb-5">
            <div className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              兼容入口
            </div>
            <NavSection modules={fallback} pathname={pathname} />
          </div>
        ) : null}
      </nav>
    </aside>
  );
}

function NavSection({
  modules,
  pathname,
  disabled = false
}: {
  modules: ModuleDefinition[];
  pathname: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-2 space-y-1">
      {modules.map((module) => {
        const Icon = iconMap[module.icon as IconName] ?? iconMap.Blocks;
        const disabled = module.status === "coming_soon";
        const active = pathname === module.route || pathname.startsWith(`${module.route}/`);
        const content = (
          <div
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
              active
                ? "bg-gradient-to-r from-white/90 via-orange-50/80 to-rose-50/70 text-slate-950 shadow-[0_12px_28px_rgba(249,115,22,0.12)] ring-1 ring-orange-100/90"
                : "text-muted-foreground hover:bg-white/66 hover:text-foreground hover:shadow-sm hover:ring-1 hover:ring-white/75",
              disabled && "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-muted-foreground hover:shadow-none"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active && "text-orange-600")} />
            <span className="min-w-0 flex-1 truncate">{module.name}</span>
            {module.status === "coming_soon" ? <Badge variant="warning">Soon</Badge> : null}
          </div>
        );

        if (disabled) {
          return <div key={module.id}>{content}</div>;
        }

        return (
          <Link key={module.id} href={module.route}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
