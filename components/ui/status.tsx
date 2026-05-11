import { Badge } from "@/components/ui/badge";
import type { ApprovalStatus, EventStatus, ModuleStatus, RiskLevel } from "@/lib/types/core";

/** 风险等级英文 → 中文 */
const RISK_LABEL_CN: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险"
};

/** 状态枚举英文 → 中文（覆盖所有审批 / 财务 / 模块 / 事件状态） */
const STATUS_LABEL_CN: Record<string, string> = {
  // 通用
  active: "启用",
  disabled: "停用",
  success: "成功",
  failed: "失败",
  // 审批 / 财务流转
  draft: "草稿",
  pending: "待处理",
  pending_approval: "待审批",
  pending_manager: "待主管审批",
  pending_finance: "待财务审批",
  approved: "已批准",
  rejected: "已驳回",
  need_revision: "待修改",
  withdrawn: "已撤回",
  cancelled: "已取消",
  paid: "已付款",
  submitted: "已提交",
  // 事件 / agent / 任务
  new: "新建",
  processed: "已处理",
  running: "运行中",
  archived: "已归档",
  // 模块
  coming_soon: "即将上线"
};

/** 把任意 status 字符串翻成中文；找不到的就原样返回（向后兼容新增枚举）。 */
function translateStatus(value: string): string {
  return STATUS_LABEL_CN[value] ?? value;
}

export function RiskBadge({ value }: { value: RiskLevel }) {
  const variant = value === "critical" || value === "high" ? "danger" : value === "medium" ? "warning" : "success";
  return <Badge variant={variant}>{RISK_LABEL_CN[value] ?? value}</Badge>;
}

export function StatusBadge({ value }: { value: ApprovalStatus | EventStatus | ModuleStatus | string }) {
  const variant =
    value === "active" || value === "approved" || value === "paid" || value === "processed" || value === "success"
      ? "success"
      : value === "pending" || value === "pending_approval" || value === "draft" || value === "new" || value === "coming_soon" || value === "running" || value === "pending_manager" || value === "pending_finance" || value === "submitted"
        ? "warning"
        : value === "failed" || value === "rejected" || value === "cancelled" || value === "disabled" || value === "withdrawn"
          ? "danger"
          : value === "need_revision"
            ? "info"
            : "secondary";
  return <Badge variant={variant}>{translateStatus(value)}</Badge>;
}
