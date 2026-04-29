import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, Plus, ReceiptText, Search, ShieldCheck, WalletCards, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Textarea } from "@/components/ui/textarea";
import { getApprovalCenterData } from "@/lib/data/queries";
import type { FinanceRecord } from "@/lib/finance/types";
import type { ApprovalRequest, ApprovalStatus, RiskLevel } from "@/lib/types/core";
import { cn, formatDate } from "@/lib/utils";
import { approveApprovalAction, cancelApprovalAction, createApprovalAction, rejectApprovalAction } from "./actions";

type ApprovalParams = {
  status?: string;
  module?: string;
  risk?: string;
  q?: string;
};

const selectClass =
  "h-10 rounded-md border border-slate-200/80 bg-white/75 px-3 text-sm shadow-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100";

const statusLabels: Record<string, string> = {
  pending: "待审批",
  approved: "已批准",
  rejected: "已驳回",
  cancelled: "已取消"
};

const moduleLabels: Record<string, string> = {
  finance: "财务",
  projects: "项目",
  tasks: "任务",
  agents: "Agent",
  ai_workforce: "AI 劳动力",
  knowledge: "知识库",
  evolution: "成长飞轮",
  governance: "治理"
};

const riskLabels: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "关键风险"
};

function money(amount?: number | null, currency = "CNY") {
  if (!Number.isFinite(Number(amount))) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(amount));
}

function financeAmount(approval: ApprovalRequest, record?: FinanceRecord) {
  const rawAmount = record?.amount ?? approval.metadata?.amount;
  const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
  const currency = record?.currency ?? (typeof approval.metadata?.currency === "string" ? approval.metadata.currency : "CNY");
  return money(amount, currency);
}

function financeRecordType(record?: FinanceRecord, approval?: ApprovalRequest) {
  const value = record?.record_type ?? approval?.metadata?.record_type;
  const labels: Record<string, string> = {
    income: "收入",
    expense: "支出",
    reimbursement: "报销",
    transfer: "转账",
    refund: "退款",
    adjustment: "调整"
  };
  return typeof value === "string" ? labels[value] ?? value : "财务单据";
}

