insert into public.permissions (key, name, module, action, risk_level, description)
values
  ('dashboard.read', '查看工作台', 'dashboard', 'read', 'low', '查看组织工作台。'),
  ('organization.manage', '管理组织', 'organization', 'manage', 'high', '更新组织、成员和成员状态。'),
  ('roles.manage', '管理角色权限', 'roles', 'manage', 'critical', '创建角色和修改权限矩阵。'),
  ('modules.manage', '管理模块', 'modules', 'manage', 'medium', '启用或停用组织模块。'),
  ('approvals.manage', '处理审批', 'approvals', 'manage', 'high', '批准、驳回、取消审批。'),
  ('approvals.create', '提交审批', 'approvals', 'create', 'low', '创建审批申请。'),
  ('logs.read', '查看日志', 'logs', 'read', 'medium', '查看审计日志。'),
  ('events.read', '查看事件', 'events', 'read', 'medium', '查看系统事件。'),
  ('files.manage', '管理文件', 'files', 'manage', 'medium', '上传、删除和关联文件。'),
  ('ai.manage', '管理 AI Provider', 'ai-settings', 'manage', 'critical', '配置 AI Provider 和模型。'),
  ('agents.manage', '管理 Agent', 'agents', 'manage', 'high', '创建、暂停、配置 Agent。'),
  ('settings.manage', '管理系统设置', 'settings', 'manage', 'critical', '管理安全、审批和组织设置。')
on conflict (key) do update set
  name = excluded.name,
  module = excluded.module,
  action = excluded.action,
  risk_level = excluded.risk_level,
  description = excluded.description;

insert into public.modules (key, name, description, icon, category, status, route, required_permission)
values
  ('dashboard', '领航驾驶舱', '看全局、盯重点、早发现、快决策。', 'LayoutDashboard', 'core', 'active', '/dashboard', 'dashboard.read'),
  ('organization', '组织与成员', '组织信息、人类员工与 Agent 成员管理。', 'Building2', 'system', 'active', '/organization', 'organization.manage'),
  ('roles', '权限与角色', '统一角色、权限矩阵与授权规则。', 'ShieldCheck', 'system', 'active', '/roles', 'roles.manage'),
  ('modules', '模块管理', '模块注册、启用停用与模块设置。', 'Blocks', 'system', 'active', '/modules', 'modules.manage'),
  ('approvals', '审批中心', '风险操作审批和审批策略。', 'ClipboardCheck', 'system', 'active', '/approvals', 'approvals.manage'),
  ('logs', '操作日志', '关键操作审计追踪。', 'ScrollText', 'system', 'active', '/logs', 'logs.read'),
  ('events', '事件中心', '统一事件收集、处理状态与 payload。', 'RadioTower', 'system', 'active', '/events', 'events.read'),
  ('files', '文件中心', '文件资产、权限和多对象关联。', 'FolderOpen', 'core', 'active', '/files', 'files.manage'),
  ('ai-settings', 'AI Provider 设置', 'AI Provider 抽象、模型与调用日志。', 'Sparkles', 'ai', 'active', '/ai-settings', 'ai.manage'),
  ('agents', 'Agent 档案', 'Agent 身份、负责人、权限等级与运行日志。', 'Bot', 'ai', 'active', '/agents', 'agents.manage'),
  ('settings', '系统设置', '组织、安全、审批规则与模块入口设置。', 'Settings', 'system', 'active', '/settings', 'settings.manage')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  status = excluded.status,
  route = excluded.route,
  required_permission = excluded.required_permission;
