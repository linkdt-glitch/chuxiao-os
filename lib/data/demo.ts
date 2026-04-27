import type {
  AIInvocationLog,
  AIProvider,
  Agent,
  AgentRunLog,
  ApprovalRequest,
  AuditLog,
  CompanyFile,
  FeedbackRecord,
  ImprovementSuggestion,
  ModuleDefinition,
  Organization,
  OrganizationMember,
  OrganizationModule,
  Permission,
  ReviewRecord,
  Role,
  SopRecord,
  SystemEvent,
  UserProfile
} from "@/lib/types/core";

const now = new Date("2026-04-25T10:00:00.000Z").toISOString();

export const demoOrganization: Organization = {
  id: "org_qiming",
  name: "启明时刻 AI 公司",
  slug: "qiming-ai",
  settings: { timezone: "Asia/Shanghai", security_review_required: true },
  created_at: now,
  updated_at: now
};

export const demoUser: UserProfile = {
  id: "user_founder",
  email: "founder@qiming.ai",
  full_name: "创始人",
  created_at: now,
  updated_at: now
};

export const demoRoles: Role[] = [
  { id: "role_owner", organization_id: demoOrganization.id, key: "owner", name: "Owner", description: "拥有全部权限，不可删除。", is_system: true, risk_rank: 100, created_at: now, updated_at: now },
  { id: "role_admin", organization_id: demoOrganization.id, key: "admin", name: "Admin", description: "大部分管理权限，不能修改最高风险配置。", is_system: true, risk_rank: 80, created_at: now, updated_at: now },
  { id: "role_manager", organization_id: demoOrganization.id, key: "manager", name: "Manager", description: "管理授权业务、审批、文件和协作。", is_system: true, risk_rank: 50, created_at: now, updated_at: now },
  { id: "role_member", organization_id: demoOrganization.id, key: "member", name: "Member", description: "查看工作台，提交审批，上传文件。", is_system: true, risk_rank: 20, created_at: now, updated_at: now },
  { id: "role_agent", organization_id: demoOrganization.id, key: "agent", name: "Agent", description: "AI 员工低权限角色，必须绑定负责人。", is_system: true, risk_rank: 10, created_at: now, updated_at: now }
];

