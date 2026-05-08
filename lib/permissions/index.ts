import { getCurrentMember } from "@/lib/auth";

const rolePermissionMap: Record<string, string[]> = {
  owner: ["*"],
  admin: [
    // 注意：dashboard.read 仅限 owner —— 老板驾驶舱是创始人专属视图
    "organization.manage",
    "modules.manage",
    "approvals.manage",
    "logs.read",
    "events.read",
    "files.manage",
    "ai.manage",
    "agents.manage",
    "finance.view",
    "finance.create",
    "finance.update",
    "finance.delete",
    "finance.approve",
    "finance.export",
    "finance.view_all",
    "finance.category.manage",
    "finance.account.manage",
    "finance.ai_parse",
    "finance.expense.view",
    "finance.expense.create",
    "finance.expense.update",
    "finance.expense.approve",
    "finance.expense.pay",
    "finance.expense.manage",
    "finance.expense.export",
    "projects.view",
    "projects.manage",
    "tasks.view",
    "tasks.create",
    "tasks.update",
    "tasks.delete",
    "tasks.comment",
    "tasks.files",
    "tasks.archive",
    "governance.view",
    "governance.manage",
    "risk_rule.view",
    "risk_rule.manage",
    "knowledge.view",
    "knowledge.manage",
    "sop.view",
    "sop.create",
    "sop.update",
    "review.view",
    "review.create",
    "review.update",
    "evolution.view",
    "evolution.manage",
    "feedback.view",
    "feedback.create",
    "review_record.view",
    "review_record.create",
    "sop_record.view",
    "sop_record.create",
    "improvement.view",
    "improvement.manage",
    "energy.view",
    "energy.manage",
    "ai_workforce.view",
    "ai_workforce.manage",
    "agent.view",
    "agent.manage",
    "agent.create",
    "agent.update",
    "agent.pause",
    "agent.archive",
    "agent.run",
    "agent.view_logs",
    "prompt.view",
    "prompt.manage",
    "prompt.create",
    "prompt.update",
    "prompt.publish",
    "prompt.archive",
    "prompt.test",
    "ai_confirmation.view",
    "ai_confirmation.approve",
    "ai_confirmation.reject",
    "ai_feedback.create",
    "ai_feedback.view"
  ],
  manager: [
    // 注意：dashboard.read 仅限 owner
    "approvals.manage",
    "logs.read",
    "events.read",
    "files.manage",
    "agents.manage",
    "finance.view",
    "finance.create",
    "finance.update",
    "finance.export",
    "finance.view_team",
    "finance.ai_parse",
    "finance.expense.view",
    "finance.expense.create",
    "finance.expense.update",
    "projects.view",
    "projects.manage",
    "tasks.view",
    "tasks.create",
    "tasks.update",
    "tasks.comment",
    "tasks.files",
    "tasks.archive",
    "governance.view",
    "knowledge.view",
    "sop.view",
    "sop.create",
    "sop.update",
    "review.view",
    "review.create",
    "review.update",
    "evolution.view",
    "feedback.view",
    "feedback.create",
    "review_record.view",
    "review_record.create",
    "sop_record.view",
    "sop_record.create",
    "improvement.view",
    "energy.view",
    "ai_workforce.view",
    "agent.view",
    "agent.create",
    "agent.update",
    "agent.pause",
    "agent.archive",
    "agent.run",
    "agent.view_logs",
    "prompt.view",
    "prompt.create",
    "prompt.update",
    "prompt.publish",
    "prompt.archive",
    "prompt.test",
    "ai_confirmation.view",
    "ai_confirmation.approve",
    "ai_confirmation.reject",
    "ai_feedback.create",
    "ai_feedback.view"
  ],
  /**
   * 普通员工（member）只能看到：
   *   业务模块: 任务计划中心 / AI 风暴创新实验室 / 财务能量中心
   *   平台:     组织大脑库（knowledge）
   *   其他:     文件中心
   * 不显示：老板驾驶舱 / 组织护航盾 / 进化 / 能量 / 系统设置 / 组织管理
   */
  member: [
    "approvals.create",
    "files.manage",
    // 业务模块 - 财务能量中心
    "finance.view",
    "finance.create",
    "finance.update",
    "finance.export",
    "finance.ai_parse",
    "finance.expense.view",
    "finance.expense.create",
    "finance.expense.update",
    // 业务模块 - 任务计划中心
    "projects.view",
    "tasks.view",
    "tasks.comment",
    "tasks.files",
    // 业务模块 - AI 风暴创新实验室
    "ai_workforce.view",
    "agent.view",
    "agent.run",
    "prompt.view",
    "prompt.create",
    "prompt.test",
    "ai_feedback.create",
    // 平台 - 组织大脑库
    "knowledge.view",
    "sop.view",
    "review.view"
    // 故意不给：dashboard.read / governance.view / evolution.view / energy.view
    // 故意不给：feedback.* / sop_record.* / review_record.*（属于进化/能量子能力）
  ],
  agent: ["files.read", "finance.view", "projects.view", "tasks.view", "knowledge.view", "evolution.view", "feedback.create", "ai_workforce.view", "agent.view", "agent.run", "ai_feedback.create"]
};

export async function hasPermission(permissionKey: string) {
  const member = await getCurrentMember();
  const roleKey = member.role?.key ?? "member";
  const permissions = rolePermissionMap[roleKey] ?? [];
  return permissions.includes("*") || permissions.includes(permissionKey);
}

export async function canAccessModule(requiredPermission: string) {
  if (requiredPermission.endsWith(".read")) return true;
  return hasPermission(requiredPermission);
}

export async function requirePermission(permissionKey: string) {
  const allowed = await hasPermission(permissionKey);
  if (!allowed) {
    throw new Error(`Missing permission: ${permissionKey}`);
  }
}

export function getRolePermissionKeys(roleKey: string) {
  return rolePermissionMap[roleKey] ?? [];
}
