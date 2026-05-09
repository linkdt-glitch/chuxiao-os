import Link from "next/link";
import { ArrowRight, Download, FileSpreadsheet, ListChecks, NotebookPen, Plus, ReceiptText, Sparkles, Trash2, WalletCards } from "lucide-react";
import { cleanupOwnFinanceSubmissionsAction } from "./actions";
import { ApprovalSpotlight } from "@/components/finance/approval-spotlight";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { FinanceExecutiveDashboard } from "@/components/finance/finance-executive-dashboard";
import { MySubmissionsPanel } from "@/components/finance/my-submissions-panel";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { getExpenseReports } from "@/lib/finance/expenses";
import { canViewAllFinance } from "@/lib/finance/permissions";
import { getFinanceRecords } from "@/lib/finance/records";
import { getFinanceExecutiveDashboard, getFinanceSummary } from "@/lib/finance/reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value);
}

/**
 * 创始人「我提交了多少」的计数 —— 用来在 /finance 显示清理按钮里的预览数字。
 * 只统计「我作为提交人」的记账 + 报销，不动其他人的数据。
 */
async function getOwnSubmissionCounts(memberId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { records: 0, reports: 0 };
  const organization = await getCurrentOrganization();

  const [recordsResult, reportsResult] = await Promise.all([
    supabase
      .from("finance_records")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .or(`submitted_by.eq.${memberId},member_id.eq.${memberId}`),
    supabase
      .from("finance_expense_reports")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("submitter_member_id", memberId)
  ]);
  return {
    records: recordsResult.count ?? 0,
    reports: reportsResult.count ?? 0
  };
}

export default async function FinancePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
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
    // 顶部「财务审批入口」只用 count + total，不展开列表 —— 详情在工作台
    getFinanceRecords({
      status: "pending_approval"
    })
  ]);
  const pendingApprovalAmount = pendingApprovalRecords.reduce(
    (sum, record) => sum + Number(record.amount),
    0
  );

  // 创始人「清理我提交过的测试数据」入口需要的 count
  const ownSubmissions = await getOwnSubmissionCounts(member.id);
  const cards = [
    { label: "本月收入", value: money(summary.monthIncome), tone: "text-emerald-700", hint: "已批准 / 已入账收入" },
    { label: "本月支出", value: money(summary.monthExpense), tone: "text-red-700", hint: "已批准 / 已入账支出" },
    { label: "本月利润", value: money(summary.monthProfit), tone: summary.monthProfit >= 0 ? "text-emerald-700" : "text-red-700", hint: "收入 - 支出" },
    { label: "现金余额", value: money(summary.cashBalance), tone: "text-sky-700", hint: "CNY 账户余额合计" }
  ];

  const isFounder = member.role?.key === "owner";
  const ownTotal = ownSubmissions.records + ownSubmissions.reports;

  return (
    <>
      <NoticeBanner error={params.error} notice={params.notice} />

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

      {/* ⭐ 财务审批入口 — 只显示统计 + 大按钮，详细处理在工作台里做 */}
      <ApprovalSpotlight
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

      {/* 财务流水入口 —— 不在中心页直接铺开明细，避免暴露给随手点开的人 */}
      <Card className="mt-6 overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
              style={{ background: "rgba(249,115,22,0.10)" }}
            >
              <ListChecks className="h-6 w-6 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold tracking-tight text-slate-900">
                财务流水
              </div>
              <p className="mt-0.5 text-[13px] text-slate-600">
                每一笔收入、支出、转账、报销的完整记录。本月共 {summary.recentRecords.length} 条流水。
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/finance/records">
              查看全部流水 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* 创始人专属：清理我自己提交过的记账 / 报销（测试数据收尾）—— 只对 owner 显示 */}
      {isFounder && ownTotal > 0 ? (
        <Card className="mt-6 border-rose-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px] text-rose-700">
              <Trash2 className="h-4 w-4" />
              清理我提交过的记账 / 报销（创始人专用）
            </CardTitle>
            <CardDescription className="text-slate-700">
              你名下目前有 <strong className="text-rose-700">{ownSubmissions.records}</strong> 条记账 +{" "}
              <strong className="text-rose-700">{ownSubmissions.reports}</strong> 条报销。
              点击下方按钮会一次性删掉这些「你作为提交人」的数据，
              <strong>员工的记录（吴恩典等）完全不动</strong>。
              动作不可撤销，但会写入审计日志，可在系统日志里查到清理时间和数量。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={cleanupOwnFinanceSubmissionsAction}>
              <ConfirmSubmitButton
                confirmText={`确认删除你提交的 ${ownSubmissions.records} 条记账 + ${ownSubmissions.reports} 条报销？此操作不可撤销，但员工的记录不会被动。`}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                清理我提交的全部记账 + 报销
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
