"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calendar, Check, Eye, FileImage, Search, X } from "lucide-react";
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

/**
 * 按发生日期分组审批记录。
 *
 * 设计意图：
 *   - 老板/管理员每天的审批节奏是"今天有几条 / 昨天有几条"，
 *     而不是"某员工有几条" —— 把日期作为最外层组织单元，符合
 *     真实使用习惯（每天清一次审批）。
 *   - 组内按风险 → 金额倒序，把高风险/大金额的优先暴露。
 *   - 顶层按日期倒序（最新的一天放最上面）。
 */
function groupRecordsByDate(records: FinanceRecord[]) {
  const map = new Map<string, {
    date: string;
    records: FinanceRecord[];
    total: number;
    highestRisk: FinanceRecord["risk_level"];
    missingAttachments: number;
    submitters: Set<string>;
  }>();

  for (const record of records) {
    const date = (record.occurred_at || "").slice(0, 10) || "未知日期";
    const current = map.get(date) ?? {
      date,
      records: [],
      total: 0,
      highestRisk: "low" as FinanceRecord["risk_level"],
      missingAttachments: 0,
      submitters: new Set<string>()
    };
    current.records.push(record);
    current.total += Number(record.amount) || 0;
    current.missingAttachments += record.attachments?.length ? 0 : 1;
    if (record.submitter?.display_name) current.submitters.add(record.submitter.display_name);
    if (riskRank[record.risk_level] > riskRank[current.highestRisk]) {
      current.highestRisk = record.risk_level;
    }
    map.set(date, current);
  }

  for (const group of map.values()) {
    group.records.sort((a, b) => {
      const r = riskRank[b.risk_level] - riskRank[a.risk_level];
      if (r !== 0) return r;
      return Number(b.amount) - Number(a.amount);
    });
  }

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function formatDateHeader(dateStr: string): { label: string; sub: string; isToday: boolean } {
  if (!dateStr || dateStr === "未知日期") return { label: "未知日期", sub: "", isToday: false };
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const target = new Date(`${dateStr}T00:00:00`);
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekDays[target.getDay()] ?? "";
  const monthDay = `${target.getMonth() + 1} 月 ${target.getDate()} 日`;

  if (dateStr === todayStr) return { label: "今天", sub: `${monthDay} · ${weekday}`, isToday: true };
  if (dateStr === yesterdayStr) return { label: "昨天", sub: `${monthDay} · ${weekday}`, isToday: false };
  return { label: monthDay, sub: weekday, isToday: false };
}

/** 列表行里展示的小型票据缩略图 —— 让审批者第一眼判断"有没有票 / 是图还是 PDF"。 */
function ReceiptThumb({ record, onPreview }: { record: FinanceRecord; onPreview: () => void }) {
  const attachments = record.attachments ?? [];

  if (!attachments.length) {
    return (
      <button
        type="button"
        onClick={onPreview}
        className="flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50/70 text-[10px] font-medium text-amber-700 transition hover:border-amber-400 hover:bg-amber-100/60"
        title="无票据，点击查看详情"
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="mt-0.5">无票据</span>
      </button>
    );
  }

  const first = attachments[0];
  const isPdf = first.mime_type === "application/pdf";

  return (
    <button
      type="button"
      onClick={onPreview}
      className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-orange-300 hover:shadow-md"
      title={`查看票据 (${attachments.length} 张)`}
    >
      {isPdf ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-rose-50 text-rose-600">
          <FileImage className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-semibold">PDF</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachmentUrl(first)}
          alt={first.file_name}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      )}
      {attachments.length > 1 ? (
        <span className="absolute bottom-1 right-1 rounded-full bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          +{attachments.length - 1}
        </span>
      ) : null}
    </button>
  );
}

