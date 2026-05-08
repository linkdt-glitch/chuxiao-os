import Link from "next/link";
import { ArrowRight, Download, FileSpreadsheet, NotebookPen, Plus, ReceiptText, Sparkles, WalletCards } from "lucide-react";
import { ApprovalSpotlight } from "@/components/finance/approval-spotlight";
import { FinanceExecutiveDashboard } from "@/components/finance/finance-executive-dashboard";
import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { MySubmissionsPanel } from "@/components/finance/my-submissions-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          description="申请报销（垫付费用找公司报销）/ 记一笔（自己的日常收支）/ 在下方查看报销审批反馈。"
        />

        {/* 两类入口：报销 + 记账，每一类都有「一句话 AI」+「手动」两种方式 */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 报销 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-orange-400" /> 申请报销
              </CardTitle>
              <CardDescription>
                把已经替公司垫付的费用提交报销，等待负责人审批；提交后下方会显示状态。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start">
                <Link href="/finance/ai-bookkeeping?intent=reimbursement">
                  <Sparkles className="h-4 w-4" />
                  <span>一句话 AI 报销</span>
                  <span className="ml-auto text-xs opacity-70">描述一下就行</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/finance/reimbursements/new">
                  <Plus className="h-4 w-4" />
                  <span>手动新建报销</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* 记账 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-orange-400" /> 记一笔
              </CardTitle>
              <CardDescription>
                记录你的日常收入、支出、转账。无需审批，自动归到你的流水。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start">
                <Link href="/finance/ai-bookkeeping">
                  <Sparkles className="h-4 w-4" />
                  <span>一句话 AI 记账</span>
                  <span className="ml-auto text-xs opacity-70">说一句就生成</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/finance/records/new">
                  <Plus className="h-4 w-4" />
                  <span>手动记账</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 报销反馈 */}
        <div className="mt-6">
          <MySubmissionsPanel records={reimbursementRecords} expenseReports={myOwnReports} />
        </div>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // 创始人 / 管理员视图：完整仪表盘
  // ────────────────────────────────────────────────────────────────────────
  const [summary, executiveDashboard, pendingApprovalRecords] = await Promise.all([
    getFinanceSummary(),
    getFinanceExecutiveDashboard(),
    // 顶部「财务审批聚光灯」用：拉 5 条优先级最高的待审记录
    getFinanceRecords({
      status: "pending_approval",
      limit: 5,
      include_attachments: true
    })
  ]);
  const pendingApprovalAmount = pendingApprovalRecords.reduce(
    (sum, record) => sum + Number(record.amount),
    0
  );
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

      {/* ⭐ 财务审批聚光灯 — owner/admin 进财务中心第一眼看到的最重要任务 */}
      <ApprovalSpotlight
        records={pendingApprovalRecords}
        totalCount={summary.pendingReimbursements}
        totalAmount={pendingApprovalAmount}
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

      {/* 最近流水（待审批已上移到顶部 ApprovalSpotlight） */}
      <Card className="mt-6">
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
    </>
  );
}
