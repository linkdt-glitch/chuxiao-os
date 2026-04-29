import Link from "next/link";
import { ArrowRight, Bot, ClipboardCheck, Download, FileSpreadsheet, Plus, ReceiptText, Sparkles, WalletCards } from "lucide-react";
import { FinanceExecutiveDashboard } from "@/components/finance/finance-executive-dashboard";
import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canViewAllFinance } from "@/lib/finance/permissions";
import { getFinanceExecutiveDashboard, getFinanceSummary } from "@/lib/finance/reports";

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value);
}

export default async function FinancePage() {
  const [summary, showExecutiveDashboard] = await Promise.all([
    getFinanceSummary(),
    canViewAllFinance()
  ]);
  const executiveDashboard = showExecutiveDashboard ? await getFinanceExecutiveDashboard() : null;
  const cards = [
    { label: "本月收入", value: money(summary.monthIncome), tone: "text-emerald-700", hint: "已批准 / 已入账收入" },
    { label: "本月支出", value: money(summary.monthExpense), tone: "text-red-700", hint: "已批准 / 已入账支出" },
    { label: "本月利润", value: money(summary.monthProfit), tone: summary.monthProfit >= 0 ? "text-emerald-700" : "text-red-700", hint: "收入 - 支出" },
    { label: "现金余额", value: money(summary.cashBalance), tone: "text-sky-700", hint: "CNY 账户余额合计" }
  ];
  const quickActions = [
    {
      title: "一句话 / 拍照记账",
      description: "用 AI 识别一句话、语音或票据，确认后生成财务记录。",
      href: "/finance/ai-bookkeeping",
      icon: Sparkles,
      primary: true
    },
    {
      title: "手动记账",
      description: "录入收入、支出、报销，必要时提交审批。",
      href: "/finance/records/new",
      icon: Plus
    },
    {
      title: "报销与审批",
      description: "处理待审批报销、付款和团队费用。",
      href: "/finance/reimbursements",
      icon: ClipboardCheck
    },
    {
      title: "导出报表",
      description: "导出收入、支出和全部流水 Excel。",
      href: "/finance/reports",
      icon: FileSpreadsheet
    }
  ];

  return (
    <>
      <PageHeader
        title="经营能量舱"
        description="原财务中心。看清收入、支出、利润、现金流和经营健康度；当前保留一句话记账、报销审批、收支流水、财务看板与 Excel 导出。"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline"><Link href="/api/finance/export?type=expense"><Download className="h-4 w-4" />导出支出表</Link></Button>
            <Button asChild><Link href="/finance/ai-bookkeeping"><Sparkles className="h-4 w-4" />一句话记账</Link></Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <WalletCards className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold ${item.tone}`}>{item.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-white/80 bg-white/72 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={item.primary ? "rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 p-2 text-white" : "rounded-2xl bg-sky-50 p-2 text-cyan-700"}>
                  <Icon className="h-5 w-5" />
                </div>
                {item.primary ? <Badge variant="info">推荐</Badge> : <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />}
              </div>
              <div className="mt-4 font-semibold text-slate-950">{item.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          );
        })}
      </div>

      {executiveDashboard ? <FinanceExecutiveDashboard data={executiveDashboard} /> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近流水</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/finance/records">查看全部<ArrowRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable
              records={summary.recentRecords}
              emptyTitle="暂无本月流水"
              emptyDescription="先记录一条收入、支出或报销，经营能量舱就会开始形成判断。"
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className={summary.pendingReimbursements ? "border-amber-200 bg-gradient-to-br from-amber-50/80 via-white/76 to-sky-50/50" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ReceiptText className="h-4 w-4" /> 待审批报销</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{summary.pendingReimbursements}</div>
              <p className="mt-2 text-sm text-muted-foreground">需要负责人判断的报销和支出会在这里汇总。</p>
              <Button asChild className="mt-4 w-full" variant="outline"><Link href="/finance/reimbursements">进入审批</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>快捷入口</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild><Link href="/finance/records/new"><Plus className="h-4 w-4" />手动记账</Link></Button>
              <Button asChild variant="outline"><Link href="/finance/ai-bookkeeping"><Bot className="h-4 w-4" />AI 记账</Link></Button>
              <Button asChild variant="outline"><Link href="/finance/reports"><Download className="h-4 w-4" />报表导出</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