/** 票据全屏预览（详情抽屉里使用），支持缩放 / 旋转 / 多张切换。 */
function ReceiptPreview({ record }: { record: FinanceRecord }) {
  const attachments = record.attachments ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const active = attachments[Math.min(activeIndex, Math.max(attachments.length - 1, 0))];
  const hasFileDescription = record.description.includes("票据附件") || record.description.includes("IMG_");

  if (!attachments.length) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-center">
        <div>
          <FileImage className="mx-auto mb-3 h-9 w-9 text-amber-600" />
          <div className="font-semibold text-amber-900">没有可预览票据</div>
          <p className="mt-2 text-sm text-amber-800">
            {hasFileDescription
              ? "记录描述里有票据文件名，但没有找到已关联的文件，建议要求员工补传。"
              : "审批前建议要求补充票据，或确认这笔费用无需附件。"}
          </p>
        </div>
      </div>
    );
  }

  const isPdf = active?.mime_type === "application/pdf";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{active?.file_name}</div>
          <div className="text-xs text-slate-500">{active?.mime_type} · {fileSize(active?.size_bytes ?? 0)}</div>
        </div>
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={active ? attachmentUrl(active) : "#"} target="_blank" rel="noreferrer">原图</a>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setZoom((c) => Math.max(0.7, c - 0.1))}>缩小</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setZoom((c) => Math.min(1.7, c + 0.1))}>放大</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setRotation((c) => c + 90)}>旋转</Button>
      </div>
      <div className="flex min-h-[280px] items-center justify-center overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {isPdf ? (
          <iframe src={attachmentUrl(active)} className="h-[420px] w-full rounded-xl" title={active.file_name} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachmentUrl(active)}
            alt={active.file_name}
            className="max-h-[420px] max-w-full rounded-xl object-contain shadow-sm transition-transform"
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
                "min-w-[120px] rounded-xl border p-2 text-left text-xs transition",
                index === activeIndex ? "border-orange-300 bg-orange-50 text-orange-900" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
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

