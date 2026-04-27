insert into public.user_profiles (id, email, full_name)
values
  ('00000000-0000-4000-8000-000000000001', 'founder@qiming.ai', '创始人'),
  ('00000000-0000-4000-8000-000000000002', 'admin@qiming.ai', '管理员'),
  ('00000000-0000-4000-8000-000000000003', 'ops@qiming.ai', '运营负责人'),
  ('00000000-0000-4000-8000-000000000004', 'member@qiming.ai', '普通成员')
on conflict (email) do nothing;

insert into public.organizations (id, name, slug, settings)
values (
  '10000000-0000-4000-8000-000000000001',
  '启明时刻 AI 公司',
  'qiming-ai',
  '{"timezone":"Asia/Shanghai","security_review_required":true}'::jsonb
)
on conflict (slug) do nothing;

insert into public.roles (id, organization_id, key, name, description, is_system, risk_rank)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'Owner', '拥有全部权限，不可删除。', true, 100),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'admin', 'Admin', '大部分管理权限，不能删除 Owner 或修改最高风险配置。', true, 80),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'manager', 'Manager', '管理被授权业务、审批、文件和成员协作。', true, 50),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'member', 'Member', '查看工作台、提交审批、上传文件。', true, 20),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'agent', 'Agent', 'AI 员工默认低权限角色，必须绑定负责人。', true, 10)
on conflict (organization_id, key) do nothing;

insert into public.permissions (id, key, name, module, action, risk_level, description)
values
  ('30000000-0000-4000-8000-000000000001', 'dashboard.read', '查看工作台', 'dashboard', 'read', 'low', '查看组织工作台。'),
  ('30000000-0000-4000-8000-000000000002', 'organization.manage', '管理组织', 'organization', 'manage', 'high', '更新组织、成员和成员状态。'),
  ('30000000-0000-4000-8000-000000000003', 'roles.manage', '管理角色权限', 'roles', 'manage', 'critical', '创建角色和修改权限矩阵。'),
  ('30000000-0000-4000-8000-000000000004', 'modules.manage', '管理模块', 'modules', 'manage', 'medium', '启用或停用组织模块。'),
  ('30000000-0000-4000-8000-000000000005', 'approvals.manage', '处理审批', 'approvals', 'manage', 'high', '批准、驳回、取消审批。'),
  ('30000000-0000-4000-8000-000000000006', 'approvals.create', '提交审批', 'approvals', 'create', 'low', '创建审批申请。'),
  ('30000000-0000-4000-8000-000000000007', 'logs.read', '查看日志', 'logs', 'read', 'medium', '查看审计日志。'),
  ('30000000-0000-4000-8000-000000000008', 'events.read', '查看事件', 'events', 'read', 'medium', '查看系统事件。'),
  ('30000000-0000-4000-8000-000000000009', 'files.manage', '管理文件', 'files', 'manage', 'medium', '上传、删除和关联文件。'),
  ('30000000-0000-4000-8000-000000000010', 'ai.manage', '管理 AI Provider', 'ai-settings', 'manage', 'critical', '配置 AI Provider 和模型。'),
  ('30000000-0000-4000-8000-000000000011', 'agents.manage', '管理 Agent', 'agents', 'manage', 'high', '创建、暂停、配置 Agent。'),
  ('30000000-0000-4000-8000-000000000012', 'settings.manage', '管理系统设置', 'settings', 'manage', 'critical', '管理安全、审批和组织设置。'),
  ('30000000-0000-4000-8000-000000000101', 'finance.view', '查看财务中心', 'finance', 'view', 'low', '进入财务中心并查看授权范围内数据。'),
  ('30000000-0000-4000-8000-000000000102', 'finance.create', '创建财务记录', 'finance', 'create', 'medium', '创建收入、支出和报销记录。'),
  ('30000000-0000-4000-8000-000000000103', 'finance.update', '更新财务记录', 'finance', 'update', 'medium', '编辑授权范围内财务记录。'),
  ('30000000-0000-4000-8000-000000000104', 'finance.delete', '删除财务记录', 'finance', 'delete', 'high', '删除财务记录。'),
  ('30000000-0000-4000-8000-000000000105', 'finance.approve', '审批财务记录', 'finance', 'approve', 'high', '批准或驳回报销与支出审批。'),
  ('30000000-0000-4000-8000-000000000106', 'finance.export', '导出财务表格', 'finance', 'export', 'medium', '导出授权范围内财务 Excel。'),
  ('30000000-0000-4000-8000-000000000107', 'finance.view_all', '查看全部财务数据', 'finance', 'view_all', 'high', '查看组织全部财务数据。'),
  ('30000000-0000-4000-8000-000000000108', 'finance.view_team', '查看团队财务数据', 'finance', 'view_team', 'medium', '查看团队或授权范围内财务数据。'),
  ('30000000-0000-4000-8000-000000000109', 'finance.category.manage', '管理财务类目', 'finance', 'category.manage', 'medium', '创建和维护财务类目。'),
  ('30000000-0000-4000-8000-000000000110', 'finance.account.manage', '管理财务账户', 'finance', 'account.manage', 'high', '创建和维护财务账户。'),
  ('30000000-0000-4000-8000-000000000111', 'finance.ai_parse', '使用 AI 记账解析', 'finance', 'ai_parse', 'medium', '使用 AI 解析自然语言记账。')
