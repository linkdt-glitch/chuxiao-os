import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceRecords } from "@/lib/finance/records";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

export async function getFinanceSummary() {
  const { start, end } = currentMonthRange();
  const [records, accounts] = await Promise.all([
    getFinanceRecords({ date_from: start, date_to: end }),
    getFinanceAccounts()
  ]);

  const income = records.filter((record) => record.record_type === "income" && record.status !== "rejected").reduce((sum, record) => sum + Number(record.amount), 0);
  const expense = records.filter((record) => ["expense", "reimbursement"].includes(record.record_type) && record.status !== "rejected").reduce((sum, record) => sum + Number(record.amount), 0);
  const pendingReimbursements = records.filter((record) => record.status === "pending_approval" && (record.record_type === "reimbursement" || record.reimbursement_required)).length;
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
    if (!bucket || record.status === "rejected") return;
    if (record.record_type === "income") bucket.income += Number(record.amount);
    if (["expense", "reimbursement"].includes(record.record_type)) bucket.expense += Number(record.amount);
  });

  return Array.from(buckets.values());
}

export async function getCategoryExpenseBreakdown() {
  const records = await getFinanceRecords({ record_type: "expense" });
  const map = new Map<string, number>();
  records.forEach((record) => {
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