function matchesApproval(approval: ApprovalRequest, record: FinanceRecord | undefined, params: ApprovalParams) {
  if (params.status && params.status !== "all" && approval.status !== params.status) return false;
  if (params.module && params.module !== "all" && approval.related_module !== params.module) return false;
  if (params.risk && params.risk !== "all" && approval.risk_level !== params.risk) return false;

  const keyword = params.q?.trim().toLowerCase();
  if (!keyword) return true;

  return [
    approval.title,
    approval.description,
    approval.related_module,
    approval.related_record_type,
    record?.record_no,
    record?.description,
    record?.counterparty_name,
    record?.project_name,
    record?.submitter?.display_name
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "sky"
}: {
  title: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone?: "sky" | "amber" | "emerald" | "rose";
}) {
  const tones = {
    sky: "from-sky-50 to-indigo-50 text-sky-700",
    amber: "from-amber-50 to-orange-50 text-amber-700",
    emerald: "from-emerald-50 to-teal-50 text-emerald-700",
    rose: "from-rose-50 to-red-50 text-rose-700"
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        </div>
        <div className={cn("rounded-2xl bg-gradient-to-br p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalActions({ approval, showReason = false }: { approval: ApprovalRequest; showReason?: boolean }) {
  if (approval.status !== "pending") return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <form action={approveApprovalAction} className="inline-flex">
        <input type="hidden" name="approval_id" value={approval.id} />
        <ConfirmSubmitButton confirmText="确认批准该审批？" variant="secondary">
          批准
        </ConfirmSubmitButton>
      </form>
      <form action={rejectApprovalAction} className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
        <input type="hidden" name="approval_id" value={approval.id} />
        {showReason ? <Input name="reason" placeholder="驳回原因（可选）" className="h-8 min-w-0" /> : null}
        <ConfirmSubmitButton confirmText="确认驳回该审批？" variant="destructive">
          驳回
        </ConfirmSubmitButton>
      </form>
      <form action={cancelApprovalAction} className="inline-flex">
        <input type="hidden" name="approval_id" value={approval.id} />
        <ConfirmSubmitButton confirmText="确认取消该审批？">
          取消
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function FinanceApprovalCard({ approval, record }: { approval: ApprovalRequest; record?: FinanceRecord }) {
  const isPending = approval.status === "pending" || record?.status === "pending_approval";

  return (
    <div className="rounded-2xl border border-sky-100/80 bg-white/72 p-4 shadow-[0_14px_40px_rgba(14,165,233,0.06)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{financeRecordType(record, approval)}</Badge>
            <RiskBadge value={approval.risk_level} />
            <StatusBadge value={(record?.status ?? approval.status) as ApprovalStatus | string} />
            {record?.reimbursement_required ? <Badge variant="warning">需要报销</Badge> : null}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">{approval.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{record?.description ?? approval.description ?? "暂无说明"}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-indigo-50 px-4 py-3 text-left sm:text-right">
          <div className="text-xs text-muted-foreground">审批金额</div>
          <div className="mt-1 text-xl font-semibold text-slate-950">{financeAmount(approval, record)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{record?.record_no ?? approval.related_record_id ?? "未关联单号"}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">提交人</div>
          <div className="mt-1 font-medium">{record?.submitter?.display_name ?? approval.requester_type}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">账户</div>
          <div className="mt-1 font-medium">{record?.account?.name ?? "未选择"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">分类</div>
          <div className="mt-1 font-medium">{record?.category?.name ?? "未分类"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">创建时间</div>
          <div className="mt-1 font-medium">{formatDate(approval.created_at)}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-sky-100/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href={record ? `/finance/records?highlight=${record.id}` : "/finance/reimbursements"}>查看财务单据</Link>
        </Button>
        {isPending ? <ApprovalActions approval={approval} showReason /> : null}
      </div>
    </div>
  );
}

export default async function ApprovalsPage({
  searchParams
}: {
  searchParams?: Promise<ApprovalParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const data = await getApprovalCenterData();
  const recordByApprovalId = new Map(data.financeApprovals.map((item) => [item.approval.id, item.record]));
  const filteredApprovals = data.approvals.filter((approval) => matchesApproval(approval, recordByApprovalId.get(approval.id), params));
  const financeQueue = data.financeApprovals
    .filter(({ approval, record }) => matchesApproval(approval, record, { ...params, module: "finance" }))
    .filter(({ approval, record }) => approval.status === "pending" || record?.status === "pending_approval");

  return (
    <>
      <PageHeader
        title="Approvals 审批中心"
        description="统一处理财务、项目、Agent 和高风险动作审批；财务审批会同步更新对应财务单据状态。"
        action={
          <Button asChild variant="outline">
            <Link href="/finance/reimbursements">
              <WalletCards className="h-4 w-4" />
              财务报销台
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="待审批" value={data.stats.pending} hint="所有未处理审批" icon={Clock3} />
        <StatCard title="财务待审批" value={data.stats.financePending} hint="支出、报销、付款相关" icon={ReceiptText} tone="amber" />
        <StatCard title="高风险待处理" value={data.stats.highRiskPending} hint="high / critical" icon={AlertTriangle} tone="rose" />
        <StatCard title="本周已处理" value={data.stats.processedThisWeek} hint={`其中驳回 ${data.stats.rejectedThisWeek} 条`} icon={CheckCircle2} tone="emerald" />
      </div>

      <Card className="mt-4">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px_auto_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="q">搜索审批</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="q" name="q" defaultValue={params.q ?? ""} placeholder="标题、单号、提交人、说明" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <select id="status" name="status" defaultValue={params.status ?? "all"} className={selectClass}>
                <option value="all">全部状态</option>
                {(["pending", "approved", "rejected", "cancelled"] as const).map((status) => (
                  <option key={status} value={status}>{statusLabels[status]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="module">模块</Label>
              <select id="module" name="module" defaultValue={params.module ?? "all"} className={selectClass}>
                <option value="all">全部模块</option>
                {Object.entries(moduleLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk">风险</Label>
              <select id="risk" name="risk" defaultValue={params.risk ?? "all"} className={selectClass}>
                <option value="all">全部风险</option>
                {(["low", "medium", "high", "critical"] as const).map((risk) => (
                  <option key={risk} value={risk}>{riskLabels[risk]}</option>
                ))}
              </select>
            </div>
            <Button type="submit">筛选</Button>
            <Button asChild variant="outline">
              <Link href="/approvals">重置</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>财务审批队列</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">优先处理费用、报销、付款前置审批，批准后财务单据会同步变为已批准。</p>
            </div>
            <Badge variant="warning">{financeQueue.length} 待处理</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {financeQueue.length ? (
              financeQueue.map(({ approval, record }) => <FinanceApprovalCard key={approval.id} approval={approval} record={record} />)
            ) : (
              <EmptyState title="暂无待处理财务审批" description="新的报销、支出或高风险财务记录提交后，会自动进入这里。" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>手动提交审批</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createApprovalAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input id="title" name="title" placeholder="例如：Agent 高风险动作审批" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="related_module">关联模块</Label>
                  <Input id="related_module" name="related_module" placeholder="finance / agents / projects" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk_level">风险等级</Label>
                  <select id="risk_level" name="risk_level" defaultValue="medium" className={cn(selectClass, "w-full")}>
                    {(["low", "medium", "high", "critical"] as RiskLevel[]).map((risk) => (
                      <option key={risk} value={risk}>{riskLabels[risk]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="related_record_type">关联对象类型</Label>
                  <Input id="related_record_type" name="related_record_type" placeholder="finance_record / task / agent" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="related_record_id">关联对象 ID</Label>
                  <Input id="related_record_id" name="related_record_id" placeholder="可选" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">说明</Label>
                <Textarea id="description" name="description" placeholder="说明风险、关联对象、预期结果和需要谁判断" />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                提交审批
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>全部审批</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">按状态、风险、模块筛选后，保留完整审批轨迹。</p>
          </div>
          <Badge variant="secondary">{filteredApprovals.length} 条</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredApprovals.length ? (
            filteredApprovals.map((approval) => {
              const record = recordByApprovalId.get(approval.id);
              return (
                <div key={approval.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={approval.related_module === "finance" ? "info" : "secondary"}>
                          {moduleLabels[approval.related_module] ?? approval.related_module}
                        </Badge>
                        <RiskBadge value={approval.risk_level} />
                        <StatusBadge value={approval.status} />
                        <Badge variant="outline">{approval.requester_type}</Badge>
                      </div>
                      <div className="mt-3 font-semibold text-slate-950">{approval.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{approval.description ?? record?.description ?? "暂无说明"}</div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>对象：{approval.related_record_type ?? "record"} / {approval.related_record_id ?? "-"}</span>
                        <span>创建：{formatDate(approval.created_at)}</span>
                        {record ? <span>金额：{financeAmount(approval, record)}</span> : null}
                      </div>
                    </div>
                    <ApprovalActions approval={approval} />
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState title="没有匹配的审批" description="可以调整筛选条件，或从财务中心、项目中心提交新的审批。" />
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 border-cyan-100/80 bg-gradient-to-br from-white/86 via-sky-50/46 to-indigo-50/36">
        <CardContent className="grid gap-3 p-4 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-700" />
            <span>高风险动作必须先留下审批记录，再进入执行。</span>
          </div>
          <div className="flex gap-2">
            <FileCheck2 className="mt-0.5 h-4 w-4 text-cyan-700" />
            <span>财务审批会同步更新财务单据状态，避免审批和账务脱节。</span>
          </div>
          <div className="flex gap-2">
            <WalletCards className="mt-0.5 h-4 w-4 text-cyan-700" />
            <span>批准后仍可在财务中心继续执行付款、报销和归档。</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