on conflict (key) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', id from public.permissions
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', id
from public.permissions
where key in ('dashboard.read','organization.manage','modules.manage','approvals.manage','logs.read','events.read','files.manage','ai.manage','agents.manage','finance.view','finance.create','finance.update','finance.delete','finance.approve','finance.export','finance.view_all','finance.category.manage','finance.account.manage','finance.ai_parse')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', id
from public.permissions
where key in ('dashboard.read','approvals.manage','logs.read','events.read','files.manage','agents.manage','finance.view','finance.create','finance.update','finance.approve','finance.export','finance.view_team','finance.ai_parse')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', id
from public.permissions
where key in ('dashboard.read','approvals.create','files.manage','finance.view','finance.create','finance.update','finance.export','finance.ai_parse')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', id
from public.permissions
where key in ('dashboard.read','finance.view')
on conflict (role_id, permission_id) do nothing;

insert into public.modules (id, key, name, description, icon, category, status, route, required_permission)
values
  ('40000000-0000-4000-8000-000000000001', 'dashboard', 'Dashboard 工作台', '组织概览、待办、最近事件与 AI 使用情况。', 'LayoutDashboard', 'core', 'active', '/dashboard', 'dashboard.read'),
  ('40000000-0000-4000-8000-000000000002', 'organization', 'Organization 组织与成员', '组织信息、人类员工与 Agent 成员管理。', 'Building2', 'core', 'active', '/organization', 'organization.manage'),
  ('40000000-0000-4000-8000-000000000003', 'roles', 'Roles 权限与角色', '统一角色、权限矩阵与授权规则。', 'ShieldCheck', 'core', 'active', '/roles', 'roles.manage'),
  ('40000000-0000-4000-8000-000000000004', 'modules', 'Modules 模块管理', '模块注册、启用停用与模块设置。', 'Blocks', 'core', 'active', '/modules', 'modules.manage'),
  ('40000000-0000-4000-8000-000000000005', 'approvals', 'Approvals 审批中心', '风险操作审批和审批策略预留。', 'ClipboardCheck', 'core', 'active', '/approvals', 'approvals.manage'),
  ('40000000-0000-4000-8000-000000000006', 'logs', 'Logs 操作日志', '关键操作审计追踪。', 'ScrollText', 'system', 'active', '/logs', 'logs.read'),
  ('40000000-0000-4000-8000-000000000007', 'events', 'Events 事件中心', '统一事件收集、处理状态与 payload。', 'RadioTower', 'system', 'active', '/events', 'events.read'),
  ('40000000-0000-4000-8000-000000000008', 'files', 'Files 文件中心', '文件资产、权限和多对象关联。', 'FolderOpen', 'core', 'active', '/files', 'files.manage'),
  ('40000000-0000-4000-8000-000000000009', 'ai-settings', 'AI Settings AI 设置', 'AI Provider 抽象、模型与调用日志。', 'Sparkles', 'ai', 'active', '/ai-settings', 'ai.manage'),
  ('40000000-0000-4000-8000-000000000010', 'agents', 'Agents Agent 档案', 'Agent 身份、负责人、权限等级与运行日志。', 'Bot', 'ai', 'active', '/agents', 'agents.manage'),
  ('40000000-0000-4000-8000-000000000011', 'settings', 'Settings 系统设置', '组织、安全、审批规则与模块入口设置。', 'Settings', 'system', 'active', '/settings', 'settings.manage'),
  ('40000000-0000-4000-8000-000000000012', 'finance', '财务中心', '一句话记账、报销审批、收支流水、财务看板与 Excel 导出。', 'WalletCards', 'core', 'active', '/finance', 'finance.view'),
  ('40000000-0000-4000-8000-000000000013', 'projects', 'Projects 任务项目', '未来接入：任务、项目、里程碑与协作。', 'ListTodo', 'future', 'coming_soon', '/projects', 'projects.read'),
  ('40000000-0000-4000-8000-000000000014', 'prompt-center', 'Prompt Center 提示词中心', '未来接入：Prompt 版本、评测与权限。', 'MessageSquareText', 'future', 'coming_soon', '/prompt-center', 'prompt-center.read'),
  ('40000000-0000-4000-8000-000000000015', 'company-dashboard', 'Company Dashboard 公司驾驶舱', '未来接入：跨模块指标聚合。', 'ChartNoAxesCombined', 'future', 'coming_soon', '/company-dashboard', 'company-dashboard.read'),
  ('40000000-0000-4000-8000-000000000016', 'knowledge-base', 'Knowledge Base 知识库', '未来接入：知识资产、检索与复盘沉淀。', 'Library', 'future', 'coming_soon', '/knowledge-base', 'knowledge-base.read'),
  ('40000000-0000-4000-8000-000000000017', 'review-center', 'Review Center 复盘中心', '未来接入：项目复盘与行动项。', 'History', 'future', 'coming_soon', '/review-center', 'review-center.read'),
  ('40000000-0000-4000-8000-000000000018', 'workflows', 'Workflows 自动化流程', '未来接入：触发器、动作与审批。', 'Workflow', 'future', 'coming_soon', '/workflows', 'workflows.read')
