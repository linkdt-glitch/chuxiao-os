"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight, Eye, FileImage, Files, Search, Sparkles, X } from "lucide-react";
import { approveFinanceRecordAction, rejectFinanceRecordAction } from "@/app/(app)/finance/actions";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RejectInlineButton } from "@/components/ui/reject-inline-button";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Textarea } from "@/components/ui/textarea";
import type { FinanceRecord, FinanceReceiptAttachment } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const typeLabel = {
  income: "收入",
  expense: "支出",
  reimbursement: "报销",
  transfer: "转账",
  refund: "退款",
  adjustment: "调整"
};

const riskRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

function money(amount: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 3
  }).format(Number(amount) || 0);
}

function fileSize(bytes: number) {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function avatarText(name?: string | null) {
  return (name || "成员").slice(0, 1).toUpperCase();
}

function attachmentUrl(file: FinanceReceiptAttachment) {
  return `/api/files/${file.id}?preview=1`;
}

function groupRecords(records: FinanceRecord[]) {
  const groups = new Map<string, {
    key: string;
    name: string;
    email?: string | null;
    records: FinanceRecord[];
    total: number;
    attachmentCount: number;
    highestRisk: FinanceRecord["risk_level"];
    missingAttachments: number;
  }>();

  for (const record of records) {
    const key = record.submitter?.id ?? record.submitted_by ?? record.member_id ?? "unknown";
    const current = groups.get(key) ?? {
      key,
      name: record.submitter?.display_name ?? "未指定人员",
      email: record.submitter?.email,
      records: [],
      total: 0,
      attachmentCount: 0,
      highestRisk: "low" as FinanceRecord["risk_level"],
      missingAttachments: 0
    };
    current.records.push(record);
    current.total += Number(record.amount) || 0;
    current.attachmentCount += record.attachments?.length ?? 0;
    current.missingAttachments += record.attachments?.length ? 0 : 1;
    if (riskRank[record.risk_level] > riskRank[current.highestRisk]) current.highestRisk = record.risk_level;
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) => {
    const riskScore = riskRank[b.highestRisk] - riskRank[a.highestRisk];
    if (riskScore !== 0) return riskScore;
    if (b.missingAttachments !== a.missingAttachments) return b.missingAttachments - a.missingAttachments;
    return b.total - a.total;
  });
}