export const demoPermissions: Permission[] = [
  { id: "perm_org_manage", key: "organization.manage", name: "管理组织", module: "organization", action: "manage", risk_level: "high", description: "更新组织信息与成员状态。" },
  { id: "perm_roles_manage", key: "roles.manage", name: "管理角色权限", module: "roles", action: "manage", risk_level: "critical", description: "创建角色和修改权限矩阵。" },
  { id: "perm_modules_manage", key: "modules.manage", name: "管理模块", module: "modules", action: "manage", risk_level: "medium", description: "启用、停用组织模块。" },
  { id: "perm_approvals_manage", key: "approvals.manage", name: "处理审批", module: "approvals", action: "manage", risk_level: "high", description: "批准、驳回、取消审批。" },
  { id: "perm_logs_read", key: "logs.read", name: "查看日志", module: "logs", action: "read", risk_level: "medium", description: "查看审计日志。" },
  { id: "perm_events_read", key: "events.read", name: "查看事件", module: "events", action: "read", risk_level: "medium", description: "查看系统事件。" },
  { id: "perm_files_manage", key: "files.manage", name: "管理文件", module: "files", action: "manage", risk_level: "medium", description: "上传、删除、关联文件。" },
  { id: "perm_ai_manage", key: "ai.manage", name: "管理 AI Provider", module: "ai-settings", action: "manage", risk_level: "critical", description: "配置 AI Provider 和模型。" },
  { id: "perm_agents_manage", key: "agents.manage", name: "管理 Agent", module: "agents", action: "manage", risk_level: "high", description: "创建、暂停、配置 Agent。" },
  { id: "perm_settings_manage", key: "settings.manage", name: "管理系统设置", module: "settings", action: "manage", risk_level: "critical", description: "管理安全、审批与组织设置。" },
  { id: "perm_finance_view", key: "finance.view", name: "查看财务中心", module: "finance", action: "view", risk_level: "low", description: "进入财务中心并查看授权数据。" },
  { id: "perm_finance_create", key: "finance.create", name: "创建财务记录", module: "finance", action: "create", risk_level: "medium", description: "创建收入、支出和报销。" },
  { id: "perm_finance_update", key: "finance.update", name: "更新财务记录", module: "finance", action: "update", risk_level: "medium", description: "编辑财务记录。" },
  { id: "perm_finance_approve", key: "finance.approve", name: "审批财务记录", module: "finance", action: "approve", risk_level: "high", description: "批准或驳回报销。" },
  { id: "perm_finance_export", key: "finance.export", name: "导出财务表格", module: "finance", action: "export", risk_level: "medium", description: "导出财务 Excel。" },
  { id: "perm_finance_all", key: "finance.view_all", name: "查看全部财务", module: "finance", action: "view_all", risk_level: "high", description: "查看全部财务数据。" },
  { id: "perm_finance_team", key: "finance.view_team", name: "查看团队财务", module: "finance", action: "view_team", risk_level: "medium", description: "查看团队财务数据。" },
  { id: "perm_finance_category", key: "finance.category.manage", name: "管理财务类目", module: "finance", action: "category.manage", risk_level: "medium", description: "管理财务类目。" },
  { id: "perm_finance_account", key: "finance.account.manage", name: "管理财务账户", module: "finance", action: "account.manage", risk_level: "high", description: "管理财务账户。" },
  { id: "perm_finance_ai", key: "finance.ai_parse", name: "AI 记账解析", module: "finance", action: "ai_parse", risk_level: "medium", description: "使用 AI 解析自然语言记账。" },
  { id: "perm_projects_view", key: "projects.view", name: "查看项目", module: "projects", action: "view", risk_level: "low", description: "查看授权范围内项目。" },
  { id: "perm_projects_manage", key: "projects.manage", name: "管理项目", module: "projects", action: "manage", risk_level: "medium", description: "创建、更新、完成和复盘项目。" },
  { id: "perm_tasks_view", key: "tasks.view", name: "查看任务", module: "tasks", action: "view", risk_level: "low", description: "查看授权范围内任务。" },
  { id: "perm_tasks_create", key: "tasks.create", name: "创建任务", module: "tasks", action: "create", risk_level: "medium", description: "创建任务并分配负责人。" },
  { id: "perm_tasks_update", key: "tasks.update", name: "更新任务", module: "tasks", action: "update", risk_level: "medium", description: "更新任务状态和进度。" },
  { id: "perm_tasks_delete", key: "tasks.delete", name: "删除任务", module: "tasks", action: "delete", risk_level: "high", description: "删除任务。" },
  { id: "perm_tasks_comment", key: "tasks.comment", name: "任务评论", module: "tasks", action: "comment", risk_level: "low", description: "在任务下发表评论。" },
  { id: "perm_tasks_files", key: "tasks.files", name: "上传任务文件", module: "tasks", action: "files", risk_level: "low", description: "上传或关联任务附件。" },
  { id: "perm_tasks_archive", key: "tasks.archive", name: "归档任务", module: "tasks", action: "archive", risk_level: "medium", description: "归档任务。" },
  { id: "perm_governance_view", key: "governance.view", name: "查看组织护航盾", module: "governance", action: "view", risk_level: "medium", description: "查看权限、审批、日志、事件和风险总览。" },
  { id: "perm_governance_manage", key: "governance.manage", name: "管理组织护航盾", module: "governance", action: "manage", risk_level: "high", description: "管理治理设置和风险规则。" },
  { id: "perm_risk_rule_view", key: "risk_rule.view", name: "查看风险规则", module: "governance", action: "view", risk_level: "medium", description: "查看风险规则。" },
  { id: "perm_risk_rule_manage", key: "risk_rule.manage", name: "管理风险规则", module: "governance", action: "manage", risk_level: "high", description: "管理风险规则。" },
  { id: "perm_knowledge_view", key: "knowledge.view", name: "查看组织大脑库", module: "knowledge", action: "view", risk_level: "low", description: "查看知识资产、SOP 和复盘。" },
  { id: "perm_knowledge_manage", key: "knowledge.manage", name: "管理组织大脑库", module: "knowledge", action: "manage", risk_level: "medium", description: "管理知识资产。" },
  { id: "perm_sop_view", key: "sop.view", name: "查看 SOP", module: "knowledge", action: "view", risk_level: "low", description: "查看 SOP。" },
  { id: "perm_sop_create", key: "sop.create", name: "创建 SOP", module: "knowledge", action: "create", risk_level: "medium", description: "创建 SOP。" },
  { id: "perm_sop_update", key: "sop.update", name: "更新 SOP", module: "knowledge", action: "update", risk_level: "medium", description: "更新 SOP。" },
  { id: "perm_review_view", key: "review.view", name: "查看复盘", module: "knowledge", action: "view", risk_level: "low", description: "查看复盘记录。" },
  { id: "perm_review_create", key: "review.create", name: "创建复盘", module: "knowledge", action: "create", risk_level: "medium", description: "创建复盘记录。" },
  { id: "perm_review_update", key: "review.update", name: "更新复盘", module: "knowledge", action: "update", risk_level: "medium", description: "更新复盘记录。" },
  { id: "perm_evolution_view", key: "evolution.view", name: "查看成长飞轮", module: "evolution", action: "view", risk_level: "low", description: "查看反馈、复盘、SOP 和优化建议。" },
  { id: "perm_evolution_manage", key: "evolution.manage", name: "管理成长飞轮", module: "evolution", action: "manage", risk_level: "medium", description: "管理成长飞轮配置。" },
  { id: "perm_feedback_view", key: "feedback.view", name: "查看反馈", module: "evolution", action: "view", risk_level: "low", description: "查看反馈记录。" },
  { id: "perm_feedback_create", key: "feedback.create", name: "创建反馈", module: "evolution", action: "create", risk_level: "low", description: "创建反馈记录。" },
  { id: "perm_review_record_view", key: "review_record.view", name: "查看复盘记录", module: "evolution", action: "view", risk_level: "low", description: "查看复盘记录。" },
  { id: "perm_review_record_create", key: "review_record.create", name: "创建复盘记录", module: "evolution", action: "create", risk_level: "medium", description: "创建复盘记录。" },
  { id: "perm_sop_record_view", key: "sop_record.view", name: "查看 SOP 记录", module: "evolution", action: "view", risk_level: "low", description: "查看 SOP 记录。" },
  { id: "perm_sop_record_create", key: "sop_record.create", name: "创建 SOP 记录", module: "evolution", action: "create", risk_level: "medium", description: "创建 SOP 记录。" },
  { id: "perm_improvement_view", key: "improvement.view", name: "查看优化建议", module: "evolution", action: "view", risk_level: "low", description: "查看优化建议。" },
  { id: "perm_improvement_manage", key: "improvement.manage", name: "管理优化建议", module: "evolution", action: "manage", risk_level: "medium", description: "处理优化建议状态。" },
  { id: "perm_ai_workforce_view", key: "ai_workforce.view", name: "查看智能劳动力中心", module: "ai_workforce", action: "view", risk_level: "medium", description: "查看 Agent、Prompt、AI 调用与人工确认总览。" },
  { id: "perm_ai_workforce_manage", key: "ai_workforce.manage", name: "管理智能劳动力中心", module: "ai_workforce", action: "manage", risk_level: "high", description: "管理 AI 工作中心配置。" },
  { id: "perm_agent_view", key: "agent.view", name: "查看 Agent", module: "ai_workforce", action: "view", risk_level: "medium", description: "查看 Agent 档案和运行记录。" },
  { id: "perm_agent_manage", key: "agent.manage", name: "管理 Agent", module: "ai_workforce", action: "manage", risk_level: "high", description: "管理 Agent 配置。" },
  { id: "perm_prompt_view", key: "prompt.view", name: "查看 Prompt", module: "ai_workforce", action: "view", risk_level: "medium", description: "查看 Prompt 模板。" },
  { id: "perm_prompt_manage", key: "prompt.manage", name: "管理 Prompt", module: "ai_workforce", action: "manage", risk_level: "high", description: "管理 Prompt 模板。" }
];

