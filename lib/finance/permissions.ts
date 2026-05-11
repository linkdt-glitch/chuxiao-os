import { getCurrentMember } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { FinanceRecord } from "@/lib/finance/types";

const financeAllRoles = new Set(["owner", "admin"]);

/**
 * 从 member 里安全取出 role.key。
 *
 * 兼容三种形态（Supabase nested join 在不同 FK shape 下行为不一致）：
 *   - role 是单个对象：{ key: "owner", ... }     → 取 key
 *   - role 是数组：    [{ key: "owner", ... }]   → 取 [0].key
 *   - role 是 null / undefined                   → 返回 ""
 *
 * 之前所有 helper 直接 member.role?.key，如果 Supabase 返回的是数组，
 * 永远拿到 undefined，权限检查全部失效（owner 自动入账等隐性 bug）。
 */
function readRoleKey(member: { role?: unknown } | null | undefined): string {
  try {
    const role = member?.role;
    if (!role) return "";
    if (Array.isArray(role)) {
      return (role[0] as { key?: string } | undefined)?.key ?? "";
    }
    return (role as { key?: string }).key ?? "";
  } catch {
    return "";
  }
}

export async function canManageFinance() {
  const member = await getCurrentMember();
  const role = readRoleKey(member) || "member";
  return financeAllRoles.has(role) || (await hasPermission("finance.category.manage"));
}

export async function canApproveFinance() {
  const member = await getCurrentMember();
  const role = readRoleKey(member);
  if (role === "agent") return false;
  return financeAllRoles.has(role) || (await hasPermission("finance.approve"));
}

export async function canExportFinance() {
  const member = await getCurrentMember();
  const role = readRoleKey(member);
  if (role === "agent") return false;
  return financeAllRoles.has(role) || (await hasPermission("finance.export"));
}

export async function canViewAllFinance() {
  const member = await getCurrentMember();
  return financeAllRoles.has(readRoleKey(member)) || (await hasPermission("finance.view_all"));
}

/**
 * 是否可以直接记录公司「收入」类型的财务记录。
 *
 * 业务规则（owner 决定）：
 *   - owner / admin → 可以（公司收款入账由他们登记，财务/老板的职责）
 *   - 其他角色（manager / member / agent）→ 不可
 *     员工只记自己花的钱（支出 / 报销 / 转账），公司收入不归他们登记。
 *
 * 影响范围：
 *   1. 手动记账表单：record_type 下拉去掉「收入」
 *   2. AI 一句话记账确认表单：同上
 *   3. 类目下拉：去掉所有 type="income" 类目
 *   4. 服务端 createFinanceRecord：直接拒绝 record_type="income" 的提交
 *   5. 流水列表筛选：type 选项去掉「收入」
 */
export async function canRecordCompanyIncome() {
  const member = await getCurrentMember();
  const role = readRoleKey(member);
  if (role === "agent") return false;
  return financeAllRoles.has(role);
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
