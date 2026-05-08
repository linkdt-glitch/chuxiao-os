import Link from "next/link";
import { CheckCircle2, Clock, FileText, ReceiptText, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { FinanceRecord, FinanceRecordStatus } from "@/lib/finance/types";
import type { ExpenseReport, ExpenseStatus } from "@/lib/finance/expenses";

function money(value: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 3
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

const RECORD_STATUS_LABEL: Record<FinanceRecordStatus, { label: string; tone: "pending" | "ok" | "fail" | "muted" }> = {
  draft: { label: "草稿", tone: "muted" },
  pending_approval: { label: "等待审批", tone: "pending" },
  approved: { label: "已通过", tone: "ok" },
  paid: { label: "已支付", tone: "ok" },
  rejected: { label: "已驳回", tone: "fail" },
  cancelled: { label: "已取消", tone: "muted" }
};

const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, { label: string; tone: "pending" | "ok" | "fail" | "muted" }> = {
  draft: { label: "草稿（未提交）", tone: "muted" },
  submitted: { label: "已提交，等待审批", tone: "pending" },
  pending_manager: { label: "等待负责人审批", tone: "pending" },
  pending_finance: { label: "等待财务审批", tone: "pending" },
  approved: { label: "已通过", tone: "ok" },
  paid: { label: "已支付", tone: "ok" },
  rejected: { label: "已驳回", tone: "fail" },
  need_revision: { label: "需要修改", tone: "fail" },
  withdrawn: { label: "已撤回", tone: "muted" },
  cancelled: { label: "已取消", tone: "muted" }
};

function StatusChip({
  label,
  tone
}: {
  label: string;
  tone: "pending" | "ok" | "fail" | "muted";
}) {
  const palette = {
    pending: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", Icon: Clock },
    ok: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", Icon: CheckCircle2 },
    fail: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200", Icon: XCircle },
    muted: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", Icon: FileText }
  }[tone];
  const Icon = palette.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${palette.bg} ${palette.text} ${palette.border}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function getRejectReason(record: FinanceRecord) {
  const meta = record.metadata as Record<string, unknown> | undefined;
  const reason = meta?.reject_reason;
  return typeof reason === "string" && reason.length > 0 ? reason : null;
}

function getExpenseRejectReason(report: ExpenseReport) {
  // 找最后一个被驳回 / 退回的步骤评论
  const failedStep = [...(report.steps ?? [])]
    .reverse()
    .find((step) => step.status === "rejected" || step.status === "need_revision");
  const comment = failedStep?.comment;
  return typeof comment === "string" && comment.length > 0 ? comment : null;
}

/**
 * 普通成员（非 owner / admin）登录后看到的"我的提交"面板：
 *
 *   - 我的报销 / 支出 (finance_records 中 record_type=reimbursement 或 reimbursement_required=true)
 *   - 我的报销单 (finance_expense_reports submitter=我)
 *   - 每条带状态、金额、日期；如被驳回/需修改，醒目展示驳回原因
 */
export function MySubmissionsPanel({
  records,
  expenseReports
}: {
  records: FinanceRecord[];
  expenseReports: ExpenseReport[];
}) {
  const sortedRecords = [...records].sort((a, b) =>
    (b.occurred_at ?? b.created_at).localeCompare(a.occurred_at ?? a.created_at)
  );
  const sortedReports = [...expenseReports].sort((a, b) =>
    (b.occurred_at ?? b.created_at).localeCompare(a.occurred_at ?? a.created_at)
  );
  const totalCount = sortedRecords.length + sortedReports.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4" /> 报销反馈
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          已提交报销的当前状态：等待审批 / 已通过 / 已驳回；被驳回时会附上原因。
        </p>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <EmptyState
            title="还没有提交过报销"
            description="在上方「申请报销」用一句话 AI 或手动新建报销，提交后这里会显示状态。"
          />
        ) : (
          <div className="space-y-3">
            {sortedReports.map((report) => {
              const status = EXPENSE_STATUS_LABEL[report.status] ?? { label: report.status, tone: "muted" as const };
              const reason = getExpenseRejectReason(report);
              return (
                <div key={report.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">报销单</span>
                        <StatusChip label={status.label} tone={status.tone} />
                        <span className="font-mono text-[11px] text-slate-500">{report.report_no}</span>
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-slate-900">{report.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(report.occurred_at)} · {money(report.total_amount, report.currency)}
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={`/finance/reimbursements/${report.id}`}>查看详情</Link>
                    </Button>
                  </div>
                  {reason ? (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                      <span className="font-semibold">驳回 / 需修改原因：</span>
                      {reason}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {sortedRecords.map((record) => {
              const status = RECORD_STATUS_LABEL[record.status] ?? { label: record.status, tone: "muted" as const };
              const reason = getRejectReason(record);
              return (
                <div key={record.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {record.record_type === "reimbursement" ? "报销" : record.record_type === "expense" ? "支出" : "记账"}
                        </span>
                        <StatusChip label={status.label} tone={status.tone} />
                        <span className="font-mono text-[11px] text-slate-500">{record.record_no}</span>
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-slate-900">{record.description}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(record.occurred_at)} · {money(Number(record.amount), record.currency)}
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={`/finance/records/${record.id}`}>查看详情</Link>
                    </Button>
                  </div>
                  {reason ? (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                      <span className="font-semibold">驳回原因：</span>
                      {reason}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