export const demoModules: ModuleDefinition[] = [
  { id: "mod_dashboard", key: "dashboard", name: "领航驾驶舱", description: "看全局、盯重点、早发现、快决策。", icon: "Compass", category: "core", status: "active", route: "/dashboard", required_permission: "dashboard.read", created_at: now, updated_at: now },
  { id: "mod_organization", key: "organization", name: "Organization 组织与成员", description: "组织信息、人类员工与 Agent 成员管理。", icon: "Building2", category: "core", status: "active", route: "/organization", required_permission: "organization.manage", created_at: now, updated_at: now },
  { id: "mod_roles", key: "roles", name: "Roles 权限与角色", description: "统一角色、权限矩阵与授权规则。", icon: "ShieldCheck", category: "core", status: "active", route: "/roles", required_permission: "roles.manage", created_at: now, updated_at: now },
  { id: "mod_modules", key: "modules", name: "Modules 模块管理", description: "模块注册、启用停用与模块设置。", icon: "Blocks", category: "core", status: "active", route: "/modules", required_permission: "modules.manage", created_at: now, updated_at: now },
  { id: "mod_approvals", key: "approvals", name: "Approvals 审批中心", description: "风险操作审批和审批策略预留。", icon: "ClipboardCheck", category: "core", status: "active", route: "/approvals", required_permission: "approvals.manage", created_at: now, updated_at: now },
  { id: "mod_logs", key: "logs", name: "Logs 操作日志", description: "关键操作审计追踪。", icon: "ScrollText", category: "system", status: "active", route: "/logs", required_permission: "logs.read", created_at: now, updated_at: now },
  { id: "mod_events", key: "events", name: "Events 事件中心", description: "统一事件收集、处理状态与 payload。", icon: "RadioTower", category: "system", status: "active", route: "/events", required_permission: "events.read", created_at: now, updated_at: now },
  { id: "mod_files", key: "files", name: "Files 文件中心", description: "文件资产、权限和多对象关联。", icon: "FolderOpen", category: "core", status: "active", route: "/files", required_permission: "files.manage", created_at: now, updated_at: now },
  { id: "mod_ai", key: "ai-settings", name: "AI Settings AI 设置", description: "AI Provider 抽象、模型与调用日志。", icon: "Sparkles", category: "ai", status: "active", route: "/ai-settings", required_permission: "ai.manage", created_at: now, updated_at: now },
  { id: "mod_agents", key: "agents", name: "Agents Agent 档案", description: "Agent 身份、负责人、权限等级与运行日志。", icon: "Bot", category: "ai", status: "active", route: "/agents", required_permission: "agents.manage", created_at: now, updated_at: now },
  { id: "mod_settings", key: "settings", name: "Settings 系统设置", description: "组织、安全、审批规则与模块入口设置。", icon: "Settings", category: "system", status: "active", route: "/settings", required_permission: "settings.manage", created_at: now, updated_at: now },
  { id: "mod_finance", key: "finance", name: "经营能量舱", description: "收入、支出、利润、现金流、经营健康度。", icon: "WalletCards", category: "core", status: "active", route: "/finance", required_permission: "finance.view", created_at: now, updated_at: now },
  { id: "mod_projects", key: "projects", name: "执行指挥舱", description: "项目管理、任务分配、进度追踪、评论附件和项目复盘。", icon: "ListTodo", category: "core", status: "active", route: "/projects", required_permission: "projects.view", created_at: now, updated_at: now },
  { id: "mod_ai_workforce", key: "ai_workforce", name: "智能劳动力中心", description: "Agent、Prompt、AI 调用、权限、质量、人工确认。", icon: "BrainCircuit", category: "ai", status: "active", route: "/ai-workforce", required_permission: "ai_workforce.view", created_at: now, updated_at: now },
  { id: "mod_governance", key: "governance", name: "组织护航盾", description: "权限、审批、日志、事件和风险控制。", icon: "ShieldCheck", category: "system", status: "active", route: "/governance", required_permission: "governance.view", created_at: now, updated_at: now },
  { id: "mod_knowledge_os", key: "knowledge", name: "组织大脑库", description: "文件、SOP、复盘、Prompt、Agent 输出和经验沉淀。", icon: "Library", category: "core", status: "active", route: "/knowledge", required_permission: "knowledge.view", created_at: now, updated_at: now },
  { id: "mod_evolution", key: "evolution", name: "成长飞轮引擎", description: "反馈、复盘、SOP 和优化建议，驱动组织持续进化。", icon: "RefreshCw", category: "core", status: "active", route: "/evolution", required_permission: "evolution.view", created_at: now, updated_at: now },
  { id: "mod_prompt", key: "prompt-center", name: "Prompt Center 提示词中心", description: "未来接入：Prompt 版本、评测与权限。", icon: "MessageSquareText", category: "future", status: "coming_soon", route: "/prompt-center", required_permission: "prompt-center.read", created_at: now, updated_at: now },
  { id: "mod_company_dashboard", key: "company-dashboard", name: "Company Dashboard 公司驾驶舱", description: "未来接入：跨模块指标聚合。", icon: "ChartNoAxesCombined", category: "future", status: "coming_soon", route: "/company-dashboard", required_permission: "company-dashboard.read", created_at: now, updated_at: now },
  { id: "mod_knowledge", key: "knowledge-base", name: "Knowledge Base 知识库", description: "未来接入：知识资产、检索与复盘沉淀。", icon: "Library", category: "future", status: "coming_soon", route: "/knowledge-base", required_permission: "knowledge-base.read", created_at: now, updated_at: now },
  { id: "mod_review", key: "review-center", name: "Review Center 复盘中心", description: "未来接入：项目复盘与行动项。", icon: "History", category: "future", status: "coming_soon", route: "/review-center", required_permission: "review-center.read", created_at: now, updated_at: now },
  { id: "mod_workflows", key: "workflows", name: "Workflows 自动化流程", description: "未来接入：触发器、动作与审批。", icon: "Workflow", category: "future", status: "coming_soon", route: "/workflows", required_permission: "workflows.read", created_at: now, updated_at: now }
];

