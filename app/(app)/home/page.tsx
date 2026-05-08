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
        <div className="mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.10] px-3 py-2 text-[13px] text-emerald-200">
          已保存。所有成员的首页会自动同步。
        </div>
      ) : null}
      {showDemoNotice ? (
        <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.10] px-3 py-2 text-[13px] text-amber-200">
          演示模式没有连接数据库，更改不会持久化。
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.10] px-3 py-2 text-[13px] text-rose-200">
          {params.error}
        </div>
      ) : null}

      <WelcomeHero userName={userName} organizationName={organization.name} />

      {/* 使命 + 愿景（并排 2 列） */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          icon={Compass}
          label="使命"
          accent="amber"
          delayMs={0}
        >
          <p className="text-[18px] leading-relaxed text-slate-100">
            {content.mission ?? "—"}
          </p>
        </SectionCard>
        <SectionCard
          icon={Telescope}
          label="愿景"
          accent="orange"
          delayMs={80}
        >
          <p className="text-[18px] leading-relaxed text-slate-100">
            {content.vision ?? "—"}
          </p>
        </SectionCard>
      </div>

      {/* 价值观 */}
      <div className="mt-4">
        <SectionCard icon={Sparkles} label="价值观" accent="amber" delayMs={160}>
          {content.values.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.values.map((value, i) => (
                <div
                  key={`${value.title}-${i}`}
                  className="flex min-h-[160px] flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/15 font-mono text-[12px] font-bold text-amber-200">
                      {i + 1}
                    </span>
                    <span className="text-[17px] font-semibold text-slate-100">{value.title}</span>
                  </div>
                  {value.description ? (
                    <p className="mt-3 flex-1 text-[14px] leading-7 text-slate-300">
                      {value.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">还没有写下价值观，请创始人来设定。</p>
          )}
        </SectionCard>
      </div>

      {/* 近期目标 + 公告栏（并排 2 列） */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard icon={Target} label="近期目标" accent="emerald" delayMs={240}>
          {content.goals.length ? (
            <ul className="space-y-3">
              {content.goals.map((goal, i) => (
                <li
                  key={`${goal.title}-${i}`}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-slate-100">{goal.title}</div>
                      {goal.description ? (
                        <div className="mt-1 text-[13px] leading-relaxed text-slate-400">
                          {goal.description}
                        </div>
                      ) : null}
                    </div>
                    {goal.target_date ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-emerald-200">
                        截止 {formatDate(goal.target_date)}
                      </span>
                    ) : null}
                  </div>
                  {typeof goal.progress === "number" ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] tabular-nums text-slate-400">
                        <span>进度</span>
                        <span className="text-emerald-300">{goal.progress}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(2, goal.progress)}%`,
                            background: "linear-gradient(90deg, #34d399, #10b981)"
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              暂未设定近期目标。{isOwner ? "去「编辑首页」设定 OKR / 季度目标。" : "等创始人设定。"}
            </p>
          )}
        </SectionCard>

        <SectionCard icon={Megaphone} label="公告栏" accent="rose" delayMs={320}>
          {content.announcements.length ? (
            <ul className="space-y-2">
              {content.announcements.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <span className="text-[14px] leading-relaxed text-slate-200">{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">没有最新公告。</p>
          )}
        </SectionCard>
      </div>

      {/* Owner 编辑入口 */}
      {isOwner ? (
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/home/edit">
              <Edit3 className="h-3.5 w-3.5" />
              编辑首页内容
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** 单张 section 卡（使命 / 愿景 / 价值观 / 目标 / 公告 共用）。 */
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
    amber: { dot: "bg-amber-300", iconBg: "bg-amber-500/15", iconText: "text-amber-300", border: "border-amber-500/20" },
    orange: { dot: "bg-orange-300", iconBg: "bg-orange-500/15", iconText: "text-orange-300", border: "border-orange-500/20" },
    emerald: { dot: "bg-emerald-300", iconBg: "bg-emerald-500/15", iconText: "text-emerald-300", border: "border-emerald-500/20" },
    rose: { dot: "bg-rose-300", iconBg: "bg-rose-500/15", iconText: "text-rose-300", border: "border-rose-500/20" }
  }[accent];

  return (
    <section
      className={`home-card-in relative overflow-hidden rounded-3xl border ${palette.border} bg-white/[0.025] p-6`}
      style={{
        animationDelay: `${delayMs}ms`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 32px -16px rgba(0,0,0,0.45)"
      }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${palette.iconBg}`}>
          <Icon className={`h-4 w-4 ${palette.iconText}`} />
        </div>
        <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
        <span className={`ml-auto h-1.5 w-1.5 rounded-full ${palette.dot}`} />
      </div>
      {children}
    </section>
  );
}
