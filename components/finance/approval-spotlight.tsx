import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, ClipboardCheck, FileImage } from "lucide-react";
import { approveFinanceRecordAction } from "@/app/(app)/finance/actions";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RejectInlineButton } from "@/components/ui/reject-inline-button";
import { rejectFinanceRecordAction } from "@/app/(app)/finance/actions";
import type { FinanceRecord } from "@/lib/finance/types";

const TYPE_LABEL: Record<string, string> = {
  income: "收入",
  expense: "支出",
  reimbursement: "报销",
  transfer: "转账",
  refund: "退款",
  adjustment: "调整"
};

function money(amount: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 3
  }).format(Number(amount) || 0);
}

/**
 * 财务中心顶部的「财务审批聚光灯」。
 *
 * - 当前 owner/admin 进 /finance 第一眼就看到待自己处理的报销/支出审批
 * - 有待审：列出 top 5 + 总额 + 一键通过 / 驳回 + 进入完整工作台
 * - 全清：一行简短确认状态
 */
export function ApprovalSpotlight({
  records,
  totalCount,
  totalAmount
}: {
  records: FinanceRecord[];
  /** 待审总条数（财务记录 + 报销单合计）；用于标题统计 */
  totalCount: number;
  /** 待审总金额；用于标题统计 */
  totalAmount: number;
}) {
  if (totalCount === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-[15px] font-semibold text-slate-100">财务审批 · 全部清空</div>
              <div className="text-[12px] text-muted-foreground">
                没有待你处理的报销 / 支出审批，可以专心看仪表盘。
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/finance/reimbursements">
              查看审批工作台 <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previewRecords = records.slice(0, 5);
  const showMore = totalCount > previewRecords.length;

  return (
    <Card
      className="mb-4 overflow-hidden"
      style={{
        boxShadow:
          "0 0 0 1px rgba(245,158,11,0.18), 0 16px 36px rgba(245,158,11,0.06), inset 0 1px 0 rgba(255,255,255,0.05)"
      }}
    >
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
            style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.40)" }}
          >
            <ClipboardCheck className="h-5 w-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-slate-100">财务审批</span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-amber-200">
                {totalCount} 待审
              </span>
              <span className="text-[12px] tabular-nums text-slate-400">
                · 合计 {money(totalAmount)}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              员工的报销 / 支出 / AI 记账提交后等你确认；下面是优先级最高的几条。
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/finance/reimbursements">
            进入审批工作台 <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {previewRecords.map((record) => (
          <ApprovalRow key={record.id} record={record} />
        ))}
        {showMore ? (
          <Link
            href="/finance/reimbursements"
            className="block rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center text-[12px] text-amber-300 transition-colors hover:bg-white/[0.05]"
          >
            还有 {totalCount - previewRecords.length} 条待审，进入完整工作台处理 →
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ApprovalRow({ record }: { record: FinanceRecord }) {
  const submitter = record.submitter?.display_name ?? "未指定";
  const category = [record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类";
  const hasAttachment = (record.attachments?.length ?? 0) > 0;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.04]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
              {TYPE_LABEL[record.record_type] ?? record.record_type}
            </span>
            {hasAttachment ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                <FileImage className="h-3 w-3" />
                {record.attachments?.length} 票据
              </span>
            ) : (
              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-200">
                无票据
              </span>
            )}
            <span className="font-mono text-[11px] tabular-nums text-slate-500">{record.record_no}</span>
          </div>
          <div className="mt-1 truncate text-[14px] font-medium text-slate-100">{record.description}</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {submitter} · {record.occurred_at} · {category}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 lg:shrink-0">
          <div className="text-[18px] font-semibold tabular-nums text-slate-50">
            {money(Number(record.amount), record.currency)}
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={approveFinanceRecordAction}>
              <input type="hidden" name="id" value={record.id} />
              <ConfirmSubmitButton confirmText="确认批准这条财务审批？" size="sm">
                <Check className="h-3.5 w-3.5" />
                通过
              </ConfirmSubmitButton>
            </form>
            <RejectInlineButton
              action={rejectFinanceRecordAction}
              idValue={record.id}
              idName="id"
              reasonName="reason"
              reasonPromptTitle="请输入驳回原因（员工会看到）"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