export const demoOrganizationModules: OrganizationModule[] = demoModules.map((module) => ({
  id: `orgmod_${module.key}`,
  organization_id: demoOrganization.id,
  module_id: module.id,
  is_enabled: module.status === "active",
  settings: {},
  module
}));

export const demoMembers: OrganizationMember[] = [
  { id: "mem_founder", organization_id: demoOrganization.id, user_id: "user_founder", role_id: "role_owner", member_type: "human", display_name: "创始人", email: "founder@qiming.ai", status: "active", created_at: now, updated_at: now, role: demoRoles[0] },
  { id: "mem_admin", organization_id: demoOrganization.id, user_id: "user_admin", role_id: "role_admin", member_type: "human", display_name: "管理员", email: "admin@qiming.ai", status: "active", created_at: now, updated_at: now, role: demoRoles[1] },
  { id: "mem_ops", organization_id: demoOrganization.id, user_id: "user_ops", role_id: "role_manager", member_type: "human", display_name: "运营负责人", email: "ops@qiming.ai", status: "active", created_at: now, updated_at: now, role: demoRoles[2] },
  { id: "mem_member", organization_id: demoOrganization.id, user_id: "user_member", role_id: "role_member", member_type: "human", display_name: "普通成员", email: "member@qiming.ai", status: "active", created_at: now, updated_at: now, role: demoRoles[3] },
  { id: "mem_designer", organization_id: demoOrganization.id, user_id: "user_designer", role_id: "role_member", member_type: "human", display_name: "Designer", email: "designer@qiming.ai", status: "active", created_at: now, updated_at: now, role: demoRoles[3] },
  { id: "mem_backend", organization_id: demoOrganization.id, user_id: "user_backend", role_id: "role_member", member_type: "human", display_name: "Backend Dev", email: "backend@qiming.ai", status: "active", created_at: now, updated_at: now, role: demoRoles[3] },
  { id: "mem_agent_finance", organization_id: demoOrganization.id, agent_id: "agent_finance", role_id: "role_agent", member_type: "agent", display_name: "财务分析 Agent", status: "active", owner_user_id: "user_ops", created_at: now, updated_at: now, role: demoRoles[4] }
];

