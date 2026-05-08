import Link from "next/link";
import { ArrowRight, Download, FileSpreadsheet, Plus, ReceiptText, Sparkles, WalletCards } from "lucide-react";
import { FinanceExecutiveDashboard } from "@/components/finance/finance-executive-dashboard";
import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { MySubmissionsPanel } from "@/components/finance/my-submissions-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/auth";
import { getExpenseReports } from "@/lib/finance/expenses";
import { canViewAllFinance } from "@/lib/finance/permissions";
import { getFinanceRecords } from "@/lib/finance/records";
import { getFinanceExecutiveDashboard, getFinanceSummary } from "@/lib/finance/reports";

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value);
}

export default async function FinancePage() {
  const [showFullDashboard, member] = await Promise.all([
    canViewAllFinance(),
    getCurrentMember()
  ]);

  // ────────────────────────────────────────────────────────────────────────
  // 普通成员视图：不展示公司全局数据 / 审批系统，只看自己提交过什么、状态如何、为什么被驳回
  // ────────────────────────────────────────────────────────────────────────
  if (!showFullDashboard) {
    const [myRecords, myReports] = await Promise.all([
      // getFinanceRecords 内置 finance scope，member 自动只拿到 submitted_by 或 member_id 是自己的记录
      getFinanceRecords({ limit: 50 }),
      getExpenseReports({ limit: 50 })
    ]);
    // expense reports 没有自动 scope，需要在这里按 member.id 过滤
    const myOwnReports = myReports.filter((report) => report.submitter_member_id === member.id);
    // 只保留报销 / 报销相关的记账（过滤掉日常支出，避免噪音）
    const reimbursementRecords = myRecords.filter(
      (record) => record.record_type === "reimbursement" || record.reimbursement_required
    );

    return (
      <>
        <PageHeader
          title="我的报销与记账"
          description="查看你自己提交的报销 / 支出 / 记账：哪些已通过、哪些还在审批、哪些被驳回（含原因）。"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button asChild>
                <Link href="/finance/ai-bookkeeping">
                  <Sparkles className="h-4 w-4" />一句话记账
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/finance/records/new">
                  <Plus className="h-4 w-4" />手动记账
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/finance/reimbursements/new">
                  <ReceiptText className="h-4 w-4" />新建报销
                </Link>
              </Button>
            </div>
          }
        />

        <MySubmissionsPanel records={reimbursementRecords} expenseReports={myOwnReports} />
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // 创始人 / 管理员视图：完整仪表盘
  // ────────────────────────────────────────────────────────────────────────
  const [summary, executiveDashboard] = await Promise.all([
    getFinanceSummary(),
    getFinanceExecutiveDashboard()
  ]);
  const cards = [
    { label: "本月收入", value: money(summary.monthIncome), tone: "text-emerald-700", hint: "已批准 / 已入账收入" },
    { label: "本月支出", value: money(summary.monthExpense), tone: "text-red-700", hint: "已批准 / 已入账支出" },
    { label: "本月利润", value: money(summary.monthProfit), tone: summary.monthProfit >= 0 ? "text-emerald-700" : "text-red-700", hint: "收入 - 支出" },
    { label: "现金余额", value: money(summary.cashBalance), tone: "text-sky-700", hint: "CNY 账户余额合计" }
  ];

  return (
    <>
      <PageHeader
        title="财务能量中心"
        description="看清收入、支出、利润、现金流和经营健康度；包含一句话记账、报销审批、收支流水、财务看板与 Excel 导出。"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button asChild>
              <Link href="/finance/ai-bookkeeping">
                <Sparkles className="h-4 w-4" />一句话记账
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/records/new">
                <Plus className="h-4 w-4" />手动记账
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/reimbursements/new">
                <ReceiptText className="h-4 w-4" />新建报销
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/reports">
                <FileSpreadsheet className="h-4 w-4" />报表
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/api/finance/export?type=expense">
                <Download className="h-4 w-4" />导出支出
              </Link>
            </Button>
          </div>
        }
      />

      {/* 4 个核心指标 */}
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

      {/* 经营洞察 */}
      <div className="mt-6">
        <FinanceExecutiveDashboard data={executiveDashboard} />
      </div>

      {/* 最近流水 + 待审批 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近流水</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/finance/records">
                查看全部<ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable
              records={summary.recentRecords}
              emptyTitle="暂无本月流水"
              emptyDescription="先记录一条收入、支出或报销，财务能量中心就会开始形成判断。"
            />
          </CardContent>
        </Card>
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4" /> 待审批报销
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{summary.pendingReimbursements}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                需要负责人判断的报销和支出会在这里汇总。
              </p>
              <Button asChild className="mt-4 w-full" variant="outline">
                <Link href="/finance/reimbursements">进入审批</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
