import Link from "next/link";
import { ChartNoAxesCombined, Download, Landmark, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCashflowTrend, getCategoryExpenseBreakdown, getMonthlyIncomeExpense } from "@/lib/finance/reports";

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2
  }).format(value);
}

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const height = Math.max(4, Math.min(100, max > 0 ? value / max * 100 : 0));
  return <div className={`w-3 rounded-t sm:w-4 ${tone}`} style={{ height: `${height}%` }} />;
}

export default async function FinanceReportsPage() {
  const [monthly, breakdown, cashflow] = await Promise.all([
    getMonthlyIncomeExpense(),
    getCategoryExpenseBreakdown(),
    getCashflowTrend()
  ]);
  const totalIncome = monthly.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = monthly.reduce((sum, item) => sum + item.expense, 0);
  const maxMonthly = Math.max(1, ...monthly.map((item) => Math.max(item.income, item.expense)));
  const maxBreakdown = Math.max(1, ...breakdown.map((item) => item.amount));

  return (
    <>
      <PageHeader
        title="财务报表"
        description="查看收入支出趋势、支出分类、现金流变化，并导出 Excel 做月度归档。"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild><Link href="/api/finance/export?type=all"><Download className="h-4 w-4" />全部流水表</Link></Button>
            <Button asChild variant="outline"><Link href="/finance/records">返回流水</Link></Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm text-muted-foreground">近 6 月收入</div>
              <div className="mt-1 text-xl font-semibold text-emerald-700">{money(totalIncome)}</div>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm text-muted-foreground">近 6 月支出</div>
              <div className="mt-1 text-xl font-semibold text-red-700">{money(totalExpense)}</div>
            </div>
            <ChartNoAxesCombined className="h-5 w-5 text-red-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm text-muted-foreground">净现金流</div>
              <div className={totalIncome - totalExpense >= 0 ? "mt-1 text-xl font-semibold text-emerald-700" : "mt-1 text-xl font-semibold text-red-700"}>
                {money(totalIncome - totalExpense)}
              </div>
            </div>
            <Landmark className="h-5 w-5 text-sky-700" />
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Button asChild><Link href="/api/finance/export?type=expense"><Download className="h-4 w-4" />月度支出表</Link></Button>
        <Button asChild variant="outline"><Link href="/api/finance/export?type=income"><Download className="h-4 w-4" />月度收入表</Link></Button>
        <Button asChild variant="outline"><Link href="/api/finance/export?type=reimbursement"><Download className="h-4 w-4" />报销明细表</Link></Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>近 6 月收入 / 支出</CardTitle>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />收入</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />支出</span>
            </div>
          </CardHeader>
          <CardContent>
            {monthly.some((item) => item.income || item.expense) ? (
              <div className="space-y-4">
                <div className="flex h-48 items-end gap-3">
                  {monthly.map((item) => (
                    <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex h-40 w-full items-end justify-center gap-1 rounded-xl bg-white/45 px-1 pb-1">
                        <Bar value={item.income} max={maxMonthly} tone="bg-emerald-500" />
                        <Bar value={item.expense} max={maxMonthly} tone="bg-red-400" />
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{item.month.slice(5)}月</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {monthly.map((item) => (
                    <div key={item.month} className="rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm">
                      <div className="font-medium">{item.month}</div>
                      <div className="mt-1 flex justify-between text-muted-foreground"><span>收入</span><span className="text-emerald-700">{money(item.income)}</span></div>
                      <div className="mt-1 flex justify-between text-muted-foreground"><span>支出</span><span className="text-red-700">{money(item.expense)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="暂无可分析的收入支出" description="已批准或已入账的流水会进入报表分析。" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>现金流趋势</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashflow.map((item) => (
              <div key={item.month} className="rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.month}</span>
                  <Badge variant={item.net >= 0 ? "success" : "danger"}>{item.net >= 0 ? "净流入" : "净流出"}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-muted-foreground">
                  <span>当月净额</span>
                  <span className={item.net >= 0 ? "font-medium text-emerald-700" : "font-medium text-red-700"}>{money(item.net)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-muted-foreground">
                  <span>累计现金流</span>
                  <span className={item.balance >= 0 ? "font-medium text-emerald-700" : "font-medium text-red-700"}>{money(item.balance)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>支出分类</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {breakdown.length ? breakdown.map((item) => (
              <div key={item.name} className="rounded-xl border border-slate-200/70 bg-white/60 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{item.name}</span>
                  <span className="shrink-0 text-red-700">{money(item.amount)}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.max(4, Math.min(100, item.amount / maxBreakdown * 100))}%` }} />
                </div>
              </div>
            )) : (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="暂无支出分类数据" description="支出被批准或入账后，会按类目展示结构。" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
