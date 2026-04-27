import { Badge } from "@/components/ui/badge";
import type { AgentPermissionLevel, RiskLevel } from "@/lib/types/core";

export function PermissionLevelBadge({ value }: { value: AgentPermissionLevel | string }) {
  const variant = value === "L4" || value === "L5" ? "danger" : value === "L3" ? "warning" : "info";
  return <Badge variant={variant}>{value}</Badge>;
}

export function RiskLevelHint({ level }: { level: AgentPermissionLevel | string }) {
  const text = {
    L1: "只读与建议，只能读取授权数据并生成分析。",
    L2: "内容生成，写入前必须由人类确认。",
    L3: "内部动作，需要负责人确认。",
    L4: "高风险动作，必须进入审批。",
    L5: "禁止自动执行，只能由人类执行。"
  }[level] ?? "按组织授权执行。";
  return <div className="text-xs text-muted-foreground">{text}</div>;
}

export function RiskBadge({ value }: { value: RiskLevel | string }) {
  const variant = value === "critical" || value === "high" ? "danger" : value === "medium" ? "warning" : "success";
  return <Badge variant={variant}>{value}</Badge>;
}
