import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Bot,
  ClipboardCheck,
  Cpu,
  Layers3,
  Radar,
  Rocket,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HBar,
  HudFrame,
  MonthlyMiniBars,
  PotentialMeter,
  RingGauge,
  StatusLight,
  Telemetry
} from "@/components/cockpit/hud";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { getCockpitData } from "@/lib/data/cockpit";
import { getDashboardData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

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

function formatTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default async function CockpitPage() {
  const [organization, member, cockpit, basics] = await Promise.all([
    getCurrentOrganization(),
    getCurrentMember(),
    getCockpitData(),
    getDashboardData()
  ]);

  // Tone heuristics — never fabricate, always derived.
  const profitTone =
    cockpit.todayMetrics.profit > 0 ? "success" : cockpit.todayMetrics.profit < 0 ? "alert" : "default";
  const monthProfitTone =
    cockpit.monthMetrics.profit > 0 ? "success" : cockpit.monthMetrics.profit < 0 ? "alert" : "default";
  const runwayTone =
    cockpit.cashMetrics.runwayMonths === null
      ? "default"
      : cockpit.cashMetrics.runwayMonths < 3
        ? "alert"
        : cockpit.cashMetrics.runwayMonths < 6
          ? "default"
          : "success";

  const pendingAlertsTotal =
    basics.stats.financePendingApprovals +
    basics.stats.aiPendingConfirmations +
    basics.stats.projectPendingApprovals +
    basics.stats.unprocessedEvents;

  const decisions = cockpit.decisions;
  const projectMaxIncome = Math.max(1, ...cockpit.projectRevenue.map((p) => p.income));
  const expenseMax = Math.max(1, ...cockpit.expenseTop.map((c) => c.amount));

  return (
    <>
      {/* ── Cockpit header strip ─────────────────────────────────────── */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="hidden h-10 w-10 items-center justify-center rounded-lg sm:flex"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.22), rgba(3,7,18,0.95))",
                boxShadow:
                  "0 0 16px rgba(249,115,22,0.28), 0 0 0 1px rgba(249,115,22,0.22)"
              }}
            >
              <Rocket className="h-5 w-5 text-orange-300" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.24em] text-orange-400/70">
                老板驾驶舱
              </div>
              <h1
                className="truncate bg-gradient-to-r from-orange-300 via-amber-200 to-orange-200 bg-clip-text text-xl font-semibold tracking-tight text-transparent sm:text-2xl"
                style={{ filter: "drop-shadow(0 0 12px rgba(249,115,22,0.30))" }}
              >
                {organization.name} · 经营战情室
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div
              className="rounded px-2 py-1 font-mono text-[11px] tabular-nums tracking-wider text-orange-300"
              style={{
                background: "rgba(249,115,22,0.10)",
                border: "1px solid rgba(249,115,22,0.26)",
                boxShadow: "0 0 10px rgba(249,115,22,0.12)"
              }}
            >
              {cockpit.today} · {formatTime()}
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-emerald-300">
              <StatusLight tone="success" />
              系统在线
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          只看钱、看项目、看风险。{member.role?.name ?? "成员"} 视角的经营全景，数据由真实流水派生，不足处以 — 标记。
        </p>
      </div>

      {/* ── Tier 1: 4 core HUD tiles ─────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HudFrame label="今日盈利" tone={profitTone} meta={`${cockpit.todayMetrics.recordCount} 条`}>
          <Telemetry
            label="净利润"
            value={money(cockpit.todayMetrics.profit, { compact: true })}
            tone={profitTone}
            helper={`收入 ${money(cockpit.todayMetrics.income, { compact: true })} · 支出 ${money(cockpit.todayMetrics.expense, { compact: true })}`}
          />
        </HudFrame>

        <HudFrame label="本月利润" tone={monthProfitTone} meta={`利润率 ${cockpit.monthMetrics.profitMargin}%`}>
          <Telemetry
            label="本月净利润"
            value={money(cockpit.monthMetrics.profit, { compact: true })}
            tone={monthProfitTone}
            helper={`收入 ${money(cockpit.monthMetrics.income, { compact: true })} · 支出 ${money(cockpit.monthMetrics.expense, { compact: true })}`}
          />
        </HudFrame>

        <HudFrame label="现金余额" meta="人民币">
          <Telemetry
            label="可用现金"
            value={money(cockpit.cashMetrics.cashBalance, { compact: true })}
            helper={`月均支出 ${money(cockpit.cashMetrics.avgMonthlyExpense, { compact: true })}`}
            href="/finance/accounts"
          />
        </HudFrame>

        <HudFrame label="现金可支撑期" tone={runwayTone} meta={runwayTone === "alert" ? "警戒" : runwayTone === "success" ? "稳健" : "关注"}>
          <Telemetry
            label="可支撑月数"
            value={cockpit.cashMetrics.runwayMonths === null ? "—" : `${cockpit.cashMetrics.runwayMonths}`}
            unit={cockpit.cashMetrics.runwayMonths === null ? undefined : "月"}
            tone={runwayTone}
            helper={
              cockpit.cashMetrics.runwayMonths === null
                ? "需积累 ≥3 个月支出数据后估算"
                : cockpit.cashMetrics.runwayMonths < 3
                  ? "建议立即冻结非必要支出"
                  : cockpit.cashMetrics.runwayMonths < 6
                    ? "保持节奏，控制大额支出"
                    : "现金缓冲健康"
            }
          />
        </HudFrame>
      </div>

      {/* ── Tier 2: 项目营收战力榜 + 趋势 ─────────────────────────────── */}
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_360px]">
        <HudFrame
          label="项目营收战力榜"
          meta={`近 ${90} 天 · 前 ${Math.min(5, cockpit.projectRevenue.length)} 名`}
        >
          {cockpit.projectRevenue.length ? (
            <div className="space-y-3">
              {cockpit.projectRevenue.slice(0, 5).map((p, i) => (
                <div
                  key={`${p.projectId ?? "noid"}-${p.projectName}-${i}`}
                  className="rounded-lg p-3 transition-colors hover:bg-orange-500/[0.04]"
                  style={{
                    background: "rgba(8,13,28,0.55)",
                    border: "1px solid rgba(249,115,22,0.10)"
                  }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded font-mono text-[11px] font-bold text-orange-300"
                        style={{
                          background: "rgba(249,115,22,0.14)",
                          border: "1px solid rgba(249,115,22,0.30)"
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate font-medium text-slate-100">{p.projectName}</span>
                      {p.status ? <StatusBadge value={p.status} /> : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold tabular-nums text-emerald-300">
                        {money(p.income, { compact: true })}
                      </div>
                      <div className="font-mono text-[10px] tracking-wide text-slate-500">
                        近 90 天收入
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <HBar
                      label={
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          收入
                        </span>
                      }
                      value={p.income}
                      max={projectMaxIncome}
                      tone="success"
                    />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="支出" value={money(p.expense, { compact: true })} tone={p.expense > 0 ? "warn" : undefined} />
                    <Stat label="净利" value={money(p.profit, { compact: true })} tone={p.profit >= 0 ? "good" : "bad"} />
                    <Stat label="进度" value={p.taskProgress === null ? "—" : `${p.taskProgress}%`} />
                    <Stat
                      label="未来 1 年预计"
                      value={p.projectedAnnualRevenue === null ? "—" : money(p.projectedAnnualRevenue, { compact: true })}
                      tone={p.projectedAnnualRevenue !== null ? "good" : undefined}
                      helper={p.projectedAnnualRevenue === null ? p.reason : undefined}
                    />
                  </div>
                </div>
              ))}

              {cockpit.projectRevenue.length > 5 ? (
                <Link
                  href="/projects"
                  className="block py-1 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-orange-400/70 hover:text-orange-300"
                >
                  + 查看全部 {cockpit.projectRevenue.length} 个项目
                </Link>
              ) : null}

              {!cockpit.hasProjectFinanceLink ? (
                <div className="rounded p-2 text-[11px] text-amber-300/80" style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.20)"
                }}>
                  提示：当前流水通过 project_name 关联项目；建议在记账时选择项目，以激活进度、潜力等更精准的指标。
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="还没有项目营收数据"
              description="在财务中心记账时填上 project_id（或 project_name），这里就会按项目实时排榜，并生成 1 年预计收入。"
            />
          )}
        </HudFrame>

        <div className="space-y-3">
          {/* 6 month income/expense */}
          <HudFrame label="近 6 个月现金流" meta="月柱">
            {cockpit.monthly.length ? (
              <>
                <MonthlyMiniBars
                  data={cockpit.monthly.map((m) => ({ label: m.label, income: m.income, expense: m.expense }))}
                />
                <div className="mt-3 flex items-center justify-between gap-2 font-mono text-[10px] tracking-wide text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm" style={{ background: "rgba(74,222,128,0.85)" }} />
                    收入
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm" style={{ background: "rgba(249,115,22,0.85)" }} />
                    支出
                  </span>
                </div>
              </>
            ) : (
              <EmptyState title="暂无月度数据" />
            )}
          </HudFrame>

          {/* Top expense categories */}
          <HudFrame label="支出排名" tone="alert" meta={cockpit.expenseTop.length ? "类目" : ""}>
            {cockpit.expenseTop.length ? (
              <div className="space-y-2.5">
                {cockpit.expenseTop.slice(0, 5).map((c) => (
                  <HBar
                    key={c.name}
                    label={c.name}
                    value={c.amount}
                    max={expenseMax}
                    tone="alert"
                    rightLabel={
                      <span>
                        {money(c.amount, { compact: true })}{" "}
                        <span className="text-slate-500">{c.share}%</span>
                      </span>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="暂无支出类目" />
            )}
          </HudFrame>
        </div>
      </div>

      {/* ── Tier 3: 潜力雷达 ─────────────────────────────────────────── */}
      <div className="mt-5">
        <HudFrame
          label="潜力雷达"
          meta={cockpit.projectPotential.length ? `${cockpit.projectPotential.length} 个项目入榜` : ""}
        >
          {cockpit.projectPotential.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cockpit.projectPotential.slice(0, 6).map((p, i) => (
                <div
                  key={`${p.projectId ?? "noid"}-${p.projectName}-${i}`}
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(8,13,28,0.55)",
                    border: "1px solid rgba(249,115,22,0.12)"
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Radar className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                      <span className="truncate text-sm font-medium text-slate-100">{p.projectName}</span>
                    </div>
                    <RingGauge
                      value={p.potentialScore}
                      size={56}
                      thickness={5}
                      label="潜力"
                      tone={(p.potentialScore ?? 0) >= 70 ? "success" : (p.potentialScore ?? 0) >= 40 ? "default" : "alert"}
                    />
                  </div>
                  <div className="mt-2.5">
                    <PotentialMeter value={p.potentialScore} />
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="font-mono text-slate-500">
                      月均收入
                      <div className="mt-0.5 font-semibold tabular-nums text-emerald-300">
                        {p.avgMonthlyIncome === null ? "—" : money(p.avgMonthlyIncome, { compact: true })}
                      </div>
                    </div>
                    <div className="font-mono text-slate-500">
                      1 年预计
                      <div className="mt-0.5 font-semibold tabular-nums text-orange-300">
                        {p.projectedAnnualRevenue === null ? "—" : money(p.projectedAnnualRevenue, { compact: true })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="潜力评分需要更多数据"
              description="评分综合：日均收入密度 + 任务进度 + 利润率。每个项目至少需要近 30 天的财务记录与任务进度才能上榜。"
            />
          )}
        </HudFrame>
      </div>

      {/* ── Tier 4: 决策建议 + 待办告警 ────────────────────────────────── */}
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_360px]">
        <HudFrame
          label="经营决策建议"
          tone={decisions.some((d) => d.severity === "danger") ? "alert" : "default"}
          meta={`${decisions.length} 条`}
        >
          {decisions.length ? (
            <div className="space-y-2.5">
              {decisions.slice(0, 5).map((decision, i) => {
                const tone = decision.severity === "danger" ? "alert" : decision.severity === "success" ? "success" : "default";
                const accent = tone === "alert" ? "rgba(239,68,68,0.45)" : tone === "success" ? "rgba(74,222,128,0.45)" : "rgba(249,115,22,0.45)";
                return (
                  <div
                    key={i}
                    className="rounded p-3"
                    style={{
                      background: "rgba(8,13,28,0.55)",
                      border: "1px solid rgba(249,115,22,0.10)",
                      borderLeft: `3px solid ${accent}`
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        <StatusLight tone={tone} />
                        {decision.title}
                      </div>
                      <div className="font-mono text-[10px] tracking-wide text-slate-500">{decision.metric}</div>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{decision.judgment}</p>
                    <p className="mt-1 text-xs leading-relaxed text-orange-300/85">→ {decision.action}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="暂无经营建议" description="积累更多财务、项目和审批数据后，系统会自动生成可执行建议。" />
          )}
        </HudFrame>

        <div className="space-y-3">
          <HudFrame label="告警" tone={pendingAlertsTotal > 0 ? "alert" : "success"} meta={`${pendingAlertsTotal} 项`}>
            <div className="space-y-2">
              <AlertRow icon={Banknote} label="财务待审批" value={basics.stats.financePendingApprovals} href="/finance/records?status=pending_approval" />
              <AlertRow icon={Bot} label="AI 待确认" value={basics.stats.aiPendingConfirmations} href="/ai-workforce/confirmations" />
              <AlertRow icon={ClipboardCheck} label="项目审批" value={basics.stats.projectPendingApprovals} href="/projects/tasks" />
              <AlertRow icon={AlertTriangle} label="未处理事件" value={basics.stats.unprocessedEvents} href="/events" tone="alert" />
              {cockpit.alerts.highRiskCount > 0 ? (
                <AlertRow
                  icon={AlertTriangle}
                  label="高风险流水"
                  value={`${cockpit.alerts.highRiskCount} 条 / ${money(cockpit.alerts.highRiskAmount, { compact: true })}`}
                  href="/finance/records?risk=high"
                  tone="alert"
                />
              ) : null}
            </div>
          </HudFrame>

          <HudFrame label="智能劳动力" meta={`${basics.stats.aiInvocations} 次/月`}>
            <div className="space-y-2">
              <Telemetry label="活跃 AI 员工" value={String(basics.stats.agents)} unit="个" />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Stat label="AI 服务商" value={String(basics.stats.providers)} />
                <Stat label="启用模块" value={String(basics.stats.enabledModules)} />
              </div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/ai-workforce">→ AI 风暴创新实验室</Link>
              </Button>
            </div>
          </HudFrame>
        </div>
      </div>

      {/* ── Tier 5: 优化建议 + 操作日志（紧凑） ────────────────────────── */}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <HudFrame label="组织优化建议" meta={`${basics.improvements.length} 条`}>
          {basics.improvements.length ? (
            <div className="space-y-2">
              {basics.improvements.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded p-2.5"
                  style={{
                    background: "rgba(8,13,28,0.55)",
                    border: "1px solid rgba(249,115,22,0.10)"
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-medium text-slate-100">{item.title}</div>
                    <RiskBadge value={item.impact_level} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="暂无优化建议" />
          )}
        </HudFrame>

        <HudFrame label="最近操作" meta={`${basics.logs.length} 条`}>
          {basics.logs.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>动作</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {basics.logs.slice(0, 5).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-orange-300">{log.action}</TableCell>
                    <TableCell className="text-xs">{log.module}</TableCell>
                    <TableCell className="text-xs text-slate-400">{formatDate(log.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="暂无操作日志" />
          )}
        </HudFrame>
      </div>

      {/* ── System status footer strip ───────────────────────────────── */}
      <div className="mt-5">
        <div
          className="grid grid-cols-2 gap-2 rounded-lg p-3 sm:grid-cols-4"
          style={{
            background: "rgba(8,13,28,0.55)",
            border: "1px solid rgba(249,115,22,0.10)"
          }}
        >
          <SystemStat icon={Layers3} label="启用模块" value={basics.stats.enabledModules} />
          <SystemStat icon={Users} label="组织成员" value={basics.stats.members} />
          <SystemStat icon={Bot} label="AI 员工数量" value={basics.stats.agents} />
          <SystemStat icon={Cpu} label="AI Provider" value={basics.stats.providers} />
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
  helper
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn";
  helper?: string;
}) {
  const color =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-red-300"
        : tone === "warn"
          ? "text-amber-300"
          : "text-slate-100";
  return (
    <div title={helper}>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function AlertRow({
  icon: Icon,
  label,
  value,
  href,
  tone = "default"
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  href: string;
  tone?: "default" | "alert";
}) {
  const numericValue = typeof value === "number" ? value : 0;
  const isAlert = tone === "alert" || numericValue > 0;
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded px-2 py-2 transition-colors hover:bg-orange-500/[0.06]"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${isAlert ? "text-amber-300" : "text-slate-500"}`} />
        <span className="truncate text-sm text-slate-300">{label}</span>
      </div>
      <Badge variant={typeof value === "number" && value === 0 ? "secondary" : isAlert ? "warning" : "info"}>
        {value}
      </Badge>
    </Link>
  );
}

function SystemStat({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
        style={{
          background: "rgba(249,115,22,0.10)",
          border: "1px solid rgba(249,115,22,0.18)"
        }}
      >
        <Icon className="h-4 w-4 text-orange-300" />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
        <div className="text-sm font-semibold tabular-nums text-slate-100">{value}</div>
      </div>
    </div>
  );
}
