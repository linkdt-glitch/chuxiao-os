"use client";

import Link from "next/link";
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
    { title: "进化机制", keys: ["evolution"] },
    { title: "系统管理", keys: ["organization", "modules", "ai-settings", "settings"] }
  ].map((section) => ({
    ...section,
    modules: section.keys.map((key) => byKey.get(key)).filter(Boolean) as ModuleDefinition[]
  }));

  const fallback = modules.filter(
    (module) => !sections.some((section) => section.keys.includes(module.key))
  );

  return (
    <aside className="surface-gradient fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/70 shadow-[18px_0_40px_rgba(15,23,42,0.05)] lg:block">
      <div className="flex h-16 items-center border-b border-white/70 px-5">
        <div>
          <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-700 bg-clip-text text-sm font-semibold text-transparent">AI Company OS</div>
          <div className="text-xs text-muted-foreground">自进化组织系统</div>
        </div>
      </div>
      <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-3 scrollbar-thin">
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
                ? "bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-white/70 hover:text-foreground hover:shadow-sm",
              disabled && "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-muted-foreground hover:shadow-none"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
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
