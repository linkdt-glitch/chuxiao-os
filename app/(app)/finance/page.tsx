import Link from "next/link";
import { ArrowRight, Download, Plus, Sparkles, WalletCards } from "lucide-react";
import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinanceSummary } from "@/lib/finance/reports";

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value);
}

export default async function FinancePage() {
  const summary = await getFinanceSummary();
  const cards = [
    { label: "本月收入", value: money(summary.monthIncome), tone: "text-emerald-700" },
    { label: "本月支出", value: money(summary.monthExpense), tone: "text-red-700" },
    { label: "本月利润", value: money(summary.monthProfit), tone: summary.monthProfit >= 0 ? "text-emerald-700" : "text-red-700" },
    { label: "现金余额", value: money(summary.cashBalance), tone: "text-sky-700" }
  ];

  return (
    <>
      <PageHeader
        title="经营能量舱"
        description="原财务中心。看清收入、支出、利润、现金流和经营健康度；当前保留一句话记账、报销审批、收支流水、财务看板与 Excel 导出。"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/api/finance/export?type=expense"><Download className="h-4 w-4" />导出支出表</Link></Button>
            <Button asChild><Link href="/finance/ai-bookkeeping"><Sparkles className="h-4 w-4" />一句话记账</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <WalletCards className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold ${item.tone}`}>{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近流水</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/finance/records">查看全部<ArrowRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable records={summary.recentRecords} />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>待审批报销</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{summary.pendingReimbursements}</div>
              <Button asChild className="mt-4 w-full" variant="outline"><Link href="/finance/reimbursements">进入审批</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>快捷入口</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild><Link href="/finance/records/new"><Plus className="h-4 w-4" />手动记账</Link></Button>
              <Button asChild variant="outline"><Link href="/finance/reports"><Download className="h-4 w-4" />报表导出</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
