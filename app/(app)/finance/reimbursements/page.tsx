import Link from "next/link";
import { Download, Plus, Settings, WalletCards } from "lucide-react";
import { ExpenseApprovalWorkbench } from "@/components/expenses/expense-approval-workbench";
import { ExpenseMetricCard } from "@/components/expenses/expense-shared";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
        <ExpenseMetricCard label="待审批" value={dashboard.stats.pendingCount} hint={money(dashboard.stats.pendingAmount)} tone="amber" />
        <ExpenseMetricCard label="已批准待打款" value={dashboard.stats.approvedCount} hint={money(dashboard.stats.approvedAmount)} tone="sky" />
        <ExpenseMetricCard label="本月报销" value={money(dashboard.stats.monthAmount)} hint="按发生日期归属月份" tone="indigo" />
        <ExpenseMetricCard label="已完成打款" value={dashboard.stats.paidCount} hint={money(dashboard.stats.paidAmount)} tone="emerald" />
      </div>

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
