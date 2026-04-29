import Link from "next/link";
import { Clock3, Plus, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";
import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/auth";
import { getFinanceRecords } from "@/lib/finance/records";

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2
  }).format(value);
}

export default async function ReimbursementsPage() {
  const member = await getCurrentMember();
  const records = await getFinanceRecords();
  const reimbursements = records.filter((record) => record.record_type === "reimbursement" || record.reimbursement_required);
  const mine = reimbursements.filter((record) => record.submitted_by === member.id);
  const pending = reimbursements.filter((record) => record.status === "pending_approval");
  const approved = reimbursements.filter((record) => record.status === "approved");
  const paid = reimbursements.filter((record) => record.status === "paid");
  const pendingAmount = pending.reduce((sum, record) => sum + Number(record.amount), 0);
  const myPending = mine.filter((record) => record.status === "pending_approval").length;

  return (
    <>
      <PageHeader
        title="报销管理"
        description="员工查看自己的报销，管理者处理团队或授权范围内的待审批报销。"
        action={<Button asChild><Link href="/finance/records/new"><Plus className="h-4 w-4" />新建报销</Link></Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm text-muted-foreground">待审批</div>
              <div className="mt-1 text-2xl font-semibold">{pending.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">{money(pendingAmount)}</div>
            </div>
            <Clock3 className="h-5 w-5 text-amber-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm text-muted-foreground">我的报销</div>
              <div className="mt-1 text-2xl font-semibold">{mine.length}</div>
              <Badge variant={myPending ? "warning" : "success"} className="mt-1">{myPending} 待处理</Badge>
            </div>
            <ReceiptText className="h-5 w-5 text-sky-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm text-muted-foreground">已批准待付款</div>
              <div className="mt-1 text-2xl font-semibold">{approved.length}</div>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm text-muted-foreground">已完成付款</div>
              <div className="mt-1 text-2xl font-semibold">{paid.length}</div>
            </div>
            <WalletCards className="h-5 w-5 text-indigo-700" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>待审批报销</CardTitle>
            <Badge variant={pending.length ? "warning" : "success"}>{pending.length} 条</Badge>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable
              records={pending}
              showActions
              emptyTitle="暂无待审批报销"
              emptyDescription="员工提交需要报销或审批的财务记录后，会进入这里。"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>我的报销</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable
              records={mine}
              emptyTitle="你还没有报销记录"
              emptyDescription="从手动记账或一句话记账创建报销记录后，会在这里追踪状态。"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>团队报销</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable
              records={reimbursements}
              emptyTitle="暂无团队报销"
              emptyDescription="团队报销、垫付和需要审批的支出会沉淀为组织财务记忆。"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
