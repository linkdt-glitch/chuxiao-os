import { Badge } from "@/components/ui/badge";
import type { ApprovalStatus, EventStatus, ModuleStatus, RiskLevel } from "@/lib/types/core";

export function RiskBadge({ value }: { value: RiskLevel }) {
  const variant = value === "critical" || value === "high" ? "danger" : value === "medium" ? "warning" : "success";
  return <Badge variant={variant}>{value}</Badge>;
}

export function StatusBadge({ value }: { value: ApprovalStatus | EventStatus | ModuleStatus | string }) {
  const variant =
    value === "active" || value === "approved" || value === "paid" || value === "processed" || value === "success"
      ? "success"
      : value === "pending" || value === "pending_approval" || value === "draft" || value === "new" || value === "coming_soon" || value === "running"
        ? "warning"
        : value === "failed" || value === "rejected" || value === "cancelled" || value === "disabled"
          ? "danger"
          : "secondary";
  return <Badge variant={variant}>{value}</Badge>;
}