function ReceiptPreview({ record }: { record: FinanceRecord }) {
  const attachments = record.attachments ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const active = attachments[Math.min(activeIndex, Math.max(attachments.length - 1, 0))];
  const hasFileDescription = record.description.includes("票据附件") || record.description.includes("IMG_");

  if (!attachments.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-amber-200 bg-amber-50/50 p-6 text-center">
        <div>
          <FileImage className="mx-auto mb-3 h-9 w-9 text-amber-600" />
          <div className="font-semibold text-amber-950">没有可预览票据</div>
          <p className="mt-2 text-sm text-amber-800">
            {hasFileDescription ? "这条记录描述里有票据文件名，但没有找到已关联的文件。后续新上传票据会直接显示预览。" : "审批前建议要求补充票据，或确认这笔费用无需附件。"}
          </p>
        </div>
      </div>
    );
  }

  const isPdf = active?.mime_type === "application/pdf";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">{active?.file_name}</div>
          <div className="text-xs text-muted-foreground">{active?.mime_type} · {fileSize(active?.size_bytes ?? 0)}</div>
        </div>
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={active ? attachmentUrl(active) : "#"} target="_blank" rel="noreferrer">新窗口</a>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setZoom((current) => Math.max(0.7, current - 0.1))}>缩小</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setZoom((current) => Math.min(1.7, current + 0.1))}>放大</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setRotation((current) => current + 90)}>旋转</Button>
      </div>
      <div className="flex min-h-[300px] items-center justify-center overflow-auto rounded-3xl border border-slate-200/80 bg-white/80 p-3">
        {isPdf ? (
          <iframe src={attachmentUrl(active)} className="h-[420px] w-full rounded-2xl" title={active.file_name} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachmentUrl(active)}
            alt={active.file_name}
            className="max-h-[460px] max-w-full rounded-2xl object-contain shadow-sm transition-transform"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        )}
      </div>
      {attachments.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {attachments.map((file, index) => (
            <button
              key={file.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "min-w-[120px] rounded-2xl border p-2 text-left text-xs transition",
                index === activeIndex ? "border-cyan-300 bg-cyan-50 text-cyan-950" : "border-slate-200 bg-white/70 text-muted-foreground"
              )}
            >
              <div className="truncate font-medium">{file.file_name}</div>
              <div>{fileSize(file.size_bytes)}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecordDetailPanel({
  record,
  onClose,
  compact = false
}: {
  record: FinanceRecord | null;
  onClose?: () => void;
  compact?: boolean;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const quickReasons = ["票据缺失或不清晰", "用途说明不足", "金额需要复核", "不符合报销标准"];

  if (!record) {
    return (
      <div className="rounded-3xl border border-white/80 bg-white/72 p-6 text-center text-sm text-muted-foreground shadow-[0_18px_52px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        选择一条审批记录后，这里会显示票据、金额、类目和审批操作。
      </div>
    );
  }

  return (
    <aside className={cn("rounded-3xl border border-white/80 bg-white/78 p-4 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-xl", compact && "min-h-screen rounded-none border-0")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={record.record_type === "reimbursement" ? "warning" : "secondary"}>{typeLabel[record.record_type]}</Badge>
            <StatusBadge value={record.status} />
            <RiskBadge value={record.risk_level} />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">{record.description}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{record.record_no} · {record.occurred_at}</p>
        </div>
        {onClose ? (
          <Button type="button" variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <ReceiptPreview record={record} />

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-slate-50/80 p-3">
          <div className="text-xs text-muted-foreground">金额</div>
          <div className="mt-1 text-lg font-semibold text-slate-950">{money(record.amount, record.currency)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50/80 p-3">
          <div className="text-xs text-muted-foreground">经手人</div>
          <div className="mt-1 font-semibold text-slate-950">{record.submitter?.display_name ?? "-"}</div>
        </div>
        <div className="rounded-2xl bg-slate-50/80 p-3">
          <div className="text-xs text-muted-foreground">类目</div>
          <div className="mt-1 font-semibold text-slate-950">{[record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类"}</div>
        </div>
        <div className="rounded-2xl bg-slate-50/80 p-3">
          <div className="text-xs text-muted-foreground">账户</div>
          <div className="mt-1 font-semibold text-slate-950">{record.account?.name ?? "未选择"}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 p-3">
        <div className="text-xs font-semibold text-muted-foreground">说明与备注</div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{record.metadata?.notes ? `${record.description}\n${String(record.metadata.notes)}` : record.description}</p>
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/45 p-3">
        <form action={approveFinanceRecordAction}>
          <input type="hidden" name="id" value={record.id} />
          <ConfirmSubmitButton confirmText="确认批准这条财务审批？" className="w-full">
            <Check className="h-4 w-4" />批准这笔
          </ConfirmSubmitButton>
        </form>
        <form action={rejectFinanceRecordAction} className="space-y-2">
          <input type="hidden" name="id" value={record.id} />
          <Label>驳回原因</Label>
          <Textarea name="reason" required value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="写清楚驳回原因，方便员工补充或修改。" />
          <div className="flex flex-wrap gap-2">
            {quickReasons.map((reason) => (
              <Button key={reason} type="button" size="sm" variant="outline" onClick={() => setRejectReason(reason)}>
                {reason}
              </Button>
            ))}
          </div>
          <Button type="submit" variant="destructive" className="w-full">驳回这笔</Button>
        </form>
      </div>
    </aside>
  );
}

export function FinanceApprovalWorkbench({
  records,
  showActions = true
}: {
  records: FinanceRecord[];
  showActions?: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [activeGroupKey, setActiveGroupKey] = useState("");
  const [activeRecordId, setActiveRecordId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mobileDetailRecord, setMobileDetailRecord] = useState<FinanceRecord | null>(null);

  const filteredRecords = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => [
      record.record_no,
      record.description,
      record.submitter?.display_name,
      record.submitter?.email,
      record.category?.name,
      record.subcategory?.name,
      record.counterparty_name,
      record.project_name
    ].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [records, keyword]);

  const groups = useMemo(() => groupRecords(filteredRecords), [filteredRecords]);
  const activeGroup = groups.find((group) => group.key === activeGroupKey) ?? groups[0];
  const activeRecord = activeGroup?.records.find((record) => record.id === activeRecordId) ?? activeGroup?.records[0] ?? null;
  const totalAmount = filteredRecords.reduce((sum, record) => sum + Number(record.amount), 0);
  const attachmentCount = filteredRecords.reduce((sum, record) => sum + (record.attachments?.length ?? 0), 0);
  const selectedTotal = records
    .filter((record) => selectedIds.includes(record.id))
    .reduce((sum, record) => sum + Number(record.amount), 0);
  const missingAttachmentCount = filteredRecords.filter((record) => !(record.attachments?.length)).length;

  function openGroup(key: string) {
    setActiveGroupKey(key);
    setActiveRecordId("");
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleGroup(ids: string[]) {
    setSelectedIds((current) => {
      const allSelected = ids.every((id) => current.includes(id));
      return allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]));
    });
  }

  if (!records.length) {
    return <EmptyState title="暂无待处理财务审批" description="员工提交报销、AI 记账或手动记账勾选提交审批后，会按人员出现在这里。" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-white/90 via-cyan-50/78 to-indigo-50/72 p-4 shadow-[0_18px_56px_rgba(15,23,42,0.075)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/75 px-3 py-1 text-xs font-medium text-cyan-800">
              <Sparkles className="h-3.5 w-3.5" />
              财务审批驾驶台
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">按报销人员查看，先看票据再审批</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              待审记录按员工自动归组，支持批量通过、逐笔查看票据、快速驳回并填写原因。适合每天集中处理报销和支出审批。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
            <div className="rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm">
              <div className="text-xs text-muted-foreground">待审人员</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{groups.length}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm">
              <div className="text-xs text-muted-foreground">待审金额</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{money(totalAmount)}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/72 p-3 shadow-sm">
              <div className="text-xs text-muted-foreground">票据附件</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{attachmentCount}</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/75 p-3 shadow-sm">
              <div className="text-xs text-amber-700">缺票据记录</div>
              <div className="mt-1 text-2xl font-semibold text-amber-950">{missingAttachmentCount}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索员工、编号、供应商、说明、类目" className="pl-9" />
          </label>
          {showActions && selectedIds.length ? (
            <form action={approveFinanceRecordAction} className="flex flex-col gap-2 rounded-2xl border border-cyan-200 bg-cyan-50/80 p-2 sm:flex-row sm:items-center">
              <span className="px-2 text-sm font-medium text-cyan-950">已选 {selectedIds.length} 笔 · {money(selectedTotal)}</span>
              {selectedIds.map((id) => <input key={id} type="hidden" name="id" value={id} />)}
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])}>取消</Button>
              <ConfirmSubmitButton confirmText={`确认批量批准 ${selectedIds.length} 笔财务审批？`} size="sm">
                <Check className="h-4 w-4" />批量通过
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      {!filteredRecords.length ? (
        <EmptyState title="没有匹配的审批记录" description="换一个关键词试试，或清空搜索条件。" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
          <div className="space-y-2 xl:sticky xl:top-24 xl:self-start">
            {groups.map((group) => {
              const isActive = activeGroup?.key === group.key;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => openGroup(group.key)}
                  className={cn(
                    "w-full rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    isActive ? "border-cyan-300 bg-cyan-50/82" : "border-white/80 bg-white/72"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-indigo-100 text-base font-semibold text-cyan-900">
                      {avatarText(group.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-semibold text-slate-950">{group.name}</div>
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition", isActive && "rotate-90 text-cyan-700")} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{group.email ?? "无邮箱"}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="warning">{group.records.length} 笔待审</Badge>
                        <RiskBadge value={group.highestRisk} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">合计</span>
                        <span className="font-semibold text-slate-950">{money(group.total)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Files className="h-3.5 w-3.5" />票据 {group.attachmentCount}</span>
                        {group.missingAttachments ? <span className="text-amber-700">缺票据 {group.missingAttachments}</span> : null}
                        <span>点击查看</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {activeGroup ? (
              <div className="rounded-3xl border border-white/80 bg-white/74 p-4 shadow-[0_18px_52px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{activeGroup.name} 的待审批</h3>
                    <p className="text-sm text-muted-foreground">{activeGroup.records.length} 笔 · {money(activeGroup.total)} · {activeGroup.attachmentCount} 个票据附件</p>
                  </div>
                  {showActions ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => toggleGroup(activeGroup.records.map((record) => record.id))}>选择本组</Button>
                      <form action={approveFinanceRecordAction}>
                        {activeGroup.records.map((record) => <input key={record.id} type="hidden" name="id" value={record.id} />)}
                        <ConfirmSubmitButton confirmText={`确认批准 ${activeGroup.name} 的全部待审记录？`} size="sm">
                          <Check className="h-4 w-4" />本组全通过
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeGroup?.records.map((record) => {
              const isActive = activeRecord?.id === record.id;
              const hasAttachment = Boolean(record.attachments?.length);
              return (
                <div
                  key={record.id}
                  className={cn(
                    "rounded-3xl border bg-white/74 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.055)] backdrop-blur-xl transition",
                    isActive ? "border-cyan-300 ring-2 ring-cyan-100" : "border-white/80"
                  )}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      {showActions ? (
                        <input
                          aria-label="选择财务审批"
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleSelected(record.id)}
                          className="mt-1 h-4 w-4 shrink-0"
                        />
                      ) : null}
                      <button type="button" className="min-w-0 text-left" onClick={() => setActiveRecordId(record.id)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={record.record_type === "reimbursement" ? "warning" : "secondary"}>{typeLabel[record.record_type]}</Badge>
                          <StatusBadge value={record.status} />
                          <RiskBadge value={record.risk_level} />
                          {hasAttachment ? <Badge variant="success"><FileImage className="h-3 w-3" />{record.attachments?.length} 票据</Badge> : <Badge variant="warning"><AlertTriangle className="h-3 w-3" />无票据</Badge>}
                        </div>
                        <div className="mt-2 font-semibold text-slate-950">{record.description}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{record.record_no} · {record.occurred_at} · {[record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类"}</div>
                      </button>
                    </div>
                    <div className="flex flex-col gap-3 lg:items-end">
                      <div className="text-2xl font-semibold text-slate-950">{money(record.amount, record.currency)}</div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => { setActiveRecordId(record.id); setMobileDetailRecord(record); }}>
                          <Eye className="h-4 w-4" />详情
                        </Button>
                        {showActions ? (
                          <>
                            <form action={approveFinanceRecordAction}>
                              <input type="hidden" name="id" value={record.id} />
                              <ConfirmSubmitButton confirmText="确认批准这条财务审批？" size="sm" variant="secondary">
                                批准
                              </ConfirmSubmitButton>
                            </form>
                            <RejectInlineButton
                              action={rejectFinanceRecordAction}
                              idValue={record.id}
                              idName="id"
                              reasonName="reason"
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

          <div className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
            <RecordDetailPanel record={activeRecord} />
          </div>
        </div>
      )}

      {mobileDetailRecord ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white xl:hidden">
          <RecordDetailPanel record={mobileDetailRecord} onClose={() => setMobileDetailRecord(null)} compact />
        </div>
      ) : null}
    </div>
  );
}