on conflict (key) do nothing;

insert into public.organization_modules (organization_id, module_id, is_enabled, settings)
select '10000000-0000-4000-8000-000000000001', id, status = 'active', '{}'::jsonb
from public.modules
on conflict (organization_id, module_id) do nothing;

insert into public.agents (id, organization_id, name, description, owner_user_id, permission_level, allowed_modules, allowed_tools, config, status)
values (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '财务分析 Agent',
  '读取授权财务与审批数据，生成预算分析建议。',
  '00000000-0000-4000-8000-000000000003',
  'L2',
  '["dashboard","approvals","files"]'::jsonb,
  '["summarize","draft_report"]'::jsonb,
  '{"require_human_confirm":true}'::jsonb,
  'active'
)
on conflict (id) do nothing;

insert into public.organization_members (id, organization_id, user_id, agent_id, role_id, member_type, display_name, email, status, owner_user_id)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', null, '20000000-0000-4000-8000-000000000001', 'human', '创始人', 'founder@qiming.ai', 'active', null),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', null, '20000000-0000-4000-8000-000000000002', 'human', '管理员', 'admin@qiming.ai', 'active', null),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', null, '20000000-0000-4000-8000-000000000003', 'human', '运营负责人', 'ops@qiming.ai', 'active', null),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', null, '20000000-0000-4000-8000-000000000004', 'human', '普通成员', 'member@qiming.ai', 'active', null),
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', null, '50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'agent', '财务分析 Agent', null, 'active', '00000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

insert into public.approval_requests (id, organization_id, requester_id, requester_type, title, description, related_module, related_record_type, related_record_id, risk_level, status, metadata)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'human', '采购预算审批', '季度工具订阅预算申请。', 'settings', 'budget_request', 'budget_001', 'medium', 'pending', '{"amount":12000,"currency":"CNY"}'::jsonb),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'agent', 'Agent 高风险动作审批', '财务分析 Agent 请求修改预算阈值。', 'agents', 'agent_action', 'run_001', 'high', 'pending', '{"permission_level":"L4"}'::jsonb)
on conflict (id) do nothing;

insert into public.system_events (organization_id, event_key, event_source, actor_id, actor_type, module, payload, status)
values
  ('10000000-0000-4000-8000-000000000001', 'organization.created', 'system', null, 'system', 'organization', '{"organization":"启明时刻 AI 公司"}'::jsonb, 'processed'),
  ('10000000-0000-4000-8000-000000000001', 'member.created', 'human', '00000000-0000-4000-8000-000000000001', 'human', 'organization', '{"member":"管理员"}'::jsonb, 'processed'),
  ('10000000-0000-4000-8000-000000000001', 'approval.created', 'human', '00000000-0000-4000-8000-000000000003', 'human', 'approvals', '{"approval":"采购预算审批"}'::jsonb, 'new'),
  ('10000000-0000-4000-8000-000000000001', 'agent.created', 'human', '00000000-0000-4000-8000-000000000003', 'human', 'agents', '{"agent":"财务分析 Agent"}'::jsonb, 'processed'),
  ('10000000-0000-4000-8000-000000000001', 'ai.provider.created', 'human', '00000000-0000-4000-8000-000000000002', 'human', 'ai-settings', '{"provider":"OpenAI"}'::jsonb, 'processed');

