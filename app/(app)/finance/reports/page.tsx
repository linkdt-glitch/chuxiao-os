import Link from "next/link";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCashflowTrend, getCategoryExpenseBreakdown, getMonthlyIncomeExpense } from "@/lib/finance/reports";

export default async function FinanceReportsPage() {
  const [monthly, breakdown, cashflow] = await Promise.all([
    getMonthlyIncomeExpense(),
    getCategoryExpenseBreakdown(),
    getCashflowTrend()
  ]);

  return (
    <>
      <PageHeader title="财务报表" description="基础收入支出趋势、支出分类和 xlsx 导出归档。" />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Button asChild><Link href="/api/finance/export?type=expense"><Download className="h-4 w-4" />月度支出表</Link></Button>
        <Button asChild variant="outline"><Link href="/api/finance/export?type=income"><Download className="h-4 w-4" />月度收入表</Link></Button>
        <Button asChild variant="outline"><Link href="/api/finance/export?type=all"><Download className="h-4 w-4" />全部流水表</Link></Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>近 6 月收入 / 支出</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthly.map((item) => (
              <div key={item.month}>
                <div className="mb-1 flex justify-between text-sm"><span>{item.month}</span><span>收入 {item.income.toFixed(2)} / 支出 {item.expense.toFixed(2)}</span></div>
                <div className="grid h-2 grid-cols-2 overflow-hidden rounded bg-muted">
                  <div className="bg-emerald-500" style={{ width: `${Math.min(100, item.income / Math.max(item.income + item.expense, 1) * 100)}%` }} />
                  <div className="bg-red-400" style={{ width: `${Math.min(100, item.expense / Math.max(item.income + item.expense, 1) * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>支出分类</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {breakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span className="font-medium">{item.amount.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>现金流趋势</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashflow.map((item) => (
              <div key={item.month} className="flex items-center justify-between text-sm">
                <span>{item.month}</span>
                <span className={item.net >= 0 ? "text-emerald-700" : "text-red-700"}>{item.net.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
