import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { ExpensePaymentsTable } from "@/components/expenses/expense-payments-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getExpenseReports } from "@/lib/finance/expenses";

export default async function ExpensePaymentsPage() {
  const reports = await getExpenseReports({ status: "approved", limit: 500 });

  return (
    <>
      <PageHeader
        title="报销打款"
        description="财务集中处理已批准报销，批量记录打款日期和流水号。"
        action={
          <div className="grid gap-2 sm:flex">
            <Button asChild variant="outline"><Link href="/finance/reimbursements"><ArrowLeft className="h-4 w-4" />返回审批</Link></Button>
            <Button asChild variant="outline"><Link href="/api/finance/reimbursements/export"><Download className="h-4 w-4" />导出对账</Link></Button>
          </div>
        }
      />
      <ExpensePaymentsTable reports={reports} />
    </>
  );
}