insert into public.audit_logs (organization_id, actor_id, actor_type, event_key, action, module, related_record_type, related_record_id, after_data)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'human', 'organization.created', 'create', 'organization', 'organization', '10000000-0000-4000-8000-000000000001', '{"name":"启明时刻 AI 公司"}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'human', 'module.enabled', 'enable', 'modules', 'module', 'agents', '{"enabled":true}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'human', 'agent.created', 'create', 'agents', 'agent', '50000000-0000-4000-8000-000000000001', '{"permission_level":"L2"}'::jsonb);

insert into public.files (id, organization_id, storage_bucket, storage_path, file_name, mime_type, size_bytes, visibility, uploaded_by, uploaded_by_type, metadata)
values (
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'company-assets',
  'policies/agent-safety.md',
  'Agent 安全策略.md',
  'text/markdown',
  18432,
  'organization',
  '00000000-0000-4000-8000-000000000002',
  'human',
  '{"tags":["security","agent"]}'::jsonb
)
on conflict (organization_id, storage_bucket, storage_path) do nothing;

insert into public.ai_providers (id, organization_id, provider_name, label, api_key_encrypted, base_url, model_name, is_active)
values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'openai', 'OpenAI 占位', null, 'https://api.openai.com/v1', 'gpt-4.1', true),
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'anthropic', 'Anthropic 占位', null, 'https://api.anthropic.com', 'claude-3.5-sonnet', false),
  ('90000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'google', 'Google 占位', null, 'https://generativelanguage.googleapis.com', 'gemini-1.5-pro', false),
  ('90000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'deepseek', 'DeepSeek V4 Flash', null, 'https://api.deepseek.com', 'deepseek-v4-flash', false)
on conflict (id) do nothing;

insert into public.ai_invocation_logs (organization_id, provider_id, invoked_by, invoked_by_type, module, prompt_preview, input_tokens, output_tokens, cost_estimate, status)
values
  ('10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'human', 'ai-settings', '总结本周审批风险...', 512, 220, 0.012, 'success'),
  ('10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'agent', 'agents', '分析预算调整影响...', 880, 410, 0.028, 'success');

insert into public.agent_run_logs (organization_id, agent_id, run_type, status, input, output, started_at, finished_at)
values (
  '10000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  'budget_analysis',
  'success',
  '{"period":"Q2"}'::jsonb,
  '{"summary":"预算支出稳定，工具订阅需审批。"}'::jsonb,
  now(),
  now()
);

insert into public.system_settings (organization_id, key, value, is_sensitive)
values
  ('10000000-0000-4000-8000-000000000001', 'security', '{"require_confirm_for_delete":true,"agent_frontend_login":false}'::jsonb, false),
  ('10000000-0000-4000-8000-000000000001', 'approval', '{"high_risk_requires_approval":true,"critical_requires_owner":true}'::jsonb, false)
on conflict (organization_id, key) do nothing;

insert into public.user_profiles (id, email, full_name)
values
  ('00000000-0000-4000-8000-000000000005', 'designer@qiming.ai', 'Designer'),
  ('00000000-0000-4000-8000-000000000006', 'backend@qiming.ai', 'Backend Dev')
on conflict (email) do nothing;

insert into public.organization_members (id, organization_id, user_id, agent_id, role_id, member_type, display_name, email, status, owner_user_id)
values
  ('60000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', null, '20000000-0000-4000-8000-000000000004', 'human', 'Designer', 'designer@qiming.ai', 'active', null),
  ('60000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006', null, '20000000-0000-4000-8000-000000000004', 'human', 'Backend Dev', 'backend@qiming.ai', 'active', null)
on conflict (id) do nothing;

insert into public.permissions (key, name, module, action, risk_level, description)
values
  ('projects.view', '查看项目', 'projects', 'view', 'low', '查看授权范围内项目。'),
  ('projects.manage', '管理项目', 'projects', 'manage', 'medium', '创建、更新、完成和复盘自己负责或授权管理的项目。'),
  ('tasks.view', '查看任务', 'tasks', 'view', 'low', '查看授权范围内任务。'),
  ('tasks.create', '创建任务', 'tasks', 'create', 'medium', '在授权项目下创建任务并分配负责人。'),
  ('tasks.update', '更新任务', 'tasks', 'update', 'medium', '更新任务状态、负责人、截止日期和进度。'),
  ('tasks.delete', '删除任务', 'tasks', 'delete', 'high', '删除任务。'),
  ('tasks.comment', '任务评论', 'tasks', 'comment', 'low', '在授权任务下发表评论。'),
  ('tasks.files', '上传任务文件', 'tasks', 'files', 'low', '上传或关联任务附件。'),
  ('tasks.archive', '归档任务', 'tasks', 'archive', 'medium', '归档任务并触发任务相关审批记录。')
on conflict (key) do update set
  name = excluded.name,
  module = excluded.module,
  action = excluded.action,
  risk_level = excluded.risk_level,
  description = excluded.description;

insert into public.modules (id, key, name, description, icon, category, status, route, required_permission)
values ('40000000-0000-4000-8000-000000000013', 'projects', '执行指挥舱', '项目管理、任务分配、进度追踪、评论附件和项目复盘。', 'ListTodo', 'core', 'active', '/projects', 'projects.view')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  status = excluded.status,
  route = excluded.route,
  required_permission = excluded.required_permission;

insert into public.organization_modules (organization_id, module_id, is_enabled, settings)
select '10000000-0000-4000-8000-000000000001', id, true, '{}'::jsonb
from public.modules
where key = 'projects'
on conflict (organization_id, module_id) do update set is_enabled = true;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'projects.view','projects.manage',
  'tasks.view','tasks.create','tasks.update','tasks.delete','tasks.comment','tasks.files','tasks.archive'
)
where r.key in ('owner', 'admin')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'projects.view','projects.manage',
  'tasks.view','tasks.create','tasks.update','tasks.comment','tasks.files','tasks.archive'
)
where r.key = 'manager'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in ('projects.view','tasks.view','tasks.comment','tasks.files')
where r.key = 'member'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in ('projects.view','tasks.view')
where r.key = 'agent'
on conflict (role_id, permission_id) do nothing;

insert into public.projects (id, organization_id, name, description, owner_id, status, start_date, due_date, priority)
values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '项目A：开发新产品', '围绕新产品从需求、设计到研发交付的第一阶段项目。', '60000000-0000-4000-8000-000000000002', 'in_progress', '2023-01-01T00:00:00+08:00', '2023-06-30T00:00:00+08:00', 5),
  ('a0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '项目B：升级客户支持系统', '升级客户支持系统的数据结构、处理流程和协作体验。', '60000000-0000-4000-8000-000000000003', 'in_progress', '2023-02-15T00:00:00+08:00', '2023-05-30T00:00:00+08:00', 3)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  owner_id = excluded.owner_id,
  status = excluded.status,
  start_date = excluded.start_date,
  due_date = excluded.due_date,
  priority = excluded.priority;

insert into public.tasks (id, organization_id, project_id, name, description, assigned_to, status, due_date, progress)
values
  ('b0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '任务A1：设计 UI 界面', '完成核心页面的信息架构、视觉稿和交互说明。', '60000000-0000-4000-8000-000000000006', 'in_progress', '2023-03-30T00:00:00+08:00', 60),
  ('b0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', '任务B1：升级数据库', '整理客户支持系统的数据表变更，并完成迁移验证。', '60000000-0000-4000-8000-000000000007', 'to_do', '2023-04-30T00:00:00+08:00', 10)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  assigned_to = excluded.assigned_to,
  status = excluded.status,
  due_date = excluded.due_date,
  progress = excluded.progress;

insert into public.task_comments (id, organization_id, task_id, comment_text, commenter_id)
values (
  'c0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  '首页和任务详情页的草稿已完成，下一步补齐空状态和移动端间距。',
  '60000000-0000-4000-8000-000000000006'
)
on conflict (id) do nothing;

insert into public.task_files (id, organization_id, task_id, file_url, file_name, uploaded_by)
values (
  'd0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  '/files/project-a-ui-wireframe.pdf',
  '项目A-UI线框图.pdf',
  '60000000-0000-4000-8000-000000000006'
)
on conflict (id) do nothing;

insert into public.project_reviews (id, organization_id, project_id, summary, successful_factors, failure_factors, lessons_learned, next_actions)
values (
  'e0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '新产品项目处于推进中，设计阶段进展稳定，研发排期仍需持续跟进。',
  '目标拆解清晰，负责人明确。',
  '跨角色确认节奏偏慢。',
  '关键任务需要更早锁定验收标准。',
  '把 UI 设计验收清单沉淀为 SOP，并同步给研发负责人。'
)
on conflict (project_id) do update set
  summary = excluded.summary,
  successful_factors = excluded.successful_factors,
  failure_factors = excluded.failure_factors,
  lessons_learned = excluded.lessons_learned,
  next_actions = excluded.next_actions;

insert into public.permissions (key, name, module, action, risk_level, description)
values
  ('agent.create', '创建 Agent', 'ai_workforce', 'create', 'high', '创建组织 AI Agent。'),
  ('agent.update', '更新 Agent', 'ai_workforce', 'update', 'high', '更新 Agent 档案、负责人、工具和 Prompt 绑定。'),
  ('agent.pause', '暂停 Agent', 'ai_workforce', 'pause', 'high', '暂停 Agent 自动动作。'),
  ('agent.archive', '归档 Agent', 'ai_workforce', 'archive', 'high', '归档 Agent。'),
  ('agent.run', '运行 Agent', 'ai_workforce', 'run', 'medium', '手动调用授权 Agent。'),
  ('agent.view_logs', '查看 Agent 日志', 'ai_workforce', 'view_logs', 'medium', '查看 Agent 运行与 AI 调用记录。'),
  ('prompt.create', '创建 Prompt', 'ai_workforce', 'create', 'medium', '创建 Prompt 草稿。'),
  ('prompt.update', '更新 Prompt', 'ai_workforce', 'update', 'medium', '更新 Prompt 元信息和版本。'),
  ('prompt.publish', '发布 Prompt', 'ai_workforce', 'publish', 'high', '发布组织正式 Prompt。'),
  ('prompt.archive', '归档 Prompt', 'ai_workforce', 'archive', 'high', '归档 Prompt。'),
  ('prompt.test', '测试 Prompt', 'ai_workforce', 'test', 'medium', '调用 AI Provider 测试 Prompt。'),
  ('ai_confirmation.view', '查看人工确认', 'ai_workforce', 'view', 'medium', '查看 AI 人工确认事项。'),
  ('ai_confirmation.approve', '批准人工确认', 'ai_workforce', 'approve', 'high', '批准 AI 建议动作。'),
  ('ai_confirmation.reject', '驳回人工确认', 'ai_workforce', 'reject', 'high', '驳回 AI 建议动作。'),
  ('ai_feedback.create', '创建 AI 反馈', 'ai_workforce', 'create', 'low', '对 Agent、Prompt、确认和 AI 调用评分反馈。'),
  ('ai_feedback.view', '查看 AI 反馈', 'ai_workforce', 'view', 'low', '查看 AI 反馈评分。')
on conflict (key) do update set
  name = excluded.name,
  module = excluded.module,
  action = excluded.action,
  risk_level = excluded.risk_level,
  description = excluded.description;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'ai_workforce.view','ai_workforce.manage',
  'agent.view','agent.create','agent.update','agent.pause','agent.archive','agent.run','agent.view_logs',
  'prompt.view','prompt.create','prompt.update','prompt.publish','prompt.archive','prompt.test',
  'ai_confirmation.view','ai_confirmation.approve','ai_confirmation.reject',
  'ai_feedback.create','ai_feedback.view'
)
where r.key in ('owner', 'admin')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'ai_workforce.view',
  'agent.view','agent.create','agent.update','agent.pause','agent.archive','agent.run','agent.view_logs',
  'prompt.view','prompt.create','prompt.update','prompt.publish','prompt.archive','prompt.test',
  'ai_confirmation.view','ai_confirmation.approve','ai_confirmation.reject',
  'ai_feedback.create','ai_feedback.view'
)
where r.key = 'manager'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'ai_workforce.view','agent.view','agent.run','prompt.view','prompt.create','prompt.test','ai_feedback.create'
)
where r.key = 'member'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'ai_workforce.view','agent.view','agent.run','ai_feedback.create'
)
where r.key = 'agent'
on conflict (role_id, permission_id) do nothing;