/** 详情抽屉的内容 —— 申报人 + 具体事项 + 票据 + 批准/驳回（含原因）。 */
function RecordDetailPanel({
  record,
  onClose
}: {
  record: FinanceRecord | null;
  onClose?: () => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const quickReasons = ["票据缺失或不清晰", "用途说明不足", "金额需要复核", "不符合报销标准"];

  if (!record) return null;

  return (
    <div className="flex h-full flex-col">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={record.record_type === "reimbursement" ? "warning" : "secondary"}>
              {typeLabel[record.record_type]}
            </Badge>
            <StatusBadge value={record.status} />
            <RiskBadge value={record.risk_level} />
          </div>
          <h3 className="mt-2 text-[18px] font-semibold leading-tight tracking-tight text-slate-900">
            {record.description}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{record.record_no} · {record.occurred_at}</p>
        </div>
        {onClose ? (
          <Button type="button" variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* 主体可滚动 */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {/* 申报人 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">申报人</div>
          <div className="mt-2 flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-orange-700"
              style={{ background: "linear-gradient(135deg, #fed7aa 0%, #fde68a 100%)" }}
            >
              {avatarText(record.submitter?.display_name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-slate-900">
                {record.submitter?.display_name ?? "未指定"}
              </div>
              <div className="truncate text-[12px] text-slate-500">{record.submitter?.email ?? "—"}</div>
            </div>
          </div>
        </section>

        {/* 具体事项 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">具体事项</div>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">
            {record.metadata?.notes ? `${record.description}\n${String(record.metadata.notes)}` : record.description}
          </p>
        </section>

        {/* 金额 + 类目 + 账户 grid */}
        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-medium text-slate-500">金额</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums text-slate-900">{money(record.amount, record.currency)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-medium text-slate-500">类目</div>
            <div className="mt-1 truncate text-[14px] font-semibold text-slate-900">
              {[record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类"}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-medium text-slate-500">账户</div>
            <div className="mt-1 truncate text-[14px] font-semibold text-slate-900">{record.account?.name ?? "未选择"}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-medium text-slate-500">商家 / 项目</div>
            <div className="mt-1 truncate text-[14px] font-semibold text-slate-900">
              {record.counterparty_name || record.project_name || "—"}
            </div>
          </div>
        </section>

        {/* 票据 */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">票据 / 截图</div>
            <div className="text-[12px] text-slate-500">{record.attachments?.length ?? 0} 张</div>
          </div>
          <ReceiptPreview record={record} />
        </section>
      </div>

      {/* 底部操作栏：批准 / 驳回 + 原因 */}
      <div className="space-y-3 border-t border-slate-200 bg-orange-50/40 p-5">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-orange-700">是否批准 · 写清原因</div>
        <form action={approveFinanceRecordAction}>
          <input type="hidden" name="id" value={record.id} />
          <ConfirmSubmitButton confirmText="确认批准这条财务审批？" className="w-full">
            <Check className="h-4 w-4" />批准这笔
          </ConfirmSubmitButton>
        </form>
        <form action={rejectFinanceRecordAction} className="space-y-2">
          <input type="hidden" name="id" value={record.id} />
          <Label className="text-[12px] font-semibold text-slate-700">驳回原因（员工会看到）</Label>
          <Textarea
            name="reason"
            required
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="写清楚驳回原因，方便员工补充或修改。"
            rows={3}
          />
          <div className="flex flex-wrap gap-1.5">
            {quickReasons.map((reason) => (
              <Button key={reason} type="button" size="sm" variant="outline" onClick={() => setRejectReason(reason)}>
                {reason}
              </Button>
            ))}
          </div>
          <Button type="submit" variant="destructive" className="w-full">驳回这笔</Button>
        </form>
      </div>
    </div>
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerRecord, setDrawerRecord] = useState<FinanceRecord | null>(null);

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

  const dayGroups = useMemo(() => groupRecordsByDate(filteredRecords), [filteredRecords]);
  const totalAmount = filteredRecords.reduce((sum, record) => sum + Number(record.amount), 0);
  const attachmentCount = filteredRecords.reduce((sum, record) => sum + (record.attachments?.length ?? 0), 0);
  const missingAttachmentCount = filteredRecords.filter((record) => !(record.attachments?.length)).length;
  const selectedTotal = records
    .filter((record) => selectedIds.includes(record.id))
    .reduce((sum, record) => sum + Number(record.amount), 0);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleDay(ids: string[]) {
    setSelectedIds((current) => {
      const allSelected = ids.every((id) => current.includes(id));
      return allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]));
    });
  }

  if (!records.length) {
    return (
      <EmptyState
        title="暂无待处理财务审批"
        description="员工提交报销 / AI 记账 / 手动记账后，会按发生日期出现在这里，每天集中处理一次即可。"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部统计 chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Stat label="待审日期" value={dayGroups.length.toString()} />
        <Stat label="待审笔数" value={filteredRecords.length.toString()} />
        <Stat label="待审金额" value={money(totalAmount)} accent="amber" />
        <Stat label="票据附件" value={attachmentCount.toString()} />
        {missingAttachmentCount > 0 ? (
          <Stat label="缺票据" value={missingAttachmentCount.toString()} accent="rose" />
        ) : null}
      </div>

      {/* 搜索 + 批量 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索员工、描述、商家、类目..."
            className="pl-9"
          />
        </label>
        {showActions && selectedIds.length ? (
          <form action={approveFinanceRecordAction} className="ml-auto flex flex-wrap items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[13px] text-emerald-800">
            <span className="font-medium">已选 {selectedIds.length} 笔 · {money(selectedTotal)}</span>
            {selectedIds.map((id) => <input key={id} type="hidden" name="id" value={id} />)}
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])}>取消</Button>
            <ConfirmSubmitButton confirmText={`确认批量批准 ${selectedIds.length} 笔财务审批？`} size="sm">
              <Check className="h-4 w-4" />批量通过
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>

      {!filteredRecords.length ? (
        <EmptyState title="没有匹配的审批记录" description="换一个关键词试试，或清空搜索条件。" />
      ) : (
        <div className="space-y-6">
          {dayGroups.map((day) => {
            const header = formatDateHeader(day.date);
            const ids = day.records.map((r) => r.id);
            const allDaySelected = showActions && ids.length > 0 && ids.every((id) => selectedIds.includes(id));
            return (
              <section key={day.date} className="space-y-2">
                {/* 日期头 */}
                <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-2">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold",
                        header.isToday ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700"
                      )}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {header.label}
                    </span>
                    <span className="font-mono text-[12px] text-slate-500">{header.sub}</span>
                    <span className="text-[13px] text-slate-600">·</span>
                    <span className="text-[13px] text-slate-600">
                      {day.records.length} 笔 · {day.submitters.size} 人
                    </span>
                    <span className="font-semibold tabular-nums text-[14px] text-slate-900">
                      {money(day.total)}
                    </span>
                    {day.missingAttachments > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        缺票据 {day.missingAttachments}
                      </span>
                    ) : null}
                  </div>
                  {showActions ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button type="button" variant="outline" size="sm" onClick={() => toggleDay(ids)}>
                        {allDaySelected ? "取消整天" : "选中整天"}
                      </Button>
                      <form action={approveFinanceRecordAction}>
                        {ids.map((id) => <input key={id} type="hidden" name="id" value={id} />)}
                        <ConfirmSubmitButton confirmText={`确认批准 ${header.label} 全部 ${ids.length} 笔？`} size="sm">
                          <Check className="h-4 w-4" />整天通过
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  ) : null}
                </header>

                {/* 卡片列表 */}
                <div className="space-y-2">
                  {day.records.map((record) => {
                    const hasAttachment = Boolean(record.attachments?.length);
                    const isSelected = selectedIds.includes(record.id);
                    return (
                      <article
                        key={record.id}
                        className={cn(
                          "group relative rounded-xl border bg-white p-4 transition hover:border-orange-200 hover:shadow-md",
                          isSelected ? "border-orange-300 ring-1 ring-orange-200" : "border-slate-200"
                        )}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                          {/* 申报人 */}
                          <div className="flex shrink-0 items-start gap-3">
                            {showActions ? (
                              <input
                                aria-label="选择财务审批"
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelected(record.id)}
                                className="mt-3 h-4 w-4 shrink-0 accent-orange-500"
                              />
                            ) : null}
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-orange-700"
                              style={{ background: "linear-gradient(135deg, #fed7aa 0%, #fde68a 100%)" }}
                            >
                              {avatarText(record.submitter?.display_name)}
                            </div>
                            <div className="min-w-0 lg:w-32">
                              <div className="truncate text-[14px] font-semibold text-slate-900">
                                {record.submitter?.display_name ?? "未指定"}
                              </div>
                              <div className="mt-0.5 truncate text-[11px] text-slate-500">
                                {record.submitter?.email ?? "—"}
                              </div>
                            </div>
                          </div>

                          {/* 具体事项 */}
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setDrawerRecord(record)}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant={record.record_type === "reimbursement" ? "warning" : "secondary"}>
                                {typeLabel[record.record_type]}
                              </Badge>
                              <RiskBadge value={record.risk_level} />
                              {hasAttachment ? (
                                <Badge variant="success">
                                  <FileImage className="h-3 w-3" />
                                  {record.attachments?.length} 票据
                                </Badge>
                              ) : (
                                <Badge variant="warning">
                                  <AlertTriangle className="h-3 w-3" />无票据
                                </Badge>
                              )}
                            </div>
                            <h4 className="mt-1.5 line-clamp-2 text-[15px] font-medium leading-snug text-slate-900">
                              {record.description}
                            </h4>
                            <div className="mt-1 truncate text-[12px] text-slate-500">
                              {record.record_no}
                              {" · "}
                              {[record.category?.name, record.subcategory?.name].filter(Boolean).join(" / ") || "未分类"}
                              {record.counterparty_name ? ` · ${record.counterparty_name}` : ""}
                            </div>
                          </button>

                          {/* 票据缩略 + 金额 + 操作 */}
                          <div className="flex shrink-0 flex-row items-center gap-3 lg:flex-row-reverse lg:items-start">
                            <div className="flex flex-col items-end gap-2 lg:min-w-[180px]">
                              <div className="text-[20px] font-semibold tabular-nums text-slate-900">
                                {money(record.amount, record.currency)}
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <Button type="button" size="sm" variant="outline" onClick={() => setDrawerRecord(record)}>
                                  <Eye className="h-3.5 w-3.5" />详情
                                </Button>
                                {showActions ? (
                                  <>
                                    <form action={approveFinanceRecordAction}>
                                      <input type="hidden" name="id" value={record.id} />
                                      <ConfirmSubmitButton confirmText="确认批准这条财务审批？" size="sm">
                                        <Check className="h-3.5 w-3.5" />通过
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
                            <ReceiptThumb record={record} onPreview={() => setDrawerRecord(record)} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* 详情抽屉 */}
      {drawerRecord ? (
        <div className="fixed inset-0 z-50 flex">
          <div
            role="presentation"
            aria-hidden
            className="flex-1 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDrawerRecord(null)}
          />
          <div className="h-full w-full overflow-hidden bg-white shadow-2xl sm:max-w-[560px]">
            <RecordDetailPanel record={drawerRecord} onClose={() => setDrawerRecord(null)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 顶部用的紧凑 stat chip。light 主题。 */
function Stat({
  label,
  value,
  accent = "neutral"
}: {
  label: string;
  value: string;
  accent?: "neutral" | "amber" | "rose";
}) {
  const palette = {
    neutral: { dot: "bg-slate-400", border: "border-slate-200", bg: "bg-white", labelClr: "text-slate-500", valClr: "text-slate-900" },
    amber: { dot: "bg-amber-500", border: "border-amber-200", bg: "bg-amber-50", labelClr: "text-amber-700", valClr: "text-amber-900" },
    rose: { dot: "bg-rose-500", border: "border-rose-200", bg: "bg-rose-50", labelClr: "text-rose-700", valClr: "text-rose-900" }
  }[accent];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] tabular-nums ${palette.border} ${palette.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
      <span className={palette.labelClr}>{label}</span>
      <span className={`font-semibold ${palette.valClr}`}>{value}</span>
    </span>
  );
}
