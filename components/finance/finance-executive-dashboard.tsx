import { AlertTriangle, Brain, ChartNoAxesCombined, Gauge, PiggyBank, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceDecisionSeverity, FinanceExecutiveDashboard as FinanceExecutiveDashboardData } from "@/lib/finance/reports";

function money(value: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function percent(value: number) {
  return `${Number.isFinite(value) ? value : 0}%`;
}

function severityVariant(severity: FinanceDecisionSeverity) {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "success") return "success";
  return "info";
}

function severityLabel(severity: FinanceDecisionSeverity) {
  if (severity === "danger") return "紧急";
  if (severity === "warning") return "关注";
  if (severity === "success") return "健康";
  return "提示";
}

function BarRow({ label, value, max, tone = "bg-sky-500" }: { label: string; value: number; max: number; tone?: string }) {
  const width = Math.max(4, Math.min(100, max > 0 ? value / max * 100 : 0));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-medium">{money(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function CashflowLine({ data }: { data: FinanceExecutiveDashboardData["cashflow"] }) {
  const width = 520;
  const height = 160;
  const values = data.map((item) => item.balance);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = Math.max(1, max - min);
  const points = data.map((item, index) => {
    const x = data.length <= 1 ? width / 2 : index / (data.length - 1) * width;
    const y = height - ((item.balance - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full overflow-visible" role="img" aria-label="现金流趋势">
        <line x1="0" y1={height - ((0 - min) / range) * height} x2={width} y2={height - ((0 - min) / range) * height} className="stroke-slate-200" strokeWidth="2" />
        <polyline points={points} fill="none" className="stroke-sky-600" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((item, index) => {
          const x = data.length <= 1 ? width / 2 : index / (data.length - 1) * width;
          const y = height - ((item.balance - min) / range) * height;
          return <circle key={item.month} cx={x} cy={y} r="5" className={item.balance >= 0 ? "fill-emerald-500" : "fill-red-500"} />;
        })}
      </svg>
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground sm:grid-cols-6">
        {data.map((item) => (
          <div key={item.month} className="truncate text-center">{item.label}</div>
        ))}
      </div>
    </div>
  );
}

function MonthlyBars({ data }: { data: FinanceExecutiveDashboardData["monthly"] }) {
  const max = Math.max(1, ...data.map((item) => Math.max(item.income, item.expense)));
  return (
    <div className="space-y-4">
      <div className="flex h-44 items-end gap-3">
        {data.map((item) => (
          <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center gap-1">
              <div className="w-3 rounded-t bg-emerald-500 sm:w-4" style={{ height: `${Math.max(4, item.income / max * 100)}%` }} />
              <div className="w-3 rounded-t bg-red-400 sm:w-4" style={{ height: `${Math.max(4, item.expense / max * 100)}%` }} />
            </div>
            <div className="truncate text-xs text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />收入</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />支出</span>
      </div>
    </div>
  );
}

export function FinanceExecutiveDashboard({ data }: { data: FinanceExecutiveDashboardData }) {
  const maxCategoryAmount = Math.max(1, ...data.categoryBreakdown.map((item) => item.amount));
  const maxAccountBalance = Math.max(1, ...data.accountBalances.map((item) => item.balance));
  const runwayText = data.metrics.runwayMonths === null ? "充足" : `${data.metrics.runwayMonths} 月`;

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-sky-700"><Brain className="h-4 w-4" /> 高权限经营洞察</div>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">财务可视化与决策判断</h2>
          <p className="mt-1 text-sm text-muted-foreground">仅全量财务权限可见，用于 Owner / Admin / 财务负责人判断现金、利润、审批和支出结构。</p>
        </div>
        <Badge variant="info">基准币种 {data.baseCurrency}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">利润率</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={data.metrics.profitMargin >= 0 ? "text-2xl font-semibold text-emerald-700" : "text-2xl font-semibold text-red-700"}>{percent(data.metrics.profitMargin)}</div>
            <p className="mt-1 text-xs text-muted-foreground">本月利润 {money(data.metrics.monthProfit, data.baseCurrency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">现金 Runway</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-sky-700">{runwayText}</div>
            <p className="mt-1 text-xs text-muted-foreground">现金余额 {money(data.metrics.cashBalance, data.baseCurrency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待审批敞口</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-700">{money(data.metrics.pendingApprovalAmount, data.baseCurrency)}</div>
            <p className="mt-1 text-xs text-muted-foreground">高风险 {data.metrics.highRiskCount} 条</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI 记账占比</CardTitle>
            <WalletCards className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-indigo-700">{percent(data.metrics.aiRecordRatio)}</div>
            <p className="mt-1 text-xs text-muted-foreground">未分类支出 {percent(data.metrics.unclassifiedExpenseRatio)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ChartNoAxesCombined className="h-4 w-4" /> 近 6 月收入 / 支出</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBars data={data.monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>经营判断</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.decisions.map((decision) => (
              <div key={`${decision.title}-${decision.metric}`} className="rounded-md border bg-white/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{decision.title}</div>
                  <Badge variant={severityVariant(decision.severity)}>{severityLabel(decision.severity)}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{decision.judgment}</p>
                <p className="mt-2 text-sm">{decision.action}</p>
                <div className="mt-2 text-xs font-medium text-sky-700">{decision.metric}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>现金流趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <CashflowLine data={data.cashflow} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>支出结构</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categoryBreakdown.length ? data.categoryBreakdown.map((item) => (
              <BarRow key={item.name} label={`${item.name} · ${item.share}%`} value={item.amount} max={maxCategoryAmount} tone="bg-red-400" />
            )) : <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">暂无已审批支出。</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>账户分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.accountBalances.length ? data.accountBalances.map((item) => (
              <BarRow key={item.name} label={`${item.name} · ${item.share}%`} value={item.balance} max={maxAccountBalance} tone="bg-sky-500" />
            )) : <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">暂无账户余额。</div>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
