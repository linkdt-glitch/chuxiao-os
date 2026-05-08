import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Bot,
  ClipboardCheck,
  Radar
} from "lucide-react";
import {
  AlertPill,
  CardHead,
  DecisionCard,
  ExecCard,
  HeroMetric,
  InlineStat,
  MonthBars,
  RankRow,
  RunwayBar,
  Sparkline,
  TodayBrief
} from "@/components/dashboard/exec-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentOrganization, getCurrentUser } from "@/lib/auth";
import { getCockpitData } from "@/lib/data/cockpit";
import { getDashboardData } from "@/lib/data/queries";

function money(value: number, options?: { compact?: boolean }) {
  if (options?.compact && Math.abs(value) >= 10000) {
    if (Math.abs(value) >= 1_0000_0000) return `¥${(value / 1_0000_0000).toFixed(2)}亿`;
    if (Math.abs(value) >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
  }
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function greetingFor(now: Date) {
  const h = now.getHours();
  if (h < 5) return "深夜好";
  if (h < 11) return "早上好";
  if (h < 13) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

function dateLineFor(now: Date) {
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${now.getFullYear()}.${m}.${d} · ${weekday} · ${hh}:${mm}`;
}

/**
 * 选一句"今天最重要的事"做 hero 简报。优先级：
 *  1. 现金跑道告急（<3 月）
 *  2. 系统里有 danger 级决策建议
 *  3. 待我处理的审批 / 确认积压（≥3）
 *  4. 本月亏损
 *  5. 一切稳健 → 用稳健提示
 */
function pickBriefing({
  cockpit,
  basics
}: {
  cockpit: Awaited<ReturnType<typeof getCockpitData>>;
  basics: Awaited<ReturnType<typeof getDashboardData>>;
}): {
  headline: string;
  detail?: string;
  tone: "default" | "good" | "warn" | "alert";
  cta?: { label: string; href: string };
} {
  const pendingTotal =
    basics.stats.financePendingApprovals +
    basics.stats.aiPendingConfirmations +
    basics.stats.projectPendingApprovals;
  const danger = cockpit.decisions.find((d) => d.severity === "danger");

  // 1. 现金跑道
  if (cockpit.cashMetrics.runwayMonths !== null && cockpit.cashMetrics.runwayMonths < 3) {
    return {
      headline: `现金跑道只剩 ${cockpit.cashMetrics.runwayMonths} 个月，立即冻结非必要支出。`,
      detail: `按月均支出 ${money(cockpit.cashMetrics.avgMonthlyExpense, { compact: true })} 测算，缓冲已经低于安全线。`,
      tone: "alert",
      cta: { label: "审视支出", href: "/finance/records?type=expense" }
    };
  }
  // 2. danger decision
  if (danger) {
    return {
      headline: danger.title,
      detail: `${danger.judgment}  → ${danger.action}`,
      tone: "alert",
      cta: { label: "查看详情", href: "/finance/reports" }
    };
  }
  // 3. 待办积压
  if (pendingTotal >= 3) {
    return {
      headline: `${pendingTotal} 项待你决策，今日先把这条线打通。`,
      detail: `财务 ${basics.stats.financePendingApprovals} · AI ${basics.stats.aiPendingConfirmations} · 项目 ${basics.stats.projectPendingApprovals}`,
      tone: "warn",
      cta: { label: "进入待办", href: "/finance/records?status=pending_approval" }
    };
  }
  // 4. 本月亏损
  if (cockpit.monthMetrics.profit < 0) {
    return {
      headline: `本月净亏损 ${money(Math.abs(cockpit.monthMetrics.profit), { compact: true })}，需要重新看支出结构。`,
      detail: `收入 ${money(cockpit.monthMetrics.income, { compact: true })} · 支出 ${money(cockpit.monthMetrics.expense, { compact: true })}`,
      tone: "warn",
      cta: { label: "查看支出", href: "/finance/reports" }
    };
  }
  // 5. 稳健
  return {
    headline: "一切按节奏推进，今天没有需要紧急处理的事。",
    detail:
      cockpit.cashMetrics.runwayMonths !== null
        ? `现金跑道 ${cockpit.cashMetrics.runwayMonths} 月 · 本月利润 ${money(cockpit.monthMetrics.profit, { compact: true })} · 利润率 ${cockpit.monthMetrics.profitMargin}%`
        : `本月利润 ${money(cockpit.monthMetrics.profit, { compact: true })} · 利润率 ${cockpit.monthMetrics.profitMargin}%`,
    tone: "good"
  };
}

export default async function CockpitPage() {
  const [organization, user, cockpit, basics] = await Promise.all([
    getCurrentOrganization(),
    getCurrentUser(),
    getCockpitData(),
    getDashboardData()
  ]);

  const now = new Date();
  const userFirstName = (user.full_name ?? user.email ?? "").split(/\s+|@/)[0] || "你好";
  const greeting = `${greetingFor(now)}，${userFirstName}`;
  const dateString = dateLineFor(now);
  const brief = pickBriefing({ cockpit, basics });

  // ── month profit delta (vs previous month)
  const months = cockpit.monthly;
  const lastMonth = months[months.length - 2];
  const profitDelta = (() => {
    if (!lastMonth) return undefined;
    const last = lastMonth.profit;
    const cur = cockpit.monthMetrics.profit;
    if (last === 0) return undefined;
    const pct = ((cur - last) / Math.abs(last)) * 100;
    if (!Number.isFinite(pct)) return undefined;
    const dir: "up" | "down" | "flat" = pct > 1 ? "up" : pct < -1 ? "down" : "flat";
    const tone: "good" | "bad" | "neutral" = dir === "flat" ? "neutral" : pct > 0 ? "good" : "bad";
    return { value: `${Math.abs(pct).toFixed(0)}%`, direction: dir, tone };
  })();

  const profitSparkData = months.map((m) => m.profit);
  const incomeSparkData = months.map((m) => m.income);

  const profitTone: "default" | "good" | "bad" =
    cockpit.monthMetrics.profit > 0 ? "good" : cockpit.monthMetrics.profit < 0 ? "bad" : "default";

  const runwayMonths = cockpit.cashMetrics.runwayMonths;
  const cashTone: "default" | "good" | "bad" | "warn" =
    runwayMonths === null
      ? "default"
      : runwayMonths < 3
        ? "bad"
        : runwayMonths < 6
          ? "warn"
          : "good";

  const pendingAlertsTotal =
    basics.stats.financePendingApprovals +
    basics.stats.aiPendingConfirmations +
    basics.stats.projectPendingApprovals +
    basics.stats.unprocessedEvents;

  const pendingTone: "default" | "good" | "bad" | "warn" =
    pendingAlertsTotal === 0 ? "good" : pendingAlertsTotal >= 8 ? "bad" : "warn";

  const projectMaxIncome = Math.max(1, ...cockpit.projectRevenue.map((p) => p.income));
  const expenseMax = Math.max(1, ...cockpit.expenseTop.map((c) => c.amount));

  return (
    <>
      {/* ── 1. Greeting + brief ────────────────────────────────────── */}
      <TodayBrief
        greeting={greeting}
        dateString={`${organization.name} · ${dateString}`}
        headline={brief.headline}
        detail={brief.detail}
        tone={brief.tone}
        cta={brief.cta}
      />

      {/* ── 2. Three hero metrics ─────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <HeroMetric
          label="本月利润"
          value={money(cockpit.monthMetrics.profit, { compact: true })}
          tone={profitTone}
          delta={profitDelta}
          helper={
            <span>
              收入 {money(cockpit.monthMetrics.income, { compact: true })} · 支出 {money(cockpit.monthMetrics.expense, { compact: true })}
              <span className="text-slate-500"> · 利润率 {cockpit.monthMetrics.profitMargin}%</span>
            </span>
          }
          visual={
            profitSparkData.length > 1 ? (
              <Sparkline
                data={profitSparkData}
                width={260}
                height={42}
                tone={profitTone === "bad" ? "rose" : profitTone === "good" ? "emerald" : "amber"}
              />
            ) : undefined
          }
        />

        <HeroMetric
          label="现金跑道"
          value={runwayMonths === null ? "—" : `${runwayMonths}`}
          unit={runwayMonths === null ? undefined : "月"}
          tone={cashTone}
          helper={
            <span>
              可用现金 {money(cockpit.cashMetrics.cashBalance, { compact: true })} · 月均支出 {money(cockpit.cashMetrics.avgMonthlyExpense, { compact: true })}
            </span>
          }
          visual={<RunwayBar months={runwayMonths} />}
          href="/finance/accounts"
        />

        <HeroMetric
          label="待我决策"
          value={String(pendingAlertsTotal)}
          unit="项"
          tone={pendingTone}
          helper={
            <span>
              {basics.stats.financePendingApprovals} 财务 · {basics.stats.aiPendingConfirmations} AI · {basics.stats.projectPendingApprovals} 项目 · {basics.stats.unprocessedEvents} 事件
            </span>
          }
          visual={
            incomeSparkData.length > 1 ? (
              <Sparkline data={incomeSparkData} width={260} height={42} tone="amber" />
            ) : undefined
          }
        />
      </div>

      {/* ── 3. 6-month trend + 支出聚焦 (two-column) ───────────────── */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_360px]">
        <ExecCard>
          <CardHead
            title="近 6 个月现金流"
            hint="收入（绿）/ 支出（橙）按月对比"
            cta={{ label: "财务报表", href: "/finance/reports" }}
          />
          <div className="px-5 pb-5 pt-2">
            {cockpit.monthly.length ? (
              <MonthBars
                data={cockpit.monthly.map((m) => ({ label: m.label, income: m.income, expense: m.expense }))}
              />
            ) : (
              <EmptyState title="暂无月度数据" />
            )}
          </div>
        </ExecCard>

        <ExecCard>
          <CardHead title="支出聚焦" hint="近 6 月类目占比 TOP 5" />
          <div className="px-3 pb-4 pt-1">
            {cockpit.expenseTop.length ? (
              <div className="space-y-1">
                {cockpit.expenseTop.slice(0, 5).map((c, i) => (
                  <RankRow
                    key={c.name}
                    rank={i + 1}
                    primary={c.name}
                    primaryHint={`占比 ${c.share}%`}
                    secondary={money(c.amount, { compact: true })}
                    bar={{ value: c.amount, max: expenseMax, tone: "amber" }}
                  />
                ))}
              </div>
            ) : (
              <div className="px-2 py-6">
                <EmptyState title="暂无支出类目" />
              </div>
            )}
          </div>
        </ExecCard>
      </div>

      {/* ── 4. 项目战力 + 潜力雷达 ─────────────────────────────── */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <ExecCard>
          <CardHead
            title="项目营收 TOP 5"
            hint="近 90 天收入排行"
            cta={{ label: "全部项目", href: "/projects" }}
          />
          <div className="px-3 pb-4 pt-1">
            {cockpit.projectRevenue.length ? (
              <div className="space-y-1">
                {cockpit.projectRevenue.slice(0, 5).map((p, i) => (
                  <RankRow
                    key={`${p.projectId ?? "noid"}-${p.projectName}-${i}`}
                    rank={i + 1}
                    primary={p.projectName}
                    primaryHint={
                      <span>
                        {p.taskProgress === null ? "—" : `进度 ${p.taskProgress}%`}
                        {" · 净利 "}
                        <span className={p.profit >= 0 ? "text-emerald-300" : "text-rose-300"}>
                          {money(p.profit, { compact: true })}
                        </span>
                      </span>
                    }
                    secondary={
                      <span className="text-emerald-300">{money(p.income, { compact: true })}</span>
                    }
                    bar={{ value: p.income, max: projectMaxIncome, tone: "emerald" }}
                    href={p.projectId ? `/projects/${p.projectId}` : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="px-2 py-6">
                <EmptyState
                  title="还没有项目营收数据"
                  description="在财务中心记账时填上项目，这里会按项目实时排榜。"
                />
              </div>
            )}
          </div>
        </ExecCard>

        <ExecCard>
          <CardHead
            title="潜力雷达"
            hint="月均收入 + 任务进度 + 利润率综合得分"
            meta={cockpit.projectPotential.length ? `${cockpit.projectPotential.length} 个入榜` : undefined}
          />
          <div className="px-5 pb-5 pt-2">
            {cockpit.projectPotential.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {cockpit.projectPotential.slice(0, 4).map((p, i) => {
                  const score = p.potentialScore ?? 0;
                  const tone: "good" | "warn" | "bad" =
                    score >= 70 ? "good" : score >= 40 ? "warn" : "bad";
                  const fill = tone === "good" ? "#34d399" : tone === "bad" ? "#fb7185" : "#fbbf24";
                  return (
                    <div
                      key={`${p.projectId ?? "noid"}-${p.projectName}-${i}`}
                      className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.10]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Radar className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                          <span className="truncate text-[13px] font-medium text-slate-100">
                            {p.projectName}
                          </span>
                        </div>
                        <span className="shrink-0 text-[20px] font-semibold tabular-nums text-slate-50">
                          {p.potentialScore === null ? "—" : p.potentialScore}
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(2, score)}%`, background: fill }}
                        />
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <InlineStat
                          label="月均收入"
                          value={p.avgMonthlyIncome === null ? "—" : money(p.avgMonthlyIncome, { compact: true })}
                          tone="good"
                        />
                        <InlineStat
                          label="1 年预计"
                          value={p.projectedAnnualRevenue === null ? "—" : money(p.projectedAnnualRevenue, { compact: true })}
                          tone="warn"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="潜力评分需要更多数据"
                description="每个项目至少需要近 30 天的财务记录与任务进度才能上榜。"
              />
            )}
          </div>
        </ExecCard>
      </div>

      {/* ── 5. AI decisions ─────────────────────────────────────── */}
      {cockpit.decisions.length ? (
        <div className="mt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-200">
              AI 给老板的建议
            </h2>
            <span className="text-[11px] text-slate-500">
              {cockpit.decisions.length} 条 · 由真实流水派生
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cockpit.decisions.slice(0, 3).map((d, i) => (
              <DecisionCard key={i} {...d} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── 6. Pending strip ────────────────────────────────────── */}
      <div className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-200">
            待我处理
          </h2>
          <span className="text-[11px] text-slate-500">
            {pendingAlertsTotal === 0 ? "全部清空" : `合计 ${pendingAlertsTotal} 项`}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AlertPill
            icon={Banknote}
            label="财务待审批"
            value={basics.stats.financePendingApprovals}
            href="/finance/records?status=pending_approval"
          />
          <AlertPill
            icon={Bot}
            label="AI 待确认"
            value={basics.stats.aiPendingConfirmations}
            href="/ai-workforce/confirmations"
          />
          <AlertPill
            icon={ClipboardCheck}
            label="项目审批"
            value={basics.stats.projectPendingApprovals}
            href="/projects/tasks"
          />
          <AlertPill
            icon={AlertTriangle}
            label="未处理事件"
            value={basics.stats.unprocessedEvents}
            href="/events"
            tone={basics.stats.unprocessedEvents > 0 ? "alert" : "ok"}
          />
        </div>
      </div>

      {/* ── 7. Improvements & footer (low-key) ─────────────────── */}
      {basics.improvements.length ? (
        <div className="mt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-200">
              组织优化建议
            </h2>
            <span className="text-[11px] text-slate-500">{basics.improvements.length} 条</span>
          </div>
          <ExecCard>
            <ul className="divide-y divide-white/[0.05]">
              {basics.improvements.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-slate-100">{item.title}</div>
                    <p className="mt-1 line-clamp-2 text-[12px] text-slate-400">{item.description}</p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
                      (item.impact_level === "critical"
                        ? "bg-rose-500/15 text-rose-300"
                        : item.impact_level === "high"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-white/[0.06] text-slate-300")
                    }
                  >
                    {item.impact_level}
                  </span>
                </li>
              ))}
            </ul>
          </ExecCard>
        </div>
      ) : null}

      {/* footer signal strip */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 px-1 font-mono text-[11px] text-slate-500">
        <span>启用模块 <span className="tabular-nums text-slate-300">{basics.stats.enabledModules}</span></span>
        <span>组织成员 <span className="tabular-nums text-slate-300">{basics.stats.members}</span></span>
        <span>AI 员工 <span className="tabular-nums text-slate-300">{basics.stats.agents}</span></span>
        <span>AI 服务商 <span className="tabular-nums text-slate-300">{basics.stats.providers}</span></span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          系统在线
        </span>
        <Link href="/logs" className="text-amber-300/70 hover:text-amber-200">
          查看完整日志 →
        </Link>
      </div>
    </>
  );
}
