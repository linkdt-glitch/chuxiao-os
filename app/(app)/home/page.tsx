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
            <p className="text-[13.5px] leading-relaxed text-slate-100">{content.mission ?? "—"}</p>
          </SectionCard>
          <SectionCard icon={Telescope} label="愿景" accent="orange" delayMs={60} compact>
            <p className="text-[13.5px] leading-relaxed text-slate-100">{content.vision ?? "—"}</p>
          </SectionCard>
        </div>

        {/* 3) 价值观 — 主体内容，5 卡横排，文字大、可以容纳完整描述 */}
        <SectionCard icon={Sparkles} label="价值观" accent="amber" delayMs={120}>
          {content.values.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {content.values.map((value, i) => (
                <div
                  key={`${value.title}-${i}`}
                  className="flex min-h-[140px] flex-col rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 transition-colors hover:border-amber-500/30 hover:bg-amber-500/[0.05]"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500/15 font-mono text-[11px] font-bold text-amber-200">
                      {i + 1}
                    </span>
                    <span className="text-[16px] font-semibold text-slate-100">{value.title}</span>
                  </div>
                  {value.description ? (
                    <p className="mt-2.5 flex-1 text-[13px] leading-[1.7] text-slate-300">
                      {value.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
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
                    className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-[12.5px] font-medium text-slate-100">
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
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
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
                    <span className="text-[12.5px] leading-relaxed text-slate-200">{line}</span>
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
    amber: { dot: "bg-amber-300", iconBg: "bg-amber-500/15", iconText: "text-amber-300", border: "border-amber-500/15" },
    orange: { dot: "bg-orange-300", iconBg: "bg-orange-500/15", iconText: "text-orange-300", border: "border-orange-500/15" },
    emerald: { dot: "bg-emerald-300", iconBg: "bg-emerald-500/15", iconText: "text-emerald-300", border: "border-emerald-500/15" },
    rose: { dot: "bg-rose-300", iconBg: "bg-rose-500/15", iconText: "text-rose-300", border: "border-rose-500/15" }
  }[accent];

  const padding = compact ? "p-3" : "p-4";
  const headerMb = compact ? "mb-2" : "mb-3";
  const iconSize = compact ? "h-6 w-6" : "h-7 w-7";
  const iconInner = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const labelSize = compact ? "text-[10px]" : "text-[11px]";

  return (
    <section
      className={`home-card-in relative overflow-hidden rounded-2xl border ${palette.border} bg-white/[0.025] ${padding}`}
      style={{
        animationDelay: `${delayMs}ms`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)"
      }}
    >
      <div className={`${headerMb} flex items-center gap-2`}>
        <div className={`grid ${iconSize} place-items-center rounded-lg ${palette.iconBg}`}>
          <Icon className={`${iconInner} ${palette.iconText}`} />
        </div>
        <span className={`${labelSize} font-medium uppercase tracking-[0.18em] text-slate-400`}>
          {label}
        </span>
        <span className={`ml-auto h-1.5 w-1.5 rounded-full ${palette.dot}`} />
      </div>
      {children}
    </section>
  );
}
