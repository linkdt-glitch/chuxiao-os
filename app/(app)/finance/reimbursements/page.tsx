import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Plus,
  Settings,
  Sparkles,
  WalletCards
} from "lucide-react";
import { ExpenseApprovalWorkbench } from "@/components/expenses/expense-approval-workbench";
import { FinanceApprovalWorkbench } from "@/components/finance/finance-approval-workbench";
import { PageHeader } from "@/components/layout/page-header";
import { NoticeCelebration } from "@/components/ui/notice-celebration";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentMember } from "@/lib/auth";
import { getDepartments, getExpenseDashboard, money } from "@/lib/finance/expenses";
import { canViewAllFinance } from "@/lib/finance/permissions";

export default async function ReimbursementsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  // 普通成员（非 owner / admin）不应该看到审批工作台
  if (!(await canViewAllFinance())) {
    redirect("/finance");
  }
  const params = (await searchParams) ?? {};
  const [dashboard, departments, member] = await Promise.all([
    getExpenseDashboard(),
    getDepartments(),
    getCurrentMember()
  ]);

  const stats = dashboard.stats;
  const hasFinanceQuick = dashboard.financeRecordApprovals.length > 0;

  return (
    <>
      <NoticeCelebration
        notice={params.notice}
        created={params.created}
        title="恭喜！"
        message={params.notice ?? (params.created ? "报销已经提交成功" : undefined)}
      />
      {params.error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200/30 bg-rose-500/[0.08] p-3 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <div>
            <div className="font-medium">操作失败</div>
            <div className="mt-0.5 text-rose-200/85">{params.error}</div>
          </div>
        </div>
      ) : null}
      {params.notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] p-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{params.notice}</span>
        </div>
      ) : null}

      <PageHeader
        title="报销审批"
        description="员工提交的报销和快捷记账审批集中在这里。优先看异常单据，按员工或日期分组批量处理；审批通过后流向打款与对账。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/api/finance/reimbursements/export">
                <Download className="h-4 w-4" />导出对账
              </Link>
            </Button>
            {dashboard.canManage ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/finance/reimbursements/settings">
                  <Settings className="h-4 w-4" />配置
                </Link>
              </Button>
            ) : null}
            {dashboard.canPay ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/finance/reimbursements/payments">
                  <WalletCards className="h-4 w-4" />待打款
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm">
              <Link href="/finance/reimbursements/new">
                <Plus className="h-4 w-4" />新建报销
              </Link>
            </Button>
          </div>
        }
      />

      {/* 4 个核心指标 — 简洁 minimal 风格 */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CleanMetric
          icon={Clock3}
          label="待处理审批"
          value={stats.totalPendingCount}
          hint={money(stats.totalPendingAmount)}
          tone="amber"
          href="#approval-workbench"
        />
        <CleanMetric
          icon={CircleDollarSign}
          label="已批准待打款"
          value={stats.approvedCount}
          hint={money(stats.approvedAmount)}
          tone="sky"
          href="/finance/reimbursements/payments"
        />
        <CleanMetric
          icon={WalletCards}
          label="本月报销"
          value={money(stats.monthAmount)}
          hint="按发生日期归属月份"
          tone="indigo"
        />
        <CleanMetric
          icon={CheckCircle2}
          label="已完成打款"
          value={stats.paidCount}
          hint={money(stats.paidAmount)}
          tone="emerald"
        />
      </div>

      {/* 快捷记账审批（来自 AI 记账 / 手动记账提交审批的） */}
      <section className="mb-6" id="approval-workbench">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold tracking-tight text-slate-100">
              <Sparkles className="h-4 w-4 text-amber-300" />
              快捷记账审批
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                {stats.financeRecordPendingCount} 待审 · {money(stats.financeRecordPendingAmount)}
              </span>
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              AI 记账 / 手动记账勾选「提交审批」后，会出现在这里。
            </p>
          </div>
        </div>

        {hasFinanceQuick ? (
          <FinanceApprovalWorkbench
            records={dashboard.financeRecordApprovals}
            showActions={dashboard.canApprove}
          />
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-6">
            <EmptyState
              title="暂无快捷记账待审批"
              description="员工通过 AI 记账或手动记账提交审批后，会先汇入这里。"
            />
          </div>
        )}
      </section>

      {/* 正式报销单工作台 */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold tracking-tight text-slate-100">
              正式报销单工作台
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              员工通过「申请报销」提交的正式单据。按员工 / 日期 / 类目 / 状态分组复核。
            </p>
          </div>
        </div>
        <ExpenseApprovalWorkbench
          reports={dashboard.reports}
          departments={departments}
          budgets={dashboard.budgets}
          canApprove={dashboard.canApprove}
          currentMemberId={member.id}
        />
      </section>
    </>
  );
}

/**
 * 简洁版核心指标卡 —— 与新版老板驾驶舱风格统一。
 * 不用厚重渐变，靠 typography + 1px tinted border 区分语义。
 */
function CleanMetric({
  icon: Icon,
  label,
  value,
  hint,
  tone = "sky",
  href
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "amber" | "sky" | "emerald" | "indigo" | "rose";
  href?: string;
}) {
  const palette = {
    amber: { dot: "bg-amber-400", iconColor: "text-amber-300", border: "border-amber-500/15", bg: "bg-amber-500/[0.05]" },
    sky: { dot: "bg-sky-400", iconColor: "text-sky-300", border: "border-sky-500/15", bg: "bg-sky-500/[0.05]" },
    emerald: { dot: "bg-emerald-400", iconColor: "text-emerald-300", border: "border-emerald-500/15", bg: "bg-emerald-500/[0.05]" },
    indigo: { dot: "bg-indigo-400", iconColor: "text-indigo-300", border: "border-indigo-500/15", bg: "bg-indigo-500/[0.05]" },
    rose: { dot: "bg-rose-400", iconColor: "text-rose-300", border: "border-rose-500/15", bg: "bg-rose-500/[0.05]" }
  }[tone];

  const Wrapper: React.ElementType = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={
        "block rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 transition-colors " +
        (href ? "hover:border-white/[0.12] hover:bg-white/[0.05]" : "")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
          {label}
        </span>
        <Icon className={`h-3.5 w-3.5 ${palette.iconColor}`} />
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-slate-50">
        {value}
      </div>
      {hint ? (
        <div className="mt-1.5 text-[11px] text-slate-500 tabular-nums">{hint}</div>
      ) : null}
    </Wrapper>
  );
}
