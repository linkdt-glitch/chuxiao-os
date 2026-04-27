import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/auth";
import { getFinanceRecords } from "@/lib/finance/records";

export default async function ReimbursementsPage() {
  const member = await getCurrentMember();
  const records = await getFinanceRecords();
  const reimbursements = records.filter((record) => record.record_type === "reimbursement" || record.reimbursement_required);
  const mine = reimbursements.filter((record) => record.submitted_by === member.id);
  const pending = reimbursements.filter((record) => record.status === "pending_approval");

  return (
    <>
      <PageHeader
        title="报销管理"
        description="员工查看自己的报销，管理者处理团队或授权范围内的待审批报销。"
      />
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>待审批报销</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable records={pending} showActions />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>我的报销</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable records={mine} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>团队报销</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable records={reimbursements} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
