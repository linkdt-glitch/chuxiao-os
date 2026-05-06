/**
 * Cockpit (老板驾驶舱) data aggregator.
 *
 * Composes existing finance + project + AI data into the boss-facing
 * "spaceship cockpit" view. **No fabricated numbers** — when data is
 * insufficient, fields return `null` and the UI shows a "—" placeholder
 * with a brief explanation.
 */

import { cache } from "react";
import { getFinanceRecords } from "@/lib/finance/records";
import { getFinanceExecutiveDashboard, type FinanceDecision } from "@/lib/finance/reports";
import { getProjectSummary } from "@/lib/projects";
import type { FinanceRecord } from "@/lib/finance/types";
import type { Project } from "@/lib/projects/types";

export type ProjectRevenueRow = {
  projectId: string | null; // null when grouped by project_name only (legacy / demo)
  projectName: string;
  status?: string;
  income: number;
  expense: number;
  profit: number;
  recordCount: number;
  /** Avg monthly income across the lookback window. null if window < 30d of data. */
  avgMonthlyIncome: number | null;
  /** Naive 12-month projection = avgMonthlyIncome × 12. null if not derivable. */
  projectedAnnualRevenue: number | null;
  /** 0-100 composite potential score. null if not enough signal. */
  potentialScore: number | null;
  /** progress 0-100 from project tasks (if matched). null if unmatched. */
  taskProgress: number | null;
  /** Reason text shown when projection / score is null. */
  reason?: string;
};

export type CockpitData = {
  /** Today (server local date YYYY-MM-DD). */
  today: string;
  baseCurrency: string;
  todayMetrics: {
    income: number;
    expense: number;
    profit: number;
    recordCount: number;
  };
  monthMetrics: {
    income: number;
    expense: number;
    profit: number;
    profitMargin: number;
    expenseRatio: number;
  };
  cashMetrics: {
    cashBalance: number;
    avgMonthlyExpense: number;
    runwayMonths: number | null;
  };
  /** Finance approvals + high-risk waiting. */
  alerts: {
    pendingApprovalAmount: number;
    highRiskAmount: number;
    highRiskCount: number;
  };
  /** 6 month income/expense for sparkline. */
  monthly: Array<{ month: string; label: string; income: number; expense: number; profit: number }>;
  /** Top expense categories (current 6m window). */
  expenseTop: Array<{ name: string; amount: number; share: number }>;
  /** Projects ranked by booked income within window. */
  projectRevenue: ProjectRevenueRow[];
  /** Same projects re-ranked by potentialScore (only entries that have a score). */
  projectPotential: ProjectRevenueRow[];
  /** Auto-generated business decisions (from finance executive dashboard). */
  decisions: FinanceDecision[];
  /** Whether base data is sufficient for cockpit projections. */
  hasFinanceData: boolean;
  hasProjectFinanceLink: boolean;
};

const BASE_CURRENCY = "CNY";
const LOOKBACK_DAYS = 90;
const MS_PER_DAY = 86400000;

function todayISO() {
  const d = new Date();
  // Use local date so "today" matches the operator's wall-clock.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isBooked(record: FinanceRecord) {
  return record.status === "approved" || record.status === "paid";
}
function isIncome(record: FinanceRecord) {
  return record.record_type === "income" || record.record_type === "refund";
}
function isExpense(record: FinanceRecord) {
  return record.record_type === "expense" || record.record_type === "reimbursement";
}
function inBaseCurrency(record: FinanceRecord) {
  return record.currency === BASE_CURRENCY;
}

