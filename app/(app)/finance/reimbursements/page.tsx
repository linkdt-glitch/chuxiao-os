import Link from "next/link";
import { ClipboardCheck, Download, Plus, Settings, WalletCards } from "lucide-react";
import { ExpenseApprovalWorkbench } from "@/components/expenses/expense-approval-workbench";
import { ExpenseMetricCard } from "@/components/expenses/expense-shared";
import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentMember } from "@/lib/auth";
import { getDepartments, getExpenseDashboard, money } from "@/lib/finance/expenses";

export default async function ReimbursementsPage() {
  const [dashboard, departments, member] = await Promise.all([
    getExpenseDashboard(),
    getDepartments(),
    getCurrentMember()
  ]);

  return (
    <>
      <PageHeader
        title="报销审批"
        description="财务中心内的专用报销流。员工提交报销，Owner/Admin 按员工、日期、类别、状态集中审批，并完成打款和月度对账。"
        action={
          <div className="grid gap-2 sm:flex">
            <Button asChild variant="outline">
              <Link href="/api/finance/reimbursements/export"><Download className="h-4 w-4" />导出对账</Link>
            </Button>
            {dashboard.canManage ? (
              <Button asChild variant="outline">
                <Link href="/finance/reimbursements/settings"><Settings className="h-4 w-4" />配置</Link>
              </Button>
            ) : null}
            {dashboard.canPay ? (
              <Button asChild variant="outline">
                <Link href="/finance/reimbursements/payments"><WalletCards className="h-4 w-4" />待打款</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/finance/reimbursements/new"><Plus className="h-4 w-4" />新建报销</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ExpenseMetricCard label="待处理审批" value={dashboard.stats.totalPendingCount} hint={money(dashboard.stats.totalPendingAmount)} tone="amber" />
        <ExpenseMetricCard label="已批准待打款" value={dashboard.stats.approvedCount} hint={money(dashboard.stats.approvedAmount)} tone="sky" />
        <ExpenseMetricCard label="本月报销" value={money(dashboard.stats.monthAmount)} hint="按发生日期归属月份" tone="indigo" />
        <ExpenseMetricCard label="已完成打款" value={dashboard.stats.paidCount} hint={money(dashboard.stats.paidAmount)} tone="emerald" />
      </div>

      <Card className="mb-4 overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50/80 via-white/82 to-cyan-50/60">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-700" />
              待我处理的财务审批
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              AI 记账、手动记账和报销单提交后的财务审批都集中在这里处理。
            </p>
          </div>
          <div className="rounded-2xl bg-white/78 px-4 py-3 text-sm shadow-sm">
            <div className="text-muted-foreground">快捷记账待审</div>
            <div className="mt-1 text-xl font-semibold text-slate-950">
              {dashboard.stats.financeRecordPendingCount} 条 · {money(dashboard.stats.financeRecordPendingAmount)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard.financeRecordApprovals.length ? (
            <FinanceRecordsTable
              records={dashboard.financeRecordApprovals}
              showActions={dashboard.canApprove}
              emptyTitle="暂无快捷记账待审批"
              emptyDescription="AI 记账或手动记账勾选提交审批后，会直接出现在这里。"
            />
          ) : (
            <EmptyState
              title="暂无快捷记账待审批"
              description="AI 记账、手动支出或报销勾选提交审批后，会直接进入这里。下方仍可查看正式报销单工作台。"
            />
          )}
        </CardContent>
      </Card>

      <ExpenseApprovalWorkbench
        reports={dashboard.reports}
        departments={departments}
        budgets={dashboard.budgets}
        canApprove={dashboard.canApprove}
        currentMemberId={member.id}
      />
    </>
  );
}
