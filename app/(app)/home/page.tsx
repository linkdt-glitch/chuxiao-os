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
        <div className="mb-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.10] px-3 py-2 text-[13px] text-emerald-200">
          已保存。所有成员的首页会自动同步。
        </div>
      ) : null}
      {showDemoNotice ? (
        <div className="mb-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.10] px-3 py-2 text-[13px] text-amber-200">
          演示模式没有连接数据库，更改不会持久化。
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.10] px-3 py-2 text-[13px] text-rose-200">
          {params.error}
        </div>
      ) : null}

      {/* ── Bento 布局：一屏不滚 ──────────────────────────────── */}
      <div className="grid gap-3 lg:gap-4">
        {/* 1) Welcome hero — 全宽紧凑横排 */}
        <WelcomeHero userName={userName} organizationName={organization.name} />

        {/* 2) 使命 / 愿景 / 公告栏 — 3 列 */}
        <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
          <SectionCard icon={Compass} label="使命" accent="amber" delayMs={0}>
            <p className="text-[15px] leading-relaxed text-slate-100">
              {content.mission ?? "—"}
            </p>
          </SectionCard>
          <SectionCard icon={Telescope} label="愿景" accent="orange" delayMs={60}>
            <p className="text-[15px] leading-relaxed text-slate-100">
              {content.vision ?? "—"}
            </p>
          </SectionCard>
          <SectionCard icon={Megaphone} label="公告栏" accent="rose" delayMs={120}>
            {content.announcements.length ? (
              <ul className="space-y-1.5">
                {content.announcements.slice(0, 3).map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                    <span className="line-clamp-2 text-[13px] leading-relaxed text-slate-200">
                      {line}
                    </span>
                  </li>
                ))}
                {content.announcements.length > 3 ? (
                  <li className="pt-0.5 text-[11px] text-slate-500">
                    还有 {content.announcements.length - 3} 条…
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">没有最新公告。</p>
            )}
          </SectionCard>
        </div>

        {/* 3) 价值观 — 全宽，5 chips 并排 */}
        <SectionCard icon={Sparkles} label="价值观" accent="amber" delayMs={180}>
          {content.values.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {content.values.map((value, i) => (
                <div
                  key={`${value.title}-${i}`}
                  title={value.description}
                  className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition-colors hover:border-amber-500/30 hover:bg-amber-500/[0.06]"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-500/15 font-mono text-[10px] font-bold text-amber-200">
                      {i + 1}
                    </span>
                    <span className="text-[14px] font-semibold text-slate-100">{value.title}</span>
                  </div>
                  {value.description ? (
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-slate-400 group-hover:text-slate-300">
                      {value.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">还没有写下价值观，请创始人来设定。</p>
          )}
        </SectionCard>

        {/* 4) 近期目标 — 全宽紧凑（横向排列） */}
        <SectionCard icon={Target} label="近期目标" accent="emerald" delayMs={240}>
          {content.goals.length ? (
            <div className="grid gap-2 lg:grid-cols-2">
              {content.goals.slice(0, 4).map((goal, i) => (
                <div
                  key={`${goal.title}-${i}`}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-slate-100">
                        {goal.title}
                      </div>
                      {goal.description ? (
                        <div className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-400">
                          {goal.description}
                        </div>
                      ) : null}
                    </div>
                    {goal.target_date ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-emerald-200">
                        {formatDate(goal.target_date)}
                      </span>
                    ) : null}
                  </div>
                  {typeof goal.progress === "number" ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] tabular-nums text-slate-400">
                        <span>进度</span>
                        <span className="text-emerald-300">{goal.progress}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(2, goal.progress)}%`,
                            background: "linear-gradient(90deg, #34d399, #10b981)"
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              暂未设定近期目标。{isOwner ? "去「编辑首页」设定 OKR / 季度目标。" : "等创始人设定。"}
            </p>
          )}
        </SectionCard>

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

/** 单张 section 卡（紧凑版）。 */
function SectionCard({
  icon: Icon,
  label,
  accent,
  delayMs = 0,
  children
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent: "amber" | "orange" | "emerald" | "rose";
  delayMs?: number;
  children: React.ReactNode;
}) {
  const palette = {
    amber: { dot: "bg-amber-300", iconBg: "bg-amber-500/15", iconText: "text-amber-300", border: "border-amber-500/15" },
    orange: { dot: "bg-orange-300", iconBg: "bg-orange-500/15", iconText: "text-orange-300", border: "border-orange-500/15" },
    emerald: { dot: "bg-emerald-300", iconBg: "bg-emerald-500/15", iconText: "text-emerald-300", border: "border-emerald-500/15" },
    rose: { dot: "bg-rose-300", iconBg: "bg-rose-500/15", iconText: "text-rose-300", border: "border-rose-500/15" }
  }[accent];

  return (
    <section
      className={`home-card-in relative overflow-hidden rounded-2xl border ${palette.border} bg-white/[0.025] p-4`}
      style={{
        animationDelay: `${delayMs}ms`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)"
      }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <div className={`grid h-7 w-7 place-items-center rounded-lg ${palette.iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${palette.iconText}`} />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
        <span className={`ml-auto h-1.5 w-1.5 rounded-full ${palette.dot}`} />
      </div>
      {children}
    </section>
  );
}