export const demoApprovals: ApprovalRequest[] = [
  { id: "apr_purchase", organization_id: demoOrganization.id, requester_id: "user_ops", requester_type: "human", title: "采购预算审批", description: "季度工具订阅预算申请。", related_module: "settings", related_record_type: "budget_request", related_record_id: "budget_001", risk_level: "medium", status: "pending", metadata: { amount: 12000, currency: "CNY" }, created_at: now, updated_at: now },
  { id: "apr_agent_risk", organization_id: demoOrganization.id, requester_id: "agent_finance", requester_type: "agent", title: "Agent 高风险动作审批", description: "财务分析 Agent 请求修改预算阈值。", related_module: "agents", related_record_type: "agent_action", related_record_id: "run_001", risk_level: "high", status: "pending", metadata: { permission_level: "L4" }, created_at: now, updated_at: now }
];

export const demoEvents: SystemEvent[] = [
  { id: "evt_org", organization_id: demoOrganization.id, event_key: "organization.created", event_source: "system", actor_type: "system", module: "organization", payload: { organization: demoOrganization.name }, status: "processed", created_at: now, updated_at: now },
  { id: "evt_member", organization_id: demoOrganization.id, event_key: "member.created", event_source: "human", actor_id: "user_founder", actor_type: "human", module: "organization", payload: { member: "管理员" }, status: "processed", created_at: now, updated_at: now },
  { id: "evt_approval", organization_id: demoOrganization.id, event_key: "approval.created", event_source: "human", actor_id: "user_ops", actor_type: "human", module: "approvals", payload: { approval: "采购预算审批" }, status: "new", created_at: now, updated_at: now },
  { id: "evt_agent", organization_id: demoOrganization.id, event_key: "agent.created", event_source: "human", actor_id: "user_ops", actor_type: "human", module: "agents", payload: { agent: "财务分析 Agent" }, status: "processed", created_at: now, updated_at: now },
  { id: "evt_provider", organization_id: demoOrganization.id, event_key: "ai.provider.created", event_source: "human", actor_id: "user_admin", actor_type: "human", module: "ai-settings", payload: { provider: "OpenAI" }, status: "processed", created_at: now, updated_at: now }
];

