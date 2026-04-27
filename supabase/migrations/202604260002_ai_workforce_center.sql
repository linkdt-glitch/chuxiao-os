alter table public.agents add column if not exists default_provider_id uuid references public.ai_providers(id) on delete set null;
alter table public.agents add column if not exists last_run_at timestamptz;
alter table public.agents alter column permission_level set default 'L1';
alter table public.agents alter column status set default 'active';
alter table public.agents alter column allowed_modules set default '[]'::jsonb;
alter table public.agents alter column allowed_tools set default '[]'::jsonb;
alter table public.agents alter column config set default '{}'::jsonb;

alter table public.agent_run_logs add column if not exists related_module text;
alter table public.agent_run_logs add column if not exists related_record_type text;
alter table public.agent_run_logs add column if not exists related_record_id text;
alter table public.agent_run_logs add column if not exists ai_invocation_log_id uuid references public.ai_invocation_logs(id) on delete set null;
alter table public.agent_run_logs add column if not exists confirmation_request_id uuid;
alter table public.agent_run_logs add column if not exists created_by uuid;
alter table public.agent_run_logs drop constraint if exists agent_run_logs_status_check;
alter table public.agent_run_logs add constraint agent_run_logs_status_check
  check (status in ('success', 'failed', 'running', 'pending_confirmation', 'cancelled'));

alter table public.feedback_records drop constraint if exists feedback_records_target_type_check;
alter table public.feedback_records add constraint feedback_records_target_type_check
  check (target_type in ('task', 'project', 'agent_output', 'prompt_run', 'approval', 'finance_record', 'file', 'sop', 'agent_run', 'prompt_test_run', 'confirmation_request', 'ai_invocation', 'other'));

create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  scenario text not null default '',
  module text not null default 'ai_workforce',
  tags text[] not null default '{}'::text[],
  input_variables jsonb not null default '[]'::jsonb,
  output_format text not null default '',
  quality_criteria text not null default '',
  current_version text not null default '1.0',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  owner_id uuid references public.user_profiles(id) on delete set null,
  created_by uuid references public.organization_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prompt_template_id uuid not null references public.prompt_templates(id) on delete cascade,
  version text not null,
  content text not null,
  change_note text,
  created_by uuid references public.organization_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (prompt_template_id, version)
);

create table if not exists public.agent_prompt_bindings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  prompt_template_id uuid not null references public.prompt_templates(id) on delete cascade,
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references public.organization_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agent_id, prompt_template_id, prompt_version_id)
);

