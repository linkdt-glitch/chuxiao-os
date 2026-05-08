"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, CalendarDays, Check, ChevronDown, Clock3, Eye, FileImage, Filter, Layers3, ReceiptText, Search, UserRoundCheck, X } from "lucide-react";
import {
  approveExpenseReportAction,
  rejectExpenseReportAction,
  requestExpenseRevisionAction,
  submitExpenseReportAction,
  withdrawExpenseReportAction
} from "@/app/(app)/finance/reimbursements/actions";
import { DepartmentBudgetProgress, ExpenseRiskBadges, ExpenseStatusBadge, reportRiskFlags } from "@/components/expenses/expense-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RejectInlineButton } from "@/components/ui/reject-inline-button";
import { Textarea } from "@/components/ui/textarea";
import { money, type Department, type DepartmentBudget, type ExpenseReport, type ExpenseStatus } from "@/lib/finance/expense-types";

type ViewMode = "employee" | "date" | "category" | "status";

const pendingStatuses: ExpenseStatus[] = ["submitted", "pending_manager", "pending_finance"];

function avatarText(name?: string | null) {
  return (name || "成员").slice(0, 1).toUpperCase();
}

function firstItem(report: ExpenseReport) {
  return report.items[0];
}

function groupReports(reports: ExpenseReport[], mode: ViewMode) {
  const map = new Map<string, { key: string; title: string; subtitle?: string; reports: ExpenseReport[] }>();
  reports.forEach((report) => {
    const item = firstItem(report);
    const key = mode === "employee"
      ? report.submitter_member_id
      : mode === "date"
        ? report.occurred_at.slice(0, 7)
        : mode === "category"
          ? item?.category?.name ?? "未分类"
          : report.status;
    const title = mode === "employee"
      ? report.submitter?.display_name ?? "未知成员"
      : mode === "date"
        ? `${report.occurred_at.slice(0, 7)}`
        : mode === "category"
          ? item?.category?.name ?? "未分类"
          : report.status;
    const current = map.get(key) ?? {
      key,
      title,
      subtitle: mode === "employee" ? report.department?.name ?? "未分部门" : undefined,
      reports: []
    };
    current.reports.push(report);
    map.set(key, current);
  });
  return Array.from(map.values());
}

function reportPriorityScore(report: ExpenseReport) {
  const flags = reportRiskFlags(report);
  const danger = flags.filter((flag) => flag.severity === "danger").length;
  const warning = flags.filter((flag) => flag.severity === "warning").length;
  const statusBoost = pendingStatuses.includes(report.status) ? 1000 : 0;
  const attachmentBoost = report.attachments.length ? 0 : 120;
  const amountBoost = Math.min(200, Math.floor(report.total_amount / 100));
  return statusBoost + danger * 260 + warning * 120 + attachmentBoost + amountBoost;
}

function sortReportsByPriority(reports: ExpenseReport[]) {
  return [...reports].sort((a, b) => {
    const score = reportPriorityScore(b) - reportPriorityScore(a);
    if (score !== 0) return score;
    return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
  });
}

function groupRiskSummary(reports: ExpenseReport[]) {
  return reports.reduce((summary, report) => {
    const flags = reportRiskFlags(report);
    return {
      danger: summary.danger + flags.filter((flag) => flag.severity === "danger").length,
      warning: summary.warning + flags.filter((flag) => flag.severity === "warning").length,
      missingReceipts: summary.missingReceipts + (report.attachments.length ? 0 : 1)
    };
  }, { danger: 0, warning: 0, missingReceipts: 0 });
}

function monthUsedByMember(reports: ExpenseReport[], memberId: string) {
  const month = new Date().toISOString().slice(0, 7);
  return reports
    .filter((report) => report.submitter_member_id === memberId && report.occurred_at.startsWith(month) && ["approved", "paid", "pending_manager", "pending_finance"].includes(report.status))
    .reduce((sum, report) => sum + report.total_amount, 0);
}