export const demoAuditLogs: AuditLog[] = [
  { id: "log_org", organization_id: demoOrganization.id, actor_id: "user_founder", actor_type: "human", event_key: "organization.created", action: "create", module: "organization", related_record_type: "organization", related_record_id: demoOrganization.id, after_data: { name: demoOrganization.name }, created_at: now },
  { id: "log_module", organization_id: demoOrganization.id, actor_id: "user_admin", actor_type: "human", event_key: "module.enabled", action: "enable", module: "modules", related_record_type: "module", related_record_id: "mod_agents", before_data: { enabled: false }, after_data: { enabled: true }, created_at: now },
  { id: "log_agent", organization_id: demoOrganization.id, actor_id: "user_ops", actor_type: "human", event_key: "agent.created", action: "create", module: "agents", related_record_type: "agent", related_record_id: "agent_finance", after_data: { permission_level: "L2" }, created_at: now }
];

export const demoFiles: CompanyFile[] = [
  { id: "file_policy", organization_id: demoOrganization.id, storage_bucket: "company-assets", storage_path: "policies/agent-safety.md", file_name: "Agent 安全策略.md", mime_type: "text/markdown", size_bytes: 18432, visibility: "organization", uploaded_by: "user_admin", uploaded_by_type: "human", metadata: { tags: ["security", "agent"] }, created_at: now, updated_at: now }
];

