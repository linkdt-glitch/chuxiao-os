import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getExpenseReports } from "@/lib/finance/expenses";
import { getFinanceRecords } from "@/lib/finance/records";
import type { FinanceRecord } from "@/lib/finance/types";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

export async function getFinanceSummary() {
  const { start, end } = currentMonthRange();
  const [records, accounts, expenseReports] = await Promise.all([
    getFinanceRecords({ date_from: start, date_to: end }),
    getFinanceAccounts(),
    getExpenseReports({ date_from: start, date_to: end, limit: 300 })
  ]);

  const bookedRecords = records.filter((record) => ["approved", "paid"].includes(record.status));
  const income = bookedRecords.filter((record) => record.record_type === "income").reduce((sum, record) => sum + Number(record.amount), 0);
  const expense = bookedRecords.filter((record) => ["expense", "reimbursement"].includes(record.record_type)).reduce((sum, record) => sum + Number(record.amount), 0);
  const pendingReimbursements = records.filter((record) => record.status === "pending_approval" && (record.record_type === "reimbursement" || record.reimbursement_required)).length
    + expenseReports.filter((report) => ["submitted", "pending_manager", "pending_finance"].includes(report.status)).length;
  const cashBalance = accounts.filter((account) => account.currency === "CNY").reduce((sum, account) => sum + Number(account.current_balance), 0);

  return {
    monthIncome: income,
    monthExpense: expense,
    monthProfit: income - expense,
    cashBalance,
    pendingReimbursements,
    recentRecords: records.slice(0, 8)
  };
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isBooked(record: FinanceRecord) {
  return ["approved", "paid"].includes(record.status);
}

function isExpense(record: FinanceRecord) {
  return ["expense", "reimbursement"].includes(record.record_type);
}

function isIncome(record: FinanceRecord) {
  return record.record_type === "income" || record.record_type === "refund";
}

function amount(record: FinanceRecord) {
  return Number(record.amount) || 0;
}

function baseCurrencyAmount(record: FinanceRecord, baseCurrency: string) {
  return record.currency === baseCurrency ? amount(record) : 0;
}

function pct(value: number) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function formatMonthLabel(month: string) {
  const [, rawMonth] = month.split("-");
  return `${Number(rawMonth)}月`;
}

export type FinanceDecisionSeverity = "success" | "info" | "warning" | "danger";

export type FinanceDecision = {
  severity: FinanceDecisionSeverity;
  title: string;
  judgment: string;
  action: string;
  metric: string;
};

export type FinanceExecutiveDashboard = {
  baseCurrency: string;
  metrics: {
    monthIncome: number;
    monthExpense: number;
    monthProfit: number;
    profitMargin: number;
    expenseRatio: number;
    cashBalance: number;
    avgMonthlyExpense: number;
    runwayMonths: number | null;
    pendingApprovalAmount: number;
    highRiskAmount: number;
    highRiskCount: number;
    unclassifiedExpenseAmount: number;
    unclassifiedExpenseRatio: number;
    aiRecordRatio: number;
    nonBaseCurrencyRecordCount: number;
  };
  monthly: Array<{ month: string; label: string; income: number; expense: number; profit: number }>;
  cashflow: Array<{ month: string; label: string; net: number; balance: number }>;
  categoryBreakdown: Array<{ name: string; amount: number; share: number }>;
  accountBalances: Array<{ name: string; currency: string; balance: number; share: number }>;
  decisions: FinanceDecision[];
};

export async function getFinanceExecutiveDashboard(months = 6): Promise<FinanceExecutiveDashboard> {
  const baseCurrency = "CNY";
  const now = new Date();
  const start = monthKey(addMonths(now, -(months - 1)));
  const [records, accounts] = await Promise.all([
    getFinanceRecords({ date_from: `${start}-01` }),
    getFinanceAccounts()
  ]);

  const currentMonth = monthKey(now);
  const buckets = new Map<string, { month: string; label: string; income: number; expense: number; profit: number }>();
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = addMonths(now, -i);
    const month = monthKey(date);
    buckets.set(month, { month, label: formatMonthLabel(month), income: 0, expense: 0, profit: 0 });
  }

  const bookedRecords = records.filter(isBooked);
  const currentMonthRecords = records.filter((record) => record.occurred_at.slice(0, 7) === currentMonth);
  const bookedCurrentMonthRecords = currentMonthRecords.filter(isBooked);
  const categoryMap = new Map<string, number>();
  let pendingApprovalAmount = 0;
  let highRiskAmount = 0;
  let highRiskCount = 0;
  let unclassifiedExpenseAmount = 0;
  let aiRecordCount = 0;
  let nonBaseCurrencyRecordCount = 0;

  records.forEach((record) => {
    if (record.source === "ai_parse") aiRecordCount += 1;
    if (record.currency !== baseCurrency) nonBaseCurrencyRecordCount += 1;
    if (record.status === "pending_approval") pendingApprovalAmount += baseCurrencyAmount(record, baseCurrency);
    if (record.risk_level === "high" || record.risk_level === "critical") {
      highRiskCount += 1;
      highRiskAmount += baseCurrencyAmount(record, baseCurrency);
    }
  });

  bookedRecords.forEach((record) => {
    const bucket = buckets.get(record.occurred_at.slice(0, 7));
    const value = baseCurrencyAmount(record, baseCurrency);
    if (bucket) {
      if (isIncome(record)) bucket.income += value;
      if (isExpense(record)) bucket.expense += value;
      bucket.profit = bucket.income - bucket.expense;
    }
    if (isExpense(record)) {
      const categoryName = record.category?.name ?? "未分类";
      categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + value);
      if (!record.category_id) unclassifiedExpenseAmount += value;
    }
  });

  const monthly = Array.from(buckets.values());
  const monthIncome = bookedCurrentMonthRecords.filter(isIncome).reduce((sum, record) => sum + baseCurrencyAmount(record, baseCurrency), 0);
  const monthExpense = bookedCurrentMonthRecords.filter(isExpense).reduce((sum, record) => sum + baseCurrencyAmount(record, baseCurrency), 0);
  const monthProfit = monthIncome - monthExpense;
  const profitMargin = monthIncome > 0 ? pct(monthProfit / monthIncome * 100) : 0;
  const expenseRatio = monthIncome > 0 ? pct(monthExpense / monthIncome * 100) : monthExpense > 0 ? 100 : 0;
  const cashBalance = accounts.filter((account) => account.currency === baseCurrency).reduce((sum, account) => sum + Number(account.current_balance), 0);
  const recentExpenseMonths = monthly.slice(-3);
  const avgMonthlyExpense = recentExpenseMonths.length ? recentExpenseMonths.reduce((sum, item) => sum + item.expense, 0) / recentExpenseMonths.length : 0;
  const runwayMonths = avgMonthlyExpense > 0 ? pct(cashBalance / avgMonthlyExpense) : null;
  const totalExpense = Array.from(categoryMap.values()).reduce((sum, value) => sum + value, 0);
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, amount: value, share: totalExpense > 0 ? pct(value / totalExpense * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
  const totalAccountBalance = accounts.filter((account) => account.currency === baseCurrency).reduce((sum, account) => sum + Number(account.current_balance), 0);
  const accountBalances = accounts
    .filter((account) => account.currency === baseCurrency)
    .map((account) => ({
      name: account.name,
      currency: account.currency,
      balance: Number(account.current_balance),
      share: totalAccountBalance > 0 ? pct(Number(account.current_balance) / totalAccountBalance * 100) : 0
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 6);

  let cashflowBalance = 0;
  const cashflow = monthly.map((item) => {
    const net = item.income - item.expense;
    cashflowBalance += net;
    return { month: item.month, label: item.label, net, balance: cashflowBalance };
  });

  const decisions: FinanceDecision[] = [];
  if (monthIncome === 0 && monthExpense > 0) {
    decisions.push({
      severity: "warning",
      title: "收入确认不足",
      judgment: "本月已有支出但未形成已审批收入，利润判断会偏保守。",
      action: "优先确认本月销售收入、订阅收入和退款调整，避免经营看板失真。",
      metric: `本月收入 ${monthIncome.toFixed(0)} ${baseCurrency}`
    });
  }
  if (monthProfit < 0) {
    decisions.push({
      severity: "danger",
      title: "本月经营亏损",
      judgment: `本月利润为负，支出已高于收入 ${Math.abs(monthProfit).toFixed(0)} ${baseCurrency}。`,
      action: "暂停非必要投放和采购，复核商品成本、广告与平台费用的回报。",
      metric: `利润 ${monthProfit.toFixed(0)} ${baseCurrency}`
    });
  } else if (profitMargin >= 20) {
    decisions.push({
      severity: "success",
      title: "利润状态健康",
      judgment: "本月收入覆盖支出后仍有较好余量。",
      action: "可以继续跟踪高 ROI 渠道，并把可复用支出沉淀到预算模板。",
      metric: `利润率 ${profitMargin}%`
    });
  }
  if (runwayMonths !== null && runwayMonths < 3) {
    decisions.push({
      severity: "danger",
      title: "现金安全垫偏低",
      judgment: `按近 3 月平均支出估算，现金可支撑约 ${runwayMonths} 个月。`,
      action: "建议冻结低优先级支出，推进回款，并建立 3 个月现金安全线。",
      metric: `Runway ${runwayMonths} 月`
    });
  } else if (runwayMonths !== null && runwayMonths < 6) {
    decisions.push({
      severity: "warning",
      title: "现金安全垫需要关注",
      judgment: `现金可支撑约 ${runwayMonths} 个月，仍需控制大额支出节奏。`,
      action: "对库存、广告和 SaaS 年付做审批前置，避免现金集中流出。",
      metric: `Runway ${runwayMonths} 月`
    });
  }
  const topCategory = categoryBreakdown[0];
  if (topCategory && topCategory.share >= 45) {
    decisions.push({
      severity: "warning",
      title: "支出集中度偏高",
      judgment: `${topCategory.name} 占近 ${months} 月支出的 ${topCategory.share}%。`,
      action: "拆解该类目的供应商、渠道或项目，判断是否存在异常集中或预算失控。",
      metric: `${topCategory.name} ${topCategory.share}%`
    });
  }
  if (pendingApprovalAmount > Math.max(monthExpense * 0.25, 3000)) {
    decisions.push({
      severity: "warning",
      title: "待审批金额偏高",
      judgment: "待审批财务记录会影响现金流和费用确认及时性。",
      action: "建议负责人当天处理报销和大额支出，避免月底集中入账。",
      metric: `待审批 ${pendingApprovalAmount.toFixed(0)} ${baseCurrency}`
    });
  }
  const unclassifiedExpenseRatio = totalExpense > 0 ? pct(unclassifiedExpenseAmount / totalExpense * 100) : 0;
  if (unclassifiedExpenseRatio >= 15) {
    decisions.push({
      severity: "info",
      title: "类目数据需要清理",
      judgment: `未分类支出占比 ${unclassifiedExpenseRatio}%，会影响成本结构判断。`,
      action: "把未分类记录归入核心类目，优先处理金额较大的流水。",
      metric: `未分类 ${unclassifiedExpenseRatio}%`
    });
  }
  if (highRiskCount > 0) {
    decisions.push({
      severity: "danger",
      title: "存在高风险财务记录",
      judgment: `当前有 ${highRiskCount} 条 high/critical 风险记录。`,
      action: "逐条检查审批、附件、供应商和付款账户，必要时要求二次确认。",
      metric: `风险金额 ${highRiskAmount.toFixed(0)} ${baseCurrency}`
    });
  }
  if (nonBaseCurrencyRecordCount > 0) {
    decisions.push({
      severity: "info",
      title: "多币种需要折算口径",
      judgment: `有 ${nonBaseCurrencyRecordCount} 条非 ${baseCurrency} 流水暂未折算进核心判断。`,
      action: "后续接入汇率表后，再做 USD / CNY 的统一利润与现金流看板。",
      metric: `${nonBaseCurrencyRecordCount} 条外币记录`
    });
  }
  if (!decisions.length) {
    decisions.push({
      severity: "success",
      title: "经营状态可控",
      judgment: "现金、利润、审批和支出结构暂无明显异常。",
      action: "保持每周复盘收入、广告、商品成本和现金余额。",
      metric: "暂无红色预警"
    });
  }

  return {
    baseCurrency,
    metrics: {
      monthIncome,
      monthExpense,
      monthProfit,
      profitMargin,
      expenseRatio,
      cashBalance,
      avgMonthlyExpense,
      runwayMonths,
      pendingApprovalAmount,
      highRiskAmount,
      highRiskCount,
      unclassifiedExpenseAmount,
      unclassifiedExpenseRatio,
      aiRecordRatio: records.length ? pct(aiRecordCount / records.length * 100) : 0,
      nonBaseCurrencyRecordCount
    },
    monthly,
    cashflow,
    categoryBreakdown,
    accountBalances,
    decisions: decisions.slice(0, 6)
  };
}

export async function getMonthlyIncomeExpense(months = 6) {
  const records = await getFinanceRecords();
  const buckets = new Map<string, { month: string; income: number; expense: number }>();
  const now = new Date();

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(month, { month, income: 0, expense: 0 });
  }

  records.forEach((record) => {
    const month = record.occurred_at.slice(0, 7);
    const bucket = buckets.get(month);
    if (!bucket || !["approved", "paid"].includes(record.status)) return;
    if (record.record_type === "income") bucket.income += Number(record.amount);
    if (["expense", "reimbursement"].includes(record.record_type)) bucket.expense += Number(record.amount);
  });

  return Array.from(buckets.values());
}

export async function getCategoryExpenseBreakdown() {
  const records = await getFinanceRecords({ record_type: "expense" });
  const map = new Map<string, number>();
  records.filter((record) => ["approved", "paid"].includes(record.status)).forEach((record) => {
    const name = record.category?.name ?? "未分类";
    map.set(name, (map.get(name) ?? 0) + Number(record.amount));
  });
  return Array.from(map.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
}

export async function getCashflowTrend() {
  const monthly = await getMonthlyIncomeExpense(6);
  let balance = 0;
  return monthly.map((item) => {
    balance += item.income - item.expense;
    return { month: item.month, net: item.income - item.expense, balance };
  });
}