function projectKeyOf(record: FinanceRecord) {
  // Prefer project_id (real link), fall back to project_name (legacy / unlinked).
  if (record.project_id) return `id:${record.project_id}`;
  if (record.project_name && record.project_name.trim()) return `name:${record.project_name.trim()}`;
  return null;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Wrapped with React `cache()` so multiple components on the same RSC
 * render share a single computation. Pure aggregation, no side effects.
 */
export const getCockpitData = cache(async (): Promise<CockpitData> => {
  const today = todayISO();
  const sinceISO = new Date(Date.now() - LOOKBACK_DAYS * MS_PER_DAY).toISOString().slice(0, 10);

  const [executive, projectSummary, lookbackRecords] = await Promise.all([
    getFinanceExecutiveDashboard(6).catch(() => null),
    getProjectSummary().catch(() => null),
    getFinanceRecords({ date_from: sinceISO, limit: 1000 }).catch(() => [] as FinanceRecord[])
  ]);

  // ── Today's P&L ─────────────────────────────────────────────
  const todayRecords = lookbackRecords.filter(
    (record) => record.occurred_at?.slice(0, 10) === today && isBooked(record) && inBaseCurrency(record)
  );
  const todayIncome = todayRecords.filter(isIncome).reduce((sum, r) => sum + Number(r.amount), 0);
  const todayExpense = todayRecords.filter(isExpense).reduce((sum, r) => sum + Number(r.amount), 0);

  // ── Project aggregation ─────────────────────────────────────
  const bookedRecords = lookbackRecords.filter(isBooked).filter(inBaseCurrency);
  const groupedByProject = new Map<string, {
    projectId: string | null;
    projectName: string;
    income: number;
    expense: number;
    recordCount: number;
    earliestDate: string;
    latestDate: string;
  }>();

  for (const record of bookedRecords) {
    const key = projectKeyOf(record);
    if (!key) continue;
    const existing = groupedByProject.get(key);
    const projectName = record.project_name?.trim() || "(未命名项目)";
    const occurredAt = record.occurred_at.slice(0, 10);
    if (existing) {
      if (isIncome(record)) existing.income += Number(record.amount);
      if (isExpense(record)) existing.expense += Number(record.amount);
      existing.recordCount += 1;
      if (occurredAt < existing.earliestDate) existing.earliestDate = occurredAt;
      if (occurredAt > existing.latestDate) existing.latestDate = occurredAt;
    } else {
      groupedByProject.set(key, {
        projectId: record.project_id ?? null,
        projectName,
        income: isIncome(record) ? Number(record.amount) : 0,
        expense: isExpense(record) ? Number(record.amount) : 0,
        recordCount: 1,
        earliestDate: occurredAt,
        latestDate: occurredAt
      });
    }
  }

  // Match by project_id when possible to enrich with task progress / status.
  const projectsById = new Map<string, Project>();
  for (const project of projectSummary?.projects ?? []) {
    projectsById.set(project.id, project);
  }

  const projectRevenue: ProjectRevenueRow[] = Array.from(groupedByProject.values()).map((entry) => {
    const project = entry.projectId ? projectsById.get(entry.projectId) : undefined;
    const profit = entry.income - entry.expense;

    // Window length in days from earliest record to today.
    const earliestMs = new Date(entry.earliestDate).getTime();
    const todayMs = new Date(today).getTime();
    const windowDays = Math.max(1, (todayMs - earliestMs) / MS_PER_DAY + 1);

    // Need ≥ 30 days of history to project a monthly average; otherwise too noisy.
    let avgMonthlyIncome: number | null = null;
    let projectedAnnualRevenue: number | null = null;
    let reason: string | undefined;
    if (windowDays >= 30 && entry.income > 0) {
      avgMonthlyIncome = (entry.income / windowDays) * 30;
      projectedAnnualRevenue = avgMonthlyIncome * 12;
    } else if (entry.income > 0) {
      reason = `仅 ${Math.round(windowDays)} 天数据，未来 1 年预测需 ≥30 天历史`;
    } else {
      reason = "暂无已审批收入";
    }

    // Task progress (only when we matched a real project record).
    let taskProgress: number | null = null;
    if (project?.tasks?.length) {
      const totalProgress = project.tasks.reduce((s, t) => s + Number(t.progress ?? 0), 0);
      taskProgress = Math.round(totalProgress / project.tasks.length);
    }

    // Potential score (0-100). Three signals, equally weighted:
    //   - revenue density (income / window days, normalized to ≥10k/day = full)
    //   - task progress (0-100)
    //   - profitability ratio (profit / max(income, 1), clamp -1..1 → 0..100)
    let potentialScore: number | null = null;
    const signals: number[] = [];
    if (entry.income > 0) {
      const dailyRevenue = entry.income / windowDays;
      signals.push(clamp((dailyRevenue / 10000) * 100, 0, 100));
    }
    if (taskProgress !== null) signals.push(taskProgress);
    if (entry.income > 0) {
      const ratio = profit / Math.max(entry.income, 1);
      signals.push(clamp(((ratio + 1) / 2) * 100, 0, 100));
    }
    if (signals.length >= 2) {
      potentialScore = Math.round(signals.reduce((s, v) => s + v, 0) / signals.length);
    }

    return {
      projectId: entry.projectId,
      projectName: project?.name ?? entry.projectName,
      status: project?.status,
      income: Math.round(entry.income),
      expense: Math.round(entry.expense),
      profit: Math.round(profit),
      recordCount: entry.recordCount,
      avgMonthlyIncome: avgMonthlyIncome === null ? null : Math.round(avgMonthlyIncome),
      projectedAnnualRevenue: projectedAnnualRevenue === null ? null : Math.round(projectedAnnualRevenue),
      potentialScore,
      taskProgress,
      reason
    };
  });

  projectRevenue.sort((a, b) => b.income - a.income);

  const projectPotential = projectRevenue
    .filter((row) => row.potentialScore !== null)
    .slice()
    .sort((a, b) => (b.potentialScore ?? 0) - (a.potentialScore ?? 0));

  const monthly = executive?.monthly ?? [];
  const expenseTop = (executive?.categoryBreakdown ?? []).slice(0, 6);

  return {
    today,
    baseCurrency: BASE_CURRENCY,
    todayMetrics: {
      income: Math.round(todayIncome),
      expense: Math.round(todayExpense),
      profit: Math.round(todayIncome - todayExpense),
      recordCount: todayRecords.length
    },
    monthMetrics: {
      income: Math.round(executive?.metrics.monthIncome ?? 0),
      expense: Math.round(executive?.metrics.monthExpense ?? 0),
      profit: Math.round(executive?.metrics.monthProfit ?? 0),
      profitMargin: executive?.metrics.profitMargin ?? 0,
      expenseRatio: executive?.metrics.expenseRatio ?? 0
    },
    cashMetrics: {
      cashBalance: Math.round(executive?.metrics.cashBalance ?? 0),
      avgMonthlyExpense: Math.round(executive?.metrics.avgMonthlyExpense ?? 0),
      runwayMonths: executive?.metrics.runwayMonths ?? null
    },
    alerts: {
      pendingApprovalAmount: Math.round(executive?.metrics.pendingApprovalAmount ?? 0),
      highRiskAmount: Math.round(executive?.metrics.highRiskAmount ?? 0),
      highRiskCount: executive?.metrics.highRiskCount ?? 0
    },
    monthly,
    expenseTop,
    projectRevenue,
    projectPotential,
    decisions: executive?.decisions ?? [],
    hasFinanceData: lookbackRecords.length > 0,
    hasProjectFinanceLink: projectRevenue.some((row) => row.projectId !== null)
  };
});