insert into public.agents (id, organization_id, name, description, owner_user_id, permission_level, allowed_modules, allowed_tools, config, status)
values
  ('50000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', '项目助理 Agent', '总结任务、生成周报、识别延期风险。', '00000000-0000-4000-8000-000000000003', 'L2', '["projects"]'::jsonb, '["summarize","draft_weekly_report","identify_risks"]'::jsonb, '{"require_human_confirm":true}'::jsonb, 'active'),
  ('50000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000001', 'Prompt 优化 Agent', '分析 Prompt 使用效果并提出优化建议。', '00000000-0000-4000-8000-000000000003', 'L1', '["ai_workforce"]'::jsonb, '["analyze_feedback","suggest_prompt_changes"]'::jsonb, '{"require_human_confirm":false}'::jsonb, 'active')
on conflict (id) do nothing;

insert into public.prompt_templates (id, organization_id, name, description, scenario, module, tags, input_variables, output_format, quality_criteria, current_version, status, owner_id)
values
  ('a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '财务异常分析 Prompt', '用于分析收入、支出、利润和异常波动。', '财务月度分析', 'finance', array['finance','analysis'], '[{"name":"period","type":"string"},{"name":"records","type":"array"}]'::jsonb, '结构化摘要、异常原因、建议动作', '结论可追溯；不得编造金额；风险动作只给建议。', '1.0', 'published', '00000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '项目周报生成 Prompt', '汇总项目进度、风险和下周计划。', '项目周报', 'projects', array['projects','weekly'], '[{"name":"project","type":"string"},{"name":"tasks","type":"array"}]'::jsonb, '本周完成、风险、下周计划', '表达清晰；风险要有责任人与截止时间。', '1.0', 'published', '00000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '任务拆解 Prompt', '把目标拆成可执行任务建议。', '任务拆解', 'projects', array['projects','tasks'], '[{"name":"goal","type":"string"},{"name":"constraints","type":"string"}]'::jsonb, '任务列表、优先级、依赖关系', '任务需可执行；不得直接创建正式任务。', '1.0', 'draft', '00000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Prompt 优化建议 Prompt', '根据反馈和运行结果提出 Prompt 优化建议。', 'Prompt 质量优化', 'ai_workforce', array['prompt','improvement'], '[{"name":"prompt","type":"string"},{"name":"feedback","type":"array"}]'::jsonb, '问题诊断、修改建议、验证方法', '建议要具体；必须保留风险边界。', '1.0', 'published', '00000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

insert into public.prompt_versions (id, organization_id, prompt_template_id, version, content, change_note)
values
  ('a2000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '1.0', '你是财务分析 Agent。基于输入 period 和 records，识别收入、支出、利润异常，只输出建议，不修改数据。', '初始版本'),
  ('a2000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', '1.0', '你是项目助理 Agent。基于项目和任务列表生成周报，标记延期风险和需要人类确认的事项。', '初始版本'),
  ('a2000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', '1.0', '你是任务拆解助手。把目标拆解为任务建议，输出标题、说明、优先级和依赖，不直接创建正式任务。', '初始版本'),
  ('a2000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', '1.0', '你是 Prompt 优化 Agent。根据 Prompt 内容、测试输出和反馈评分，提出可验证的优化建议。', '初始版本')
on conflict (prompt_template_id, version) do nothing;

insert into public.agent_prompt_bindings (organization_id, agent_id, prompt_template_id, prompt_version_id, is_active)
values
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000101', 'a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000102', 'a1000000-0000-4000-8000-000000000004', 'a2000000-0000-4000-8000-000000000004', true)
on conflict (agent_id, prompt_template_id, prompt_version_id) do nothing;

insert into public.ai_confirmation_requests (id, organization_id, agent_id, prompt_template_id, requester_id, requester_type, related_module, related_record_type, related_record_id, action_type, risk_level, title, description, input_data, proposed_output, status)
values
  ('a3000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000101', 'a1000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000101', 'agent', 'projects', 'task_suggestion', 'seed-task-suggestion-001', 'create_tasks', 'medium', 'Agent 建议创建 3 个任务', '项目助理 Agent 基于延期风险建议创建 3 个内部任务。', '{"project":"官网改版"}'::jsonb, '{"tasks":["补齐验收标准","确认设计稿冻结时间","安排上线前回归测试"]}'::jsonb, 'pending'),
  ('a3000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000101', 'a1000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000101', 'agent', 'marketing', 'external_content', 'seed-content-001', 'publish_external_content', 'high', 'Agent 建议发布一段对外内容草稿', '对外发布前必须由人类确认，高风险可进入审批中心。', '{"channel":"公众号"}'::jsonb, '{"draft":"本周我们完成了智能劳动力中心 MVP 的核心能力升级。"}'::jsonb, 'pending')
on conflict (id) do nothing;

insert into public.finance_categories (organization_id, name, type, code, description, is_system, sort_order)
values
  ('10000000-0000-4000-8000-000000000001', '销售收入', 'income', 'INC-SALES', '', true, 10),
  ('10000000-0000-4000-8000-000000000001', '服务收入', 'income', 'INC-SERVICE', '', true, 20),
  ('10000000-0000-4000-8000-000000000001', '投资收益', 'income', 'INC-INVEST', '', true, 30),
  ('10000000-0000-4000-8000-000000000001', '退款收入', 'income', 'INC-REFUND', '', true, 40),
  ('10000000-0000-4000-8000-000000000001', '其他收入', 'income', 'INC-OTHER', '', true, 50),
  ('10000000-0000-4000-8000-000000000001', '产品成本', 'expense', 'EXP-PRODUCT', '', true, 110),
  ('10000000-0000-4000-8000-000000000001', '物流仓储', 'expense', 'EXP-LOGISTICS', '', true, 120),
  ('10000000-0000-4000-8000-000000000001', '广告推广', 'expense', 'EXP-MARKETING', '', true, 130),
  ('10000000-0000-4000-8000-000000000001', '软件与 AI 成本', 'expense', 'EXP-SOFTWARE-AI', '', true, 140),
  ('10000000-0000-4000-8000-000000000001', '人工薪酬', 'expense', 'EXP-LABOR', '', true, 150),
  ('10000000-0000-4000-8000-000000000001', '办公行政', 'expense', 'EXP-OFFICE', '', true, 160),
  ('10000000-0000-4000-8000-000000000001', '差旅招待', 'expense', 'EXP-TRAVEL', '', true, 170),
  ('10000000-0000-4000-8000-000000000001', '研发与产品', 'expense', 'EXP-RD', '', true, 180),
  ('10000000-0000-4000-8000-000000000001', '税费手续费', 'expense', 'EXP-FEE-TAX', '', true, 190),
  ('10000000-0000-4000-8000-000000000001', '其他支出', 'expense', 'EXP-OTHER', '', true, 200)
on conflict (organization_id, parent_id, name) do nothing;

insert into public.finance_categories (organization_id, parent_id, name, type, code, description, is_system, sort_order)
select '10000000-0000-4000-8000-000000000001', parent.id, child.name, 'expense', child.code, '', true, child.sort_order
from public.finance_categories parent
join (values
  ('产品成本', '采购成本', 'EXP-PRODUCT-PURCHASE', 111),
  ('产品成本', '打样费', 'EXP-PRODUCT-SAMPLE', 112),
  ('产品成本', '包装费', 'EXP-PRODUCT-PACKAGING', 113),
  ('物流仓储', '运费', 'EXP-LOGISTICS-FREIGHT', 121),
  ('物流仓储', '仓储费', 'EXP-LOGISTICS-STORAGE', 122),
  ('物流仓储', '关税', 'EXP-LOGISTICS-DUTY', 123),
  ('广告推广', '平台广告', 'EXP-MARKETING-PLATFORM', 131),
  ('广告推广', '社媒广告', 'EXP-MARKETING-SOCIAL', 132),
  ('广告推广', '红人合作', 'EXP-MARKETING-KOL', 133),
  ('广告推广', '内容制作', 'EXP-MARKETING-CONTENT', 134),
  ('软件与 AI 成本', 'AI 工具', 'EXP-SOFTWARE-AI-TOOL', 141),
  ('软件与 AI 成本', 'SaaS 软件', 'EXP-SOFTWARE-SAAS', 142),
  ('软件与 AI 成本', '云服务', 'EXP-SOFTWARE-CLOUD', 143),
  ('人工薪酬', '工资', 'EXP-LABOR-SALARY', 151),
  ('人工薪酬', '外包', 'EXP-LABOR-OUTSOURCE', 152),
  ('人工薪酬', '顾问费', 'EXP-LABOR-CONSULTANT', 153),
  ('办公行政', '办公用品', 'EXP-OFFICE-SUPPLY', 161),
  ('办公行政', '设备采购', 'EXP-OFFICE-EQUIPMENT', 162),
  ('办公行政', '通讯网络', 'EXP-OFFICE-NETWORK', 163),
  ('差旅招待', '交通', 'EXP-TRAVEL-TRANSPORT', 171),
  ('差旅招待', '住宿', 'EXP-TRAVEL-HOTEL', 172),
  ('差旅招待', '餐饮', 'EXP-TRAVEL-MEAL', 173),
  ('研发与产品', '设计费', 'EXP-RD-DESIGN', 181),
  ('研发与产品', '测试费', 'EXP-RD-TEST', 182),
  ('研发与产品', '专利商标', 'EXP-RD-IP', 183),
  ('税费手续费', '平台手续费', 'EXP-FEE-TAX-PLATFORM', 191),
  ('税费手续费', '支付手续费', 'EXP-FEE-TAX-PAYMENT', 192),
  ('税费手续费', '税费', 'EXP-FEE-TAX-TAX', 193)
) as child(parent_name, name, code, sort_order) on child.parent_name = parent.name
where parent.organization_id = '10000000-0000-4000-8000-000000000001'
  and parent.parent_id is null
on conflict (organization_id, parent_id, name) do nothing;

insert into public.finance_accounts (organization_id, name, account_type, currency, opening_balance, current_balance, is_active, metadata)
values
  ('10000000-0000-4000-8000-000000000001', '公司现金', 'cash', 'CNY', 0, 0, true, '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '公司银行账户', 'bank', 'CNY', 0, 0, true, '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '微信支付', 'wechat', 'CNY', 0, 0, true, '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '支付宝', 'alipay', 'CNY', 0, 0, true, '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', 'PayPal', 'paypal', 'USD', 0, 0, true, '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', 'Stripe', 'stripe', 'USD', 0, 0, true, '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', 'Amazon', 'amazon', 'USD', 0, 0, true, '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', 'Shopify', 'shopify', 'USD', 0, 0, true, '{}'::jsonb)
on conflict (organization_id, name) do nothing;
