import { getCurrentMember } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { FinanceRecord } from "@/lib/finance/types";

const financeAllRoles = new Set(["owner", "admin", "finance_lead"]);

export async function canManageFinance() {
  const member = await getCurrentMember();
  const role = member.role?.key ?? "member";
  return financeAllRoles.has(role) || (await hasPermission("finance.category.manage"));
}

export async function canApproveFinance() {
  const member = await getCurrentMember();
  if (member.role?.key === "agent") return false;
  return financeAllRoles.has(member.role?.key ?? "") || (await hasPermission("finance.approve"));
}

export async function canExportFinance() {
  const member = await getCurrentMember();
  if (member.role?.key === "agent") return false;
  return financeAllRoles.has(member.role?.key ?? "") || (await hasPermission("finance.export"));
}

export async function canViewAllFinance() {
  const member = await getCurrentMember();
  return financeAllRoles.has(member.role?.key ?? "") || (await hasPermission("finance.view_all"));
}

export async function canViewTeamFinance() {
  return (await canViewAllFinance()) || (await hasPermission("finance.view_team"));
}

export async function canViewFinanceRecord(record: Pick<FinanceRecord, "submitted_by" | "member_id">) {
  const member = await getCurrentMember();
  if (await canViewTeamFinance()) return true;
  return record.submitted_by === member.id || record.member_id === member.id;
}

export async function getFinanceScope() {
  const member = await getCurrentMember();
  if (await canViewAllFinance()) return { scope: "all" as const, member };
  if (await canViewTeamFinance()) return { scope: "team" as const, member };
  return { scope: "own" as const, member };
}