function ReceiptPreview({ report }: { report: ExpenseReport }) {
  const [index, setIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const file = report.attachments[index];

  if (!file) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/60 p-8 text-center text-sm text-red-700">
        <div>
          <FileImage className="mx-auto mb-3 h-8 w-8" />
          这张报销单没有上传票据附件。
        </div>
      </div>
    );
  }

  const url = `/api/files/${file.id}?preview=1`;
  const isPdf = file.mime_type === "application/pdf";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-medium">{file.file_name}</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noreferrer">原图</a>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom((current) => Math.max(0.7, current - 0.1))}>缩小</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom((current) => Math.min(1.6, current + 0.1))}>放大</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRotation((current) => current + 90)}>旋转</Button>
        </div>
      </div>
      <div className="flex min-h-[360px] items-center justify-center overflow-auto rounded-2xl border border-slate-200/80 bg-white/80 p-3">
        {isPdf ? (
          <iframe src={url} className="h-[460px] w-full rounded-xl" title={file.file_name} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={file.file_name}
            className="max-h-[520px] max-w-full rounded-xl object-contain transition-transform"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        )}
      </div>
      {report.attachments.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {report.attachments.map((attachment, attachmentIndex) => (
            <Button
              key={attachment.id}
              type="button"
              size="sm"
              variant={attachmentIndex === index ? "default" : "outline"}
              onClick={() => setIndex(attachmentIndex)}
            >
              {attachmentIndex + 1}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ExpenseDetailDrawer({
  report,
  onClose,
  canApprove
}: {
  report: ExpenseReport;
  onClose: () => void;
  canApprove: boolean;
}) {
  const item = firstItem(report);
  const flags = reportRiskFlags(report);
  const quickReasons = ["票据不清晰", "金额或用途需要补充说明", "疑似重复报销", "不符合当前报销标准"];
  const [revisionComment, setRevisionComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/20 backdrop-blur-sm">
      <button aria-label="关闭报销详情" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <div className="relative h-full w-full overflow-y-auto border-l border-white/80 bg-white/94 p-4 shadow-2xl backdrop-blur-xl sm:max-w-5xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ExpenseStatusBadge status={report.status} />
              <Badge variant={flags.some((flag) => flag.severity === "danger") ? "danger" : flags.length ? "warning" : "success"}>
                {flags.length ? `${flags.length} 个异常提示` : "检查通过"}
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">{report.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{report.report_no} · {report.submitter?.display_name ?? "-"} · {report.department?.name ?? "未分部门"}</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_360px]">
          <ReceiptPreview report={report} />
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white/76 p-4">
              <div className="text-sm text-muted-foreground">报销金额</div>
              <div className="mt-1 text-3xl font-semibold text-slate-950">{money(report.total_amount, report.currency)}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">发生日期</div>
                  <div className="mt-1 font-medium">{report.occurred_at}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">类别</div>
                  <div className="mt-1 font-medium">{item?.category?.name ?? "未分类"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">商家</div>
                  <div className="mt-1 font-medium">{item?.merchant_name ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">当前步骤</div>
                  <div className="mt-1 font-medium">{report.current_step ?? "-"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/76 p-4">
              <div className="mb-2 text-sm font-semibold">异常提示</div>
              <ExpenseRiskBadges flags={flags} />
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/76 p-4">
              <div className="mb-3 text-sm font-semibold">审批链</div>
              <div className="space-y-2">
                {report.steps.length ? report.steps.map((step) => (
                  <div key={step.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50/80 p-3 text-sm">
                    <div>
                      <div className="font-medium">{step.step_order}. {step.label}</div>
                      <div className="text-xs text-muted-foreground">{step.approver_role_key ?? "admin"} · {step.comment || "无意见"}</div>
                    </div>
                    <Badge variant={step.status === "approved" ? "success" : step.status === "rejected" ? "danger" : step.status === "need_revision" ? "info" : "warning"}>{step.status}</Badge>
                  </div>
                )) : <div className="text-sm text-muted-foreground">提交后会自动生成审批链。</div>}
              </div>
            </div>

            {canApprove && pendingStatuses.includes(report.status) ? (
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
                <div className="mb-3 text-sm font-semibold">审批操作</div>
                <form action={approveExpenseReportAction} className="mb-3">
                  <input type="hidden" name="id" value={report.id} />
                  <Button className="w-full" type="submit"><Check className="h-4 w-4" />通过</Button>
                </form>
                <form action={requestExpenseRevisionAction} className="space-y-2">
                  <input type="hidden" name="id" value={report.id} />
                  <Label>要求补充材料 / 驳回原因</Label>
                  <Textarea
                    name="comment"
                    required
                    placeholder="写清楚需要补充什么材料或驳回原因。"
                    value={revisionComment}
                    onChange={(event) => setRevisionComment(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {quickReasons.map((reason) => (
                      <Button key={reason} type="button" size="sm" variant="outline" onClick={() => setRevisionComment(reason)}>
                        {reason}
                      </Button>
                    ))}
                  </div>
                  <Button type="submit" variant="outline" className="w-full">要求补充</Button>
                </form>
                <form action={rejectExpenseReportAction} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={report.id} />
                  <Label>驳回原因</Label>
                  <Textarea
                    name="comment"
                    required
                    placeholder="例如：不符合报销标准，或疑似重复报销。"
                    value={rejectComment}
                    onChange={(event) => setRejectComment(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {quickReasons.map((reason) => (
                      <Button key={reason} type="button" size="sm" variant="outline" onClick={() => setRejectComment(reason)}>
                        {reason}
                      </Button>
                    ))}
                  </div>
                  <Button type="submit" variant="destructive" className="w-full">驳回</Button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExpenseApprovalWorkbench({
  reports,
  departments,
  budgets,
  canApprove,
  currentMemberId
}: {
  reports: ExpenseReport[];
  departments: Department[];
  budgets: DepartmentBudget[];
  canApprove: boolean;
  currentMemberId: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("employee");
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [onlyRisk, setOnlyRisk] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeReport, setActiveReport] = useState<ExpenseReport | null>(null);

  const filteredReports = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return reports.filter((report) => {
      if (status !== "all" && report.status !== status) return false;
      if (departmentId && report.department_id !== departmentId) return false;
      if (onlyRisk && !reportRiskFlags(report).length) return false;
      if (!normalizedKeyword) return true;
      const item = firstItem(report);
      return [
        report.report_no,
        report.title,
        report.submitter?.display_name,
        report.department?.name,
        item?.merchant_name,
        item?.description,
        item?.category?.name
      ].filter(Boolean).join(" ").toLowerCase().includes(normalizedKeyword);
    });
  }, [reports, status, keyword, departmentId, onlyRisk]);

  const groups = useMemo(() => groupReports(filteredReports, viewMode), [filteredReports, viewMode]);
  const selectedTotal = useMemo(() => reports
    .filter((report) => selectedIds.includes(report.id))
    .reduce((sum, report) => sum + report.total_amount, 0), [reports, selectedIds]);
  const statusSummary = useMemo(() => ({
    all: reports.length,
    pendingManager: reports.filter((report) => report.status === "pending_manager").length,
    pendingFinance: reports.filter((report) => report.status === "pending_finance").length,
    risky: reports.filter((report) => reportRiskFlags(report).length).length,
    approved: reports.filter((report) => report.status === "approved").length,
    pendingAmount: reports.filter((report) => pendingStatuses.includes(report.status)).reduce((sum, report) => sum + report.total_amount, 0)
  }), [reports]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllGroup(ids: string[]) {
    setSelectedIds((current) => {
      const allSelected = ids.every((id) => current.includes(id));
      return allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]));
    });
  }

  return (
    <div className="space-y-3">
      {/* 状态过滤 chips —— 替代之前重型 4-tile gradient hero */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={status === "all" && !onlyRisk}
          onClick={() => { setStatus("all"); setOnlyRisk(false); }}
          icon={Layers3}
          label="全部"
          value={statusSummary.all}
        />
        <FilterChip
          active={status === "pending_manager"}
          onClick={() => setStatus("pending_manager")}
          icon={Clock3}
          label="待一级"
          value={statusSummary.pendingManager}
          tone="amber"
        />
        <FilterChip
          active={status === "pending_finance"}
          onClick={() => setStatus("pending_finance")}
          icon={ReceiptText}
          label="待财务"
          value={statusSummary.pendingFinance}
          tone="sky"
        />
        <FilterChip
          active={onlyRisk}
          onClick={() => setOnlyRisk((c) => !c)}
          icon={AlertTriangle}
          label="异常"
          value={statusSummary.risky}
          tone="rose"
        />
        <span className="ml-auto rounded-full border border-cyan-200/30 bg-cyan-500/[0.10] px-3 py-1 text-[11px] tabular-nums text-cyan-200">
          待审金额 {money(statusSummary.pendingAmount)}
        </span>
      </div>

      {/* 搜索 + 视图切换 */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_160px_160px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索编号、员工、商家、说明" className="pl-9" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as ExpenseStatus | "all")} className="h-9 rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
            <option value="all">全部状态</option>
            <option value="submitted">已提交待分派</option>
            <option value="pending_manager">待一级审批</option>
            <option value="pending_finance">待财务复核</option>
            <option value="approved">已批准待打款</option>
            <option value="paid">已打款</option>
            <option value="need_revision">需补充</option>
            <option value="rejected">已驳回</option>
            <option value="draft">草稿</option>
          </select>
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="h-9 rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
            <option value="">全部部门</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setKeyword(""); setStatus("all"); setDepartmentId(""); setOnlyRisk(false); }}>
              <Filter className="h-4 w-4" />重置
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="self-center text-[11px] uppercase tracking-[0.14em] text-slate-500">分组：</span>
          {([
            ["employee", "按员工"],
            ["date", "按日期"],
            ["category", "按类别"],
            ["status", "按状态"]
          ] as Array<[ViewMode, string]>).map(([mode, label]) => (
            <Button key={mode} type="button" size="sm" variant={viewMode === mode ? "default" : "outline"} onClick={() => setViewMode(mode)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      {canApprove && selectedIds.length ? (
        <form action={approveExpenseReportAction} className="flex flex-col gap-2 rounded-lg border border-cyan-200 bg-cyan-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-cyan-950">已选择 {selectedIds.length} 条 · {money(selectedTotal)}</div>
          {selectedIds.map((id) => <input key={id} type="hidden" name="id" value={id} />)}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])}>取消选择</Button>
            <Button type="submit" size="sm"><Check className="h-4 w-4" />批量通过</Button>
          </div>
        </form>
      ) : null}

      {!filteredReports.length ? (
        <EmptyState title="暂无正式报销单" description="调整筛选条件，或让员工在财务能量中心提交正式报销。AI 记账和手动记账产生的快捷审批会显示在上方财务审批区。" />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const sortedReports = sortReportsByPriority(group.reports);
            const groupPending = sortedReports.filter((report) => pendingStatuses.includes(report.status));
            const groupPendingIds = groupPending.map((report) => report.id);
            const total = group.reports.reduce((sum, report) => sum + report.total_amount, 0);
            const memberMonthUsed = viewMode === "employee" ? monthUsedByMember(reports, group.key) : total;
            const referenceReport = group.reports[0];
            const risks = groupRiskSummary(group.reports);

            return (
              <details key={group.key} open className="rounded-lg border border-white/80 bg-white/74 shadow-[0_14px_38px_rgba(15,23,42,0.055)] backdrop-blur-xl">
                <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-indigo-100 text-base font-semibold text-cyan-900">
                      {viewMode === "employee" ? avatarText(group.title) : <CalendarDays className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{viewMode === "status" ? group.title : group.title}</span>
                        <Badge variant={groupPending.length ? "warning" : "secondary"}>{groupPending.length} 待审</Badge>
                        <Badge variant="outline">{money(total)}</Badge>
                        {risks.danger ? <Badge variant="danger">{risks.danger} 红色异常</Badge> : null}
                        {!risks.danger && risks.warning ? <Badge variant="warning">{risks.warning} 需关注</Badge> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>{group.subtitle ?? `${group.reports.length} 条报销记录`}</span>
                        {risks.missingReceipts ? <span>· {risks.missingReceipts} 条缺票据</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {referenceReport ? <DepartmentBudgetProgress report={referenceReport} budgets={budgets} monthUsed={memberMonthUsed} /> : null}
                    <div className="flex gap-2">
                      {canApprove && groupPendingIds.length ? (
                        <>
                          <Button type="button" size="sm" variant="outline" onClick={(event) => { event.preventDefault(); toggleAllGroup(groupPendingIds); }}>
                            选择本组
                          </Button>
                          <form action={approveExpenseReportAction} onClick={(event) => event.stopPropagation()}>
                            {groupPendingIds.map((id) => <input key={id} type="hidden" name="id" value={id} />)}
                            <Button size="sm" type="submit"><UserRoundCheck className="h-4 w-4" />本组全通过</Button>
                          </form>
                        </>
                      ) : null}
                      <ChevronDown className="mt-2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </summary>
                <div className="border-t border-slate-100 p-3">
                  <div className="space-y-2">
                    {sortedReports.map((report) => {
                      const item = firstItem(report);
                      const flags = reportRiskFlags(report);
                      const isPending = pendingStatuses.includes(report.status);
                      const canWithdraw = report.submitter_member_id === currentMemberId && ["submitted", "pending_manager"].includes(report.status);
                      const canSubmit = report.submitter_member_id === currentMemberId && ["draft", "need_revision"].includes(report.status);

                      return (
                        <div key={report.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 gap-3">
                              {canApprove && isPending ? (
                                <input
                                  aria-label="选择报销单"
                                  type="checkbox"
                                  checked={selectedIds.includes(report.id)}
                                  onChange={() => toggleSelected(report.id)}
                                  className="mt-1 h-4 w-4 shrink-0"
                                />
                              ) : <div className="w-4 shrink-0" />}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <ExpenseStatusBadge status={report.status} />
                                  <Badge variant="outline">{report.report_no}</Badge>
                                  <Badge variant="secondary"><ArrowUpDown className="h-3 w-3" />优先级 {reportPriorityScore(report)}</Badge>
                                  {flags.some((flag) => flag.severity === "danger") ? <Badge variant="danger"><AlertTriangle className="h-3 w-3" />红色异常</Badge> : flags.length ? <Badge variant="warning">需关注</Badge> : null}
                                </div>
                                <button type="button" className="mt-2 text-left font-semibold text-slate-950 hover:text-cyan-700" onClick={() => setActiveReport(report)}>
                                  {report.title}
                                </button>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {item?.category?.name ?? "未分类"} · {item?.merchant_name ?? "未填商家"} · {report.occurred_at}
                                </div>
                                {flags.length ? <div className="mt-2"><ExpenseRiskBadges flags={flags.slice(0, 2)} /></div> : null}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 lg:items-end">
                              <div className="text-xl font-semibold text-slate-950">{money(report.total_amount, report.currency)}</div>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => setActiveReport(report)}><Eye className="h-4 w-4" />详情</Button>
                                {canSubmit ? (
                                  <form action={submitExpenseReportAction}>
                                    <input type="hidden" name="id" value={report.id} />
                                    <Button size="sm" type="submit">提交</Button>
                                  </form>
                                ) : null}
                                {canWithdraw ? (
                                  <form action={withdrawExpenseReportAction}>
                                    <input type="hidden" name="id" value={report.id} />
                                    <Button size="sm" variant="outline" type="submit">撤回</Button>
                                  </form>
                                ) : null}
                                {canApprove && isPending ? (
                                  <>
                                    <form action={approveExpenseReportAction}>
                                      <input type="hidden" name="id" value={report.id} />
                                      <Button size="sm" type="submit"><Check className="h-4 w-4" />通过</Button>
                                    </form>
                                    <RejectInlineButton
                                      action={rejectExpenseReportAction}
                                      idValue={report.id}
                                      idName="id"
                                      reasonName="comment"
                                      reasonPromptTitle="请输入驳回原因（员工会看到）"
                                    />
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {activeReport ? <ExpenseDetailDrawer report={activeReport} canApprove={canApprove} onClose={() => setActiveReport(null)} /> : null}
    </div>
  );
}

/** 顶部状态过滤 chip：active 时高亮，附带数字徽标。 */
function FilterChip({
  active,
  onClick,
  icon: Icon,
  label,
  value,
  tone = "neutral"
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "neutral" | "amber" | "sky" | "rose";
}) {
  const palette = {
    neutral: { activeBg: "bg-white/[0.10]", activeBorder: "border-white/30", activeText: "text-slate-100", inactiveDot: "text-slate-400" },
    amber: { activeBg: "bg-amber-500/15", activeBorder: "border-amber-500/40", activeText: "text-amber-100", inactiveDot: "text-amber-300" },
    sky: { activeBg: "bg-sky-500/15", activeBorder: "border-sky-500/40", activeText: "text-sky-100", inactiveDot: "text-sky-300" },
    rose: { activeBg: "bg-rose-500/15", activeBorder: "border-rose-500/40", activeText: "text-rose-100", inactiveDot: "text-rose-300" }
  }[tone];
  const cls = active
    ? `${palette.activeBg} ${palette.activeBorder} ${palette.activeText}`
    : "bg-white/[0.03] border-white/[0.06] text-slate-300 hover:border-white/[0.18]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${cls}`}
    >
      <Icon className={`h-3.5 w-3.5 ${active ? "" : palette.inactiveDot}`} />
      <span>{label}</span>
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-white/15" : "bg-white/[0.06]"}`}>
        {value}
      </span>
    </button>
  );
}