export const demoProviders: AIProvider[] = [
  { id: "provider_openai", organization_id: demoOrganization.id, provider_name: "openai", label: "OpenAI 占位", base_url: "https://api.openai.com/v1", model_name: "gpt-4.1", is_active: true, created_at: now, updated_at: now },
  { id: "provider_anthropic", organization_id: demoOrganization.id, provider_name: "anthropic", label: "Anthropic 占位", base_url: "https://api.anthropic.com", model_name: "claude-3.5-sonnet", is_active: false, created_at: now, updated_at: now },
  { id: "provider_google", organization_id: demoOrganization.id, provider_name: "google", label: "Google 占位", base_url: "https://generativelanguage.googleapis.com", model_name: "gemini-1.5-pro", is_active: false, created_at: now, updated_at: now },
  { id: "provider_deepseek", organization_id: demoOrganization.id, provider_name: "deepseek", label: "DeepSeek V4 Flash", base_url: "https://api.deepseek.com", model_name: "deepseek-v4-flash", is_active: false, created_at: now, updated_at: now }
];

export const demoAIInvocationLogs: AIInvocationLog[] = [
  { id: "ai_log_1", organization_id: demoOrganization.id, provider_id: "provider_openai", invoked_by: "user_ops", invoked_by_type: "human", module: "ai-settings", prompt_preview: "总结本周审批风险...", input_tokens: 512, output_tokens: 220, cost_estimate: 0.012, status: "success", created_at: now },
  { id: "ai_log_2", organization_id: demoOrganization.id, provider_id: "provider_openai", invoked_by: "agent_finance", invoked_by_type: "agent", module: "agents", prompt_preview: "分析预算调整影响...", input_tokens: 880, output_tokens: 410, cost_estimate: 0.028, status: "success", created_at: now }
];

export const demoAgents: Agent[] = [
  { id: "agent_finance", organization_id: demoOrganization.id, name: "财务分析 Agent", description: "读取授权财务与审批数据，生成预算分析建议。", owner_user_id: "user_ops", permission_level: "L2", allowed_modules: ["dashboard", "approvals", "files"], allowed_tools: ["summarize", "draft_report"], config: { require_human_confirm: true }, status: "active", created_at: now, updated_at: now }
];

export const demoAgentRunLogs: AgentRunLog[] = [
  { id: "run_001", organization_id: demoOrganization.id, agent_id: "agent_finance", run_type: "budget_analysis", status: "success", input: { period: "Q2" }, output: { summary: "预算支出稳定，工具订阅需审批。" }, started_at: now, finished_at: now }
];

export const demoFeedbackRecords: FeedbackRecord[] = [];
export const demoReviewRecords: ReviewRecord[] = [];
export const demoSopRecords: SopRecord[] = [];
export const demoImprovementSuggestions: ImprovementSuggestion[] = [];
