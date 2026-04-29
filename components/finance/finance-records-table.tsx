import { approveFinanceRecordAction, rejectFinanceRecordAction, updateFinanceRecordAction } from "@/app/(app)/finance/actions";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FinanceRecord } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const typeLabel = {
  income: "收入",
  expense: "支出",
  reimbursement: "报销",
  transfer: "转账",
  refund: "退款",
  adjustment: "调整"
};

function money(record: FinanceRecord) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: record.currency || "CNY",
    maximumFractionDigits: 2
  }).format(Number(record.amount) || 0);
}

function ActionButtons({ record }: { record: FinanceRecord }) {
  if (record.status === "pending_approval") {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <form action={approveFinanceRecordAction} className="inline">
          <input type="hidden" name="id" value={record.id} />
          <ConfirmSubmitButton confirmText="确认批准这条财务申请？" variant="secondary">批准</ConfirmSubmitButton>
        </form>
        <form action={rejectFinanceRecordAction} className="inline">
          <input type="hidden" name="id" value={record.id} />
          <ConfirmSubmitButton confirmText="确认驳回这条财务申请？" variant="destructive">驳回</ConfirmSubmitButton>
        </form>
      </div>
    );
  }

  if (record.status === "approved" && record.account_id) {
    return (
      <form action={updateFinanceRecordAction} className="inline-flex">
        <input type="hidden" name="id" value={record.id} />
        <input type="hidden" name="status" value="paid" />
        <ConfirmSubmitButton confirmText="确认将这条记录标记为已付款/已入账？该操作会更新账户余额。" variant="secondary">付款</ConfirmSubmitButton>
      </form>
    );
  }

  return <span className="text-xs text-muted-foreground">无需处理</span>;
}

function TypeBadge({ record }: { record: FinanceRecord }) {
  const variant = record.record_type === "income" || record.record_type === "refund" ? "success" : record.record_type === "reimbursement" ? "warning" : "secondary";
  return <Badge variant={variant}>{typeLabel[record.record_type]}</Badge>;
}

function FinanceRecordMobileCard({
  record,
  showActions,
  highlighted
}: {
  record: FinanceRecord;
  showActions: boolean;
  highlighted: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl",
        highlighted && "border-cyan-300 bg-cyan-50/70 shadow-[0_16px_44px_rgba(14,165,233,0.16)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge record={record} />
            <StatusBadge value={record.status} />
            <RiskBadge value={record.risk_level} />
          </div>
          <div className="mt-3 text-base font-semibold text-slate-950">{record.description}</div>
          <div className="mt-1 text-xs text-muted-foreground">{record.record_no} · {record.occurred_at}</div>
        </div>
        <div className={cn("shrink-0 text-right text-lg font-semibold", record.record_type === "income" ? "text-emerald-700" : "text-slate-950")}>
          {money(record)}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">类目</div>
          <div className="mt-1 font-medium">{[record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">经手人</div>
          <div className="mt-1 font-medium">{record.submitter?.display_name ?? "-"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">往来方</div>
          <div className="mt-1 font-medium">{record.counterparty_name ?? record.project_name ?? "-"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">账户</div>
          <div className="mt-1 font-medium">{record.account?.name ?? "未选择"}</div>
        </div>
      </div>
      {showActions ? (
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
          <ActionButtons record={record} />
        </div>
      ) : null}
    </div>
  );
}

export function FinanceRecordsTable({
  records,
  showActions = false,
  highlightId,
  emptyTitle = "暂无财务流水",
  emptyDescription = "新增收入、支出或报销后，会出现在这里。"
}: {
  records: FinanceRecord[];
  showActions?: boolean;
  highlightId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!records.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {records.map((record) => (
          <FinanceRecordMobileCard key={record.id} record={record} showActions={showActions} highlighted={record.id === highlightId} />
        ))}
      </div>
      <div className="hidden md:block">
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
              <TableRow key={record.id} className={record.id === highlightId ? "bg-cyan-50/70" : undefined}>
                <TableCell className="font-medium">{record.record_no}</TableCell>
                <TableCell>{record.occurred_at}</TableCell>
                <TableCell><TypeBadge record={record} /></TableCell>
                <TableCell>
                  <div className="max-w-[260px] font-medium">{record.description}</div>
                  <div className="text-xs text-muted-foreground">{record.counterparty_name ?? record.project_name ?? "-"}</div>
                </TableCell>
                <TableCell>{[record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类"}</TableCell>
                <TableCell className={cn("text-right font-semibold", record.record_type === "income" ? "text-emerald-700" : "text-slate-950")}>{money(record)}</TableCell>
                <TableCell><StatusBadge value={record.status} /></TableCell>
                <TableCell><RiskBadge value={record.risk_level} /></TableCell>
                <TableCell>{record.submitter?.display_name ?? "-"}</TableCell>
                {showActions ? (
                  <TableCell className="text-right">
                    <ActionButtons record={record} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
