import Link from "next/link";
import { ArrowRight, Download, FileSpreadsheet, ListChecks, Plus, ReceiptText, Sparkles, WalletCards } from "lucide-react";
import { ApprovalSpotlight } from "@/components/finance/approval-spotlight";
import { FinanceExecutiveDashboard } from "@/components/finance/finance-executive-dashboard";
import { MySubmissionsPanel } from "@/components/finance/my-submissions-panel";
import { NoticeBanner } from "@/components/ui/notice-banner";
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

/**
 * 统一入口卡片 —— 顶部一张大卡片把所有「记账 / 报销」入口聚到一处。
 *
 * 之前 PageHeader 5 个按钮 + 中间 2 张大卡片 + 各种隐性入口，
 * 用户嫌太乱。这里压成一张卡，3 个等宽大按钮一字排开。
 */
function EntryActionsCard({
  isOwnerView
}: {
  /** owner/admin 视图（看公司全局）vs member 视图（只看自己提交的） */
  isOwnerView: boolean;
}) {
  // owner 用「记账」措辞（含收入 / 支出 / 转账），member 用「记一笔」（不含收入）
  const actions: Array<{
    href: string;
    icon: typeof Sparkles;
    title: string;
    subtitle: string;
    accent: "primary" | "outline";
  }> = isOwnerView
    ? [
        {
          href: "/finance/ai-bookkeeping",
          icon: Sparkles,
          title: "一句话 AI 记账",
          subtitle: "说一句、拍张照就生成",
          accent: "primary"
        },
        {
          href: "/finance/records/new",
          icon: Plus,
          title: "手动记账",
          subtitle: "精确选类目 / 账户 / 项目",
          accent: "outline"
        },
        {
          href: "/finance/reimbursements/new",
          icon: ReceiptText,
          title: "新建报销",
          subtitle: "上传票据，走审批流程",
          accent: "outline"
        }
      ]
    : [
        {
          href: "/finance/ai-bookkeeping?intent=reimbursement",
          icon: Sparkles,
          title: "一句话 AI 报销",
          subtitle: "描述一下就行",
          accent: "primary"
        },
        {
          href: "/finance/reimbursements/new",
          icon: ReceiptText,
          title: "手动新建报销",
          subtitle: "上传票据等审批",
          accent: "outline"
        },
        {
          href: "/finance/records/new",
          icon: Plus,
          title: "记一笔",
          subtitle: "支出 / 转账 / 退款",
          accent: "outline"
        }
      ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] text-slate-900">
          {isOwnerView ? "记账 / 报销 / 票据 入口" : "申请报销 / 记一笔"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-3">
          {actions.map((action) => (
            <Button
              key={action.href}
              asChild
              variant={action.accent === "primary" ? "default" : "outline"}
              className="h-auto min-h-[64px] justify-start gap-3 px-3 py-3 sm:flex-col sm:items-center sm:justify-center sm:gap-1 sm:px-2 sm:py-4 sm:text-center"
            >
              <Link href={action.href}>
                <action.icon className="h-5 w-5 shrink-0" />
                <span className="flex min-w-0 flex-col items-start sm:items-center">
                  <span className="text-[14px] font-semibold leading-tight">{action.title}</span>
                  <span className="text-[11px] font-normal leading-tight opacity-75">{action.subtitle}</span>
                </span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
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
        <NoticeBanner error={params.error} notice={params.notice} />
        <PageHeader
          title="我的报销与记账"
          description="申请报销（垫付费用找公司报销）/ 记一笔（自己的日常收支）/ 在下方查看报销审批反馈。"
        />

        {/* 统一入口卡 */}
        <EntryActionsCard isOwnerView={false} />

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

  const cards = [
    { label: "本月收入", value: money(summary.monthIncome), tone: "text-emerald-700", hint: "已批准 / 已入账收入" },
    { label: "本月支出", value: money(summary.monthExpense), tone: "text-red-700", hint: "已批准 / 已入账支出" },
    { label: "本月利润", value: money(summary.monthProfit), tone: summary.monthProfit >= 0 ? "text-emerald-700" : "text-red-700", hint: "收入 - 支出" },
    { label: "现金余额", value: money(summary.cashBalance), tone: "text-sky-700", hint: "CNY 账户余额合计" }
  ];

  return (
    <>
      <NoticeBanner error={params.error} notice={params.notice} />

      <PageHeader
        title="财务能量中心"
        description="看清收入、支出、利润、现金流和经营健康度；含一句话记账、报销审批、收支流水、财务看板与 Excel 导出。"
        action={
          // 只保留工具类按钮（报表 / 导出），记账 / 报销入口下移到统一卡里
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/finance/reports">
                <FileSpreadsheet className="h-4 w-4" />报表
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/api/finance/export?type=expense">
                <Download className="h-4 w-4" />导出支出
              </Link>
            </Button>
          </div>
        }
      />

      {/* ⭐ 统一入口卡 — 所有「记账 / 报销」按钮集中在这里 */}
      <EntryActionsCard isOwnerView={true} />

      {/* ⭐ 财务审批入口 — 只显示统计 + 大按钮，详细处理在工作台里做 */}
      <div className="mt-3">
        <ApprovalSpotlight
          totalCount={summary.pendingReimbursements}
          totalAmount={pendingApprovalAmount}
        />
      </div>

      {/* 4 个核心指标 */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
    </>
  );
}
