import { approveFinanceRecordAction, rejectFinanceRecordAction, updateFinanceRecordAction } from "@/app/(app)/finance/actions";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FinanceRecord } from "@/lib/finance/types";

const typeLabel = {
  income: "收入",
  expense: "支出",
  reimbursement: "报销",
  transfer: "转账",
  refund: "退款",
  adjustment: "调整"
};

export function FinanceRecordsTable({ records, showActions = false }: { records: FinanceRecord[]; showActions?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>编号</TableHead>
          <TableHead>日期</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>说明</TableHead>
          <TableHead>类目</TableHead>
          <TableHead className="text-right">金额</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>风险</TableHead>
          <TableHead>经手人</TableHead>
          {showActions ? <TableHead className="text-right">操作</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="font-medium">{record.record_no}</TableCell>
            <TableCell>{record.occurred_at}</TableCell>
            <TableCell><Badge variant={record.record_type === "income" ? "success" : "secondary"}>{typeLabel[record.record_type]}</Badge></TableCell>
            <TableCell>
              <div className="max-w-[260px] font-medium">{record.description}</div>
              <div className="text-xs text-muted-foreground">{record.counterparty_name ?? record.project_name ?? "-"}</div>
            </TableCell>
            <TableCell>{[record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类"}</TableCell>
            <TableCell className="text-right font-semibold">{record.currency} {Number(record.amount).toFixed(2)}</TableCell>
            <TableCell><StatusBadge value={record.status} /></TableCell>
            <TableCell><RiskBadge value={record.risk_level} /></TableCell>
            <TableCell>{record.submitter?.display_name ?? "-"}</TableCell>
            {showActions ? (
              <TableCell className="space-x-2 text-right">
                {record.status === "pending_approval" ? (
                  <>
                    <form action={approveFinanceRecordAction} className="inline">
                      <input type="hidden" name="id" value={record.id} />
                      <ConfirmSubmitButton confirmText="确认批准这条财务申请？" variant="secondary">批准</ConfirmSubmitButton>
                    </form>
                    <form action={rejectFinanceRecordAction} className="inline">
                      <input type="hidden" name="id" value={record.id} />
                      <ConfirmSubmitButton confirmText="确认驳回这条财务申请？" variant="destructive">驳回</ConfirmSubmitButton>
                    </form>
                  </>
                ) : record.status === "approved" && record.account_id ? (
                  <form action={updateFinanceRecordAction} className="inline">
                    <input type="hidden" name="id" value={record.id} />
                    <input type="hidden" name="status" value="paid" />
                    <ConfirmSubmitButton confirmText="确认将这条记录标记为已付款/已入账？该操作会更新账户余额。" variant="secondary">付款</ConfirmSubmitButton>
                  </form>
                ) : (
                  <span className="text-xs text-muted-foreground">无需处理</span>
                )}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
