import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function money(amount: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 3
  }).format(Number(amount) || 0);
}

/**
 * 财务中心顶部的「财务审批入口」。
 *
 * 不在这里展开任何 inline 审批列表 —— 工作台是个严肃的事，需要票据
 * 预览、申报人详情、风险提示、审批记录等等，那些都放在 /finance/reimbursements
 * 里集中处理。这里只做两件事：
 *   1. 让老板/管理员第一眼看到"待审待审金额"的紧迫程度
 *   2. 一键跳进工作台
 */
export function ApprovalSpotlight({
  totalCount,
  totalAmount
}: {
  totalCount: number;
  totalAmount: number;
}) {
  if (totalCount === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[16px] font-semibold text-slate-900">财务审批 · 全部清空</div>
              <div className="text-[13px] text-slate-600">
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

  return (
    <Card
      className="mb-4 overflow-hidden"
      style={{
        boxShadow:
          "0 0 0 1px rgba(245,158,11,0.30), 0 12px 32px -12px rgba(245,158,11,0.20)"
      }}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
            style={{ background: "rgba(249,115,22,0.12)" }}
          >
            <ClipboardCheck className="h-6 w-6 text-orange-600" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[18px] font-semibold tracking-tight text-slate-900">
                财务审批
              </span>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-orange-700">
                {totalCount} 条待审
              </span>
              <span className="text-[14px] tabular-nums text-slate-700">
                合计 <span className="font-semibold">{money(totalAmount)}</span>
              </span>
            </div>
            <p className="mt-1 text-[13px] text-slate-600">
              员工的报销 / 支出 / AI 记账提交后等你确认。请进入工作台逐条核对票据后处理。
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/finance/reimbursements">
            进入审批工作台 <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