create table if not exists public.ai_confirmation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  prompt_template_id uuid references public.prompt_templates(id) on delete set null,
  requester_id uuid,
  requester_type text not null default 'human' check (requester_type in ('human', 'agent', 'system')),
  related_module text,
  related_record_type text,
  related_record_id text,
  action_type text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text,
  input_data jsonb not null default '{}'::jsonb,
  proposed_output jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  decided_by uuid references public.organization_members(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_test_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prompt_template_id uuid not null references public.prompt_templates(id) on delete cascade,
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  tested_by uuid references public.organization_members(id) on delete set null,
  test_input jsonb not null default '{}'::jsonb,
  test_output text not null default '',
  ai_invocation_log_id uuid references public.ai_invocation_logs(id) on delete set null,
  rating integer check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.agent_run_logs
  drop constraint if exists agent_run_logs_confirmation_request_id_fkey;
alter table public.agent_run_logs
  add constraint agent_run_logs_confirmation_request_id_fkey
  foreign key (confirmation_request_id) references public.ai_confirmation_requests(id) on delete set null;

create index if not exists idx_agents_org_owner on public.agents(organization_id, owner_user_id);
create index if not exists idx_agents_default_provider on public.agents(default_provider_id);
create index if not exists idx_agents_last_run on public.agents(organization_id, last_run_at desc);
create index if not exists idx_prompt_templates_org on public.prompt_templates(organization_id);
create index if not exists idx_prompt_templates_status on public.prompt_templates(organization_id, status);
create index if not exists idx_prompt_templates_owner on public.prompt_templates(organization_id, owner_id);
create index if not exists idx_prompt_templates_module on public.prompt_templates(organization_id, module);
create index if not exists idx_prompt_templates_created on public.prompt_templates(organization_id, created_at desc);
create index if not exists idx_prompt_versions_prompt on public.prompt_versions(prompt_template_id, created_at desc);
create index if not exists idx_prompt_versions_org on public.prompt_versions(organization_id);
create index if not exists idx_agent_prompt_bindings_agent on public.agent_prompt_bindings(organization_id, agent_id);
create index if not exists idx_agent_prompt_bindings_prompt on public.agent_prompt_bindings(organization_id, prompt_template_id);
create index if not exists idx_ai_confirmations_org_status on public.ai_confirmation_requests(organization_id, status);
create index if not exists idx_ai_confirmations_agent on public.ai_confirmation_requests(organization_id, agent_id);
create index if not exists idx_ai_confirmations_prompt on public.ai_confirmation_requests(organization_id, prompt_template_id);
create index if not exists idx_ai_confirmations_risk on public.ai_confirmation_requests(organization_id, risk_level);
create index if not exists idx_ai_confirmations_created on public.ai_confirmation_requests(organization_id, created_at desc);
create index if not exists idx_agent_runs_org_status on public.agent_run_logs(organization_id, status);
create index if not exists idx_agent_runs_org_created on public.agent_run_logs(organization_id, created_at desc);
create index if not exists idx_agent_runs_confirmation on public.agent_run_logs(confirmation_request_id);
create index if not exists idx_prompt_test_runs_org on public.prompt_test_runs(organization_id, created_at desc);
create index if not exists idx_prompt_test_runs_prompt on public.prompt_test_runs(organization_id, prompt_template_id);

drop trigger if exists set_prompt_templates_updated_at on public.prompt_templates;
create trigger set_prompt_templates_updated_at before update on public.prompt_templates for each row execute function public.set_updated_at();
drop trigger if exists set_ai_confirmation_requests_updated_at on public.ai_confirmation_requests;
create trigger set_ai_confirmation_requests_updated_at before update on public.ai_confirmation_requests for each row execute function public.set_updated_at();

alter table public.prompt_templates enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.agent_prompt_bindings enable row level security;
alter table public.ai_confirmation_requests enable row level security;
alter table public.prompt_test_runs enable row level security;

create policy "prompt templates org read" on public.prompt_templates
for select using (public.is_org_member(organization_id));
create policy "prompt templates create" on public.prompt_templates
for insert with check (
  public.is_org_member(organization_id)
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and (
    public.has_org_permission(organization_id, 'prompt.create')
    or public.has_org_permission(organization_id, 'prompt.update')
    or public.has_org_permission(organization_id, 'prompt.publish')
    or owner_id = auth.uid()
  )
);
create policy "prompt templates update scoped" on public.prompt_templates
for update using (
  public.is_org_admin(organization_id)
  or public.has_org_permission(organization_id, 'ai_workforce.manage')
  or public.has_org_permission(organization_id, 'prompt.update')
  or owner_id = auth.uid()
) with check (
  public.is_org_admin(organization_id)
  or public.has_org_permission(organization_id, 'ai_workforce.manage')
  or public.has_org_permission(organization_id, 'prompt.update')
  or owner_id = auth.uid()
);

create policy "prompt versions org read" on public.prompt_versions
for select using (public.is_org_member(organization_id));
create policy "prompt versions create" on public.prompt_versions
for insert with check (
  public.is_org_member(organization_id)
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and (
    public.has_org_permission(organization_id, 'prompt.create')
    or public.has_org_permission(organization_id, 'prompt.update')
  )
);

create policy "agent prompt bindings org read" on public.agent_prompt_bindings
for select using (public.is_org_member(organization_id));
create policy "agent prompt bindings manage" on public.agent_prompt_bindings
for all using (
  public.is_org_admin(organization_id)
  or public.has_org_permission(organization_id, 'agent.update')
  or public.has_org_permission(organization_id, 'ai_workforce.manage')
) with check (
  public.is_org_admin(organization_id)
  or public.has_org_permission(organization_id, 'agent.update')
  or public.has_org_permission(organization_id, 'ai_workforce.manage')
);

create policy "confirmations org read" on public.ai_confirmation_requests
for select using (public.is_org_member(organization_id));
create policy "confirmations create member or agent" on public.ai_confirmation_requests
for insert with check (
  public.is_org_member(organization_id)
  and (
    requester_type in ('human', 'system')
    or agent_id is not null
  )
);
create policy "confirmations human decide" on public.ai_confirmation_requests
for update using (
  coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and (
    public.is_org_admin(organization_id)
    or public.has_org_permission(organization_id, 'ai_confirmation.approve')
    or public.has_org_permission(organization_id, 'ai_confirmation.reject')
  )
) with check (
  coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and (
    public.is_org_admin(organization_id)
    or public.has_org_permission(organization_id, 'ai_confirmation.approve')
    or public.has_org_permission(organization_id, 'ai_confirmation.reject')
  )
);

create policy "prompt test runs org read" on public.prompt_test_runs
for select using (public.is_org_member(organization_id));
create policy "prompt test runs create" on public.prompt_test_runs
for insert with check (
  public.is_org_member(organization_id)
  and public.has_org_permission(organization_id, 'prompt.test')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
);
create policy "prompt test runs update own rating" on public.prompt_test_runs
for update using (
  public.is_org_admin(organization_id)
  or tested_by = public.current_member_id(organization_id)
) with check (
  public.is_org_admin(organization_id)
  or tested_by = public.current_member_id(organization_id)
);

create policy "agents manager update own" on public.agents
for update using (
  public.is_org_admin(organization_id)
  or (
    public.has_org_permission(organization_id, 'agent.update')
    and owner_user_id = auth.uid()
  )
) with check (
  public.is_org_admin(organization_id)
  or (
    public.has_org_permission(organization_id, 'agent.update')
    and owner_user_id = auth.uid()
  )
);

create policy "agent runs scoped update" on public.agent_run_logs
for update using (
  public.is_org_admin(organization_id)
  or public.has_org_permission(organization_id, 'agent.run')
) with check (
  public.is_org_admin(organization_id)
  or public.has_org_permission(organization_id, 'agent.run')
);

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

insert into public.permissions (key, name, module, action, risk_level, description)
values
  ('ai_workforce.view', '查看智能劳动力中心', 'ai_workforce', 'view', 'medium', '查看 Agent、Prompt、AI 调用与人工确认总览。'),
  ('ai_workforce.manage', '管理智能劳动力中心', 'ai_workforce', 'manage', 'high', '管理 AI 工作中心配置。'),
  ('agent.view', '查看 Agent', 'ai_workforce', 'view', 'medium', '查看 Agent 档案和运行记录。'),
  ('prompt.view', '查看 Prompt', 'ai_workforce', 'view', 'medium', '查看 Prompt 模板。')
on conflict (key) do update set
  name = excluded.name,
  module = excluded.module,
  action = excluded.action,
  risk_level = excluded.risk_level,
  description = excluded.description;

insert into public.modules (key, name, description, icon, category, status, route, required_permission)
values ('ai_workforce', '智能劳动力中心', 'Agent、Prompt、AI 调用、权限、质量、人工确认。', 'BrainCircuit', 'ai', 'active', '/ai-workforce', 'ai_workforce.view')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  status = excluded.status,
  route = excluded.route,
  required_permission = excluded.required_permission;

insert into public.organization_modules (organization_id, module_id, is_enabled, settings)
select o.id, m.id, true, '{}'::jsonb
from public.organizations o
join public.modules m on m.key = 'ai_workforce'
on conflict (organization_id, module_id) do update set is_enabled = true;

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

update public.agents
set permission_level = 'L1',
    allowed_modules = '["finance"]'::jsonb,
    description = '分析收入、支出、利润和异常。'
where id = '50000000-0000-4000-8000-000000000001';

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
