import { AlertTriangle, CheckCircle2, CircleDollarSign, Clock3, FileWarning, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  expenseStatusLabel,
  expenseStatusTone,
  money,
  type DepartmentBudget,
  type ExpenseReport,
  type ExpenseRiskFlag,
  type ExpenseStatus
} from "@/lib/finance/expense-types";

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return <Badge variant={expenseStatusTone(status)}>{expenseStatusLabel(status)}</Badge>;
}

export function ExpenseRiskBadges({ flags }: { flags: ExpenseRiskFlag[] }) {
  if (!flags.length) {
    return <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> 无明显异常</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((flag) => (
        <Badge key={flag.key} variant={flag.severity === "danger" ? "danger" : "warning"}>
          {flag.severity === "danger" ? <FileWarning className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {flag.message}
        </Badge>
      ))}
    </div>
  );
}

export function reportRiskFlags(report: ExpenseReport) {
  return report.items.flatMap((item) => item.risk_flags ?? []);
}

export function DepartmentBudgetProgress({
  report,
  budgets,
  monthUsed
}: {
  report: ExpenseReport;
  budgets: DepartmentBudget[];
  monthUsed: number;
}) {
  const budget = budgets.find((item) => item.department_id === report.department_id && !item.category_id);
  const amount = budget?.amount ?? 0;
  const percent = amount > 0 ? Math.min(100, Math.round(monthUsed / amount * 100)) : 0;

  return (
    <div className="min-w-[160px]">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>本月预算</span>
        <span>{amount > 0 ? `${percent}%` : "未配置"}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percent > 90 ? "bg-gradient-to-r from-orange-400 to-red-500" : "bg-gradient-to-r from-cyan-400 to-indigo-500"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{money(monthUsed)} / {amount > 0 ? money(amount) : "未设预算"}</div>
    </div>
  );
}

export function ExpenseMetricCard({
  label,
  value,
  hint,
  tone = "sky"
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "sky" | "amber" | "emerald" | "indigo";
}) {
  const Icon = tone === "emerald" ? CheckCircle2 : tone === "amber" ? Clock3 : tone === "indigo" ? WalletCards : CircleDollarSign;
  return (
    <div className="rounded-lg border border-white/80 bg-white/72 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
          {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-indigo-50 p-2 text-cyan-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
