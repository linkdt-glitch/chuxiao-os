import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Edit3,
  Megaphone,
  Sparkles,
  Target,
  Telescope
} from "lucide-react";
import { WelcomeHero } from "@/components/home/welcome-hero";
import { Button } from "@/components/ui/button";
import { getCurrentMember, getCurrentOrganization, getCurrentUser } from "@/lib/auth";
import { getHomeContent } from "@/lib/home/queries";

function formatDate(d: string) {
  return d.replaceAll("-", ".");
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ notice?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [organization, user, member, content] = await Promise.all([
    getCurrentOrganization(),
    getCurrentUser(),
    getCurrentMember(),
    getHomeContent()
  ]);

  const userName = (user.full_name ?? user.email ?? "你好").split(/\s+|@/)[0] || "你好";
  const isOwner = member?.role?.key === "owner";
  const showNotice = params.notice === "saved";
  const showDemoNotice = params.notice === "saved_demo";

  return (
    <>
      {showNotice ? (
        <div className="mb-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.10] px-3 py-1.5 text-[12px] text-emerald-200">
          已保存。所有成员的首页会自动同步。
        </div>
      ) : null}
      {showDemoNotice ? (
        <div className="mb-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.10] px-3 py-1.5 text-[12px] text-amber-200">
          演示模式没有连接数据库，更改不会持久化。
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.10] px-3 py-1.5 text-[12px] text-rose-200">
          {params.error}
        </div>
      ) : null}

      <div className="grid gap-3">
        {/* 1) Welcome */}
        <WelcomeHero userName={userName} organizationName={organization.name} />

        {/* 2) 使命 + 愿景 — 顶部并排 2 列，紧凑短句 */}
        <div className="grid gap-3 lg:grid-cols-2">
          <SectionCard icon={Compass} label="使命" accent="amber" delayMs={0} compact>
            <p className="text-[13.5px] leading-relaxed text-slate-900">{content.mission ?? "—"}</p>
          </SectionCard>
          <SectionCard icon={Telescope} label="愿景" accent="orange" delayMs={60} compact>
            <p className="text-[13.5px] leading-relaxed text-slate-900">{content.vision ?? "—"}</p>
          </SectionCard>
        </div>

        {/* 3) 价值观 — 不分卡，行内列表；字号比使命/愿景更小 */}
        <SectionCard icon={Sparkles} label="价值观" accent="amber" delayMs={120} compact>
          {content.values.length ? (
            <ul className="divide-y divide-slate-200">
              {content.values.map((value, i) => (
                <li
                  key={`${value.title}-${i}`}
                  className="flex items-baseline gap-3 py-1.5 first:pt-0 last:pb-0"
                >
                  <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-amber-300/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="shrink-0 text-[12.5px] font-medium text-slate-900">
                    {value.title}
                  </span>
                  {value.description ? (
                    <>
                      <span className="shrink-0 text-slate-600">·</span>
                      <span className="text-[12px] leading-relaxed text-slate-400">
                        {value.description}
                      </span>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              还没有写下价值观，请创始人来设定。
            </p>
          )}
        </SectionCard>

        {/* 4) 目标 + 公告 — 底部 2 列紧凑 */}
        <div className="grid gap-3 lg:grid-cols-2">
          <SectionCard icon={Target} label="近期目标" accent="emerald" delayMs={180} compact>
            {content.goals.length ? (
              <ul className="space-y-1.5">
                {content.goals.slice(0, 3).map((goal, i) => (
                  <li
                    key={`${goal.title}-${i}`}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-[12.5px] font-medium text-slate-900">
                          {goal.title}
                        </span>
                      </div>
                      {goal.target_date ? (
                        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-emerald-200">
                          {formatDate(goal.target_date)}
                        </span>
                      ) : null}
                    </div>
                    {typeof goal.progress === "number" ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(2, goal.progress)}%`,
                              background: "linear-gradient(90deg, #34d399, #10b981)"
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-emerald-300">
                          {goal.progress}%
                        </span>
                      </div>
                    ) : null}
                  </li>
                ))}
                {content.goals.length > 3 ? (
                  <li className="text-[10px] text-slate-500">还有 {content.goals.length - 3} 个目标…</li>
                ) : null}
              </ul>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                暂未设定近期目标。{isOwner ? "去「编辑首页」设定。" : ""}
              </p>
            )}
          </SectionCard>

          <SectionCard icon={Megaphone} label="公告栏" accent="rose" delayMs={240} compact>
            {content.announcements.length ? (
              <ul className="space-y-1.5">
                {content.announcements.slice(0, 4).map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                    <span className="text-[12.5px] leading-relaxed text-slate-700">{line}</span>
                  </li>
                ))}
                {content.announcements.length > 4 ? (
                  <li className="text-[10px] text-slate-500">
                    还有 {content.announcements.length - 4} 条…
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-[12px] text-muted-foreground">没有最新公告。</p>
            )}
          </SectionCard>
        </div>

        {/* Owner 编辑入口 */}
        {isOwner ? (
          <div className="flex items-center justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href="/home/edit">
                <Edit3 className="h-3.5 w-3.5" />
                编辑首页内容
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** Section 卡。compact 模式更紧凑（适合右栏 / 顶部小卡）。 */
function SectionCard({
  icon: Icon,
  label,
  accent,
  delayMs = 0,
  compact = false,
  children
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent: "amber" | "orange" | "emerald" | "rose";
  delayMs?: number;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const palette = {
    amber: { dot: "bg-amber-500", iconBg: "bg-amber-100", iconText: "text-amber-700", border: "border-slate-200" },
    orange: { dot: "bg-orange-500", iconBg: "bg-orange-100", iconText: "text-orange-700", border: "border-slate-200" },
    emerald: { dot: "bg-emerald-500", iconBg: "bg-emerald-100", iconText: "text-emerald-700", border: "border-slate-200" },
    rose: { dot: "bg-rose-500", iconBg: "bg-rose-100", iconText: "text-rose-700", border: "border-slate-200" }
  }[accent];

  const padding = compact ? "p-3" : "p-4";
  const headerMb = compact ? "mb-2" : "mb-3";
  const iconSize = compact ? "h-6 w-6" : "h-7 w-7";
  const iconInner = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const labelSize = compact ? "text-[10px]" : "text-[11px]";

  return (
    <section
      className={`home-card-in relative overflow-hidden rounded-2xl border ${palette.border} bg-white ${padding}`}
      style={{
        animationDelay: `${delayMs}ms`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -16px rgba(15,23,42,0.08)"
      }}
    >
      <div className={`${headerMb} flex items-center gap-2`}>
        <div className={`grid ${iconSize} place-items-center rounded-lg ${palette.iconBg}`}>
          <Icon className={`${iconInner} ${palette.iconText}`} />
        </div>
        <span className={`${labelSize} font-medium uppercase tracking-[0.18em] text-slate-500`}>
          {label}
        </span>
        <span className={`ml-auto h-1.5 w-1.5 rounded-full ${palette.dot}`} />
      </div>
      {children}
    </section>
  );
}
