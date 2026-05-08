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

/** 把多段落字符串拆成 paragraph 数组（支持 \n\n 或单 \n 分段）。 */
function splitParagraphs(text?: string): string[] {
  if (!text) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  // 优先双换行；若没有，则按单换行拆。空行会被过滤。
  const byDouble = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (byDouble.length > 1) return byDouble;
  return trimmed.split(/\n/).map((p) => p.trim()).filter(Boolean);
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
  const visionParagraphs = splitParagraphs(content.vision);

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
        {/* 1) Welcome — 全宽紧凑 */}
        <WelcomeHero userName={userName} organizationName={organization.name} />

        {/* 2) 主体：左 2/3 愿景（Word 风），右 1/3 使命 + 价值观 + 公告 */}
        <div className="grid gap-3 lg:grid-cols-3">
          {/* 愿景 — Word 风文档式显示 */}
          <section
            className="home-card-in relative col-span-1 overflow-hidden rounded-2xl border border-orange-500/20 lg:col-span-2"
            style={{
              animationDelay: "0ms",
              background:
                "linear-gradient(180deg, rgba(254,240,200,0.04) 0%, rgba(8,12,28,0.92) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)"
            }}
          >
            {/* 顶部装饰：纸张感 + 标签 */}
            <div className="flex items-center gap-2 border-b border-orange-500/10 px-5 py-2.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-orange-500/15">
                <Telescope className="h-3.5 w-3.5 text-orange-300" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                公司愿景
              </span>
              <span className="ml-auto text-[10px] tabular-nums text-slate-500">
                {visionParagraphs.length} 段 · {(content.vision ?? "").length} 字
              </span>
            </div>
            <article className="px-6 py-5 lg:px-8 lg:py-6">
              {visionParagraphs.length ? (
                <div className="space-y-3.5">
                  {visionParagraphs.map((para, i) => (
                    <p
                      key={i}
                      className="text-[16px] leading-[1.85] tracking-[0.01em] text-slate-100 first:font-medium first:text-slate-50"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-muted-foreground">
                  愿景未填写。{isOwner ? "去「编辑首页」写下未来 3-5 年我们想成为的样子。" : ""}
                </p>
              )}
            </article>
          </section>

          {/* 右栏：使命 / 价值观 / 公告 三件套 */}
          <div className="grid gap-3">
            {/* 使命 */}
            <SectionCard icon={Compass} label="使命" accent="amber" delayMs={60} compact>
              <p className="text-[13px] leading-relaxed text-slate-100">{content.mission ?? "—"}</p>
            </SectionCard>

            {/* 价值观 — 紧凑 5 行 */}
            <SectionCard icon={Sparkles} label="价值观" accent="amber" delayMs={120} compact>
              {content.values.length ? (
                <ul className="space-y-1">
                  {content.values.map((value, i) => (
                    <li key={`${value.title}-${i}`} className="flex items-baseline gap-2" title={value.description}>
                      <span className="font-mono text-[10px] text-amber-300/80">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate text-[12.5px] font-medium text-slate-100">
                        {value.title}
                      </span>
                      {value.description ? (
                        <span className="truncate text-[10.5px] text-slate-500">
                          · {value.description}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-muted-foreground">未填写。</p>
              )}
            </SectionCard>

            {/* 公告 */}
            <SectionCard icon={Megaphone} label="公告栏" accent="rose" delayMs={180} compact>
              {content.announcements.length ? (
                <ul className="space-y-1">
                  {content.announcements.slice(0, 3).map((line, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                      <span className="line-clamp-1 text-[12px] leading-relaxed text-slate-200">
                        {line}
                      </span>
                    </li>
                  ))}
                  {content.announcements.length > 3 ? (
                    <li className="text-[10px] text-slate-500">
                      还有 {content.announcements.length - 3} 条…
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-[12px] text-muted-foreground">没有最新公告。</p>
              )}
            </SectionCard>
          </div>
        </div>

        {/* 3) 近期目标 — 全宽底栏 */}
        <SectionCard icon={Target} label="近期目标" accent="emerald" delayMs={240}>
          {content.goals.length ? (
            <div className="grid gap-2 lg:grid-cols-3">
              {content.goals.slice(0, 3).map((goal, i) => (
                <div
                  key={`${goal.title}-${i}`}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-slate-100">
                        {goal.title}
                      </div>
                      {goal.description ? (
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                          {goal.description}
                        </div>
                      ) : null}
                    </div>
                    {goal.target_date ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] tabular-nums text-emerald-200">
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
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              暂未设定近期目标。{isOwner ? "去「编辑首页」设定 OKR / 季度目标。" : ""}
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

/** Section 卡。compact 模式更紧凑（适合右栏小卡）。 */
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
  const headerMb = compact ? "mb-2" : "mb-2.5";
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
