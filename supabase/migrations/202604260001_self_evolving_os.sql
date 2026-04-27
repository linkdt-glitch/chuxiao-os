create table if not exists public.feedback_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_type text not null check (target_type in ('task', 'project', 'agent_output', 'prompt_run', 'approval', 'finance_record', 'file', 'sop', 'other')),
  target_id uuid,
  module text,
  rating integer check (rating between 1 and 5),
  feedback_type text not null check (feedback_type in ('useful', 'not_useful', 'correct', 'incorrect', 'accepted', 'rejected', 'edited', 'other')),
  content text,
  created_by uuid,
  actor_type text not null default 'human' check (actor_type in ('human', 'agent', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.review_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_type text not null check (review_type in ('project', 'task', 'agent', 'prompt', 'approval', 'finance', 'operation', 'other')),
  related_module text,
  related_record_type text,
  related_record_id uuid,
  title text not null,
  summary text,
  what_worked text,
  what_failed text,
  lessons_learned text,
  next_actions text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sop_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  scenario text,
  steps jsonb not null default '[]'::jsonb,
  related_module text,
  related_prompt_id uuid,
  related_agent_id uuid references public.agents(id) on delete set null,
  version text not null default '1.0',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  owner_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.improvement_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  suggestion_type text not null check (suggestion_type in ('finance', 'project', 'agent', 'prompt', 'workflow', 'risk', 'knowledge', 'governance', 'other')),
  source_event_id uuid references public.system_events(id) on delete set null,
  related_module text,
  related_record_type text,
  related_record_id uuid,
  title text not null,
  description text,
  impact_level text not null default 'medium' check (impact_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'new' check (status in ('new', 'accepted', 'rejected', 'in_progress', 'done')),
  suggested_by_type text not null default 'system' check (suggested_by_type in ('human', 'agent', 'system')),
  suggested_by uuid,
  assigned_to uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.files add column if not exists asset_type text;
alter table public.files add column if not exists tags text[];
alter table public.files add column if not exists summary text;

create index if not exists idx_feedback_org on public.feedback_records(organization_id);
create index if not exists idx_feedback_target on public.feedback_records(target_type, target_id);
create index if not exists idx_feedback_module on public.feedback_records(module);
create index if not exists idx_feedback_created on public.feedback_records(created_at desc);

create index if not exists idx_reviews_org on public.review_records(organization_id);
create index if not exists idx_reviews_type on public.review_records(review_type);
create index if not exists idx_reviews_module on public.review_records(related_module);
create index if not exists idx_reviews_created on public.review_records(created_at desc);

create index if not exists idx_sops_org on public.sop_records(organization_id);
create index if not exists idx_sops_module on public.sop_records(related_module);
create index if not exists idx_sops_status on public.sop_records(status);
create index if not exists idx_sops_created on public.sop_records(created_at desc);

create index if not exists idx_improvements_org on public.improvement_suggestions(organization_id);
create index if not exists idx_improvements_type on public.improvement_suggestions(suggestion_type);
create index if not exists idx_improvements_module on public.improvement_suggestions(related_module);
create index if not exists idx_improvements_status on public.improvement_suggestions(status);
create index if not exists idx_improvements_impact on public.improvement_suggestions(impact_level);
create index if not exists idx_improvements_created on public.improvement_suggestions(created_at desc);
create index if not exists idx_improvements_source_event on public.improvement_suggestions(source_event_id);

drop trigger if exists set_review_records_updated_at on public.review_records;
create trigger set_review_records_updated_at before update on public.review_records for each row execute function public.set_updated_at();
drop trigger if exists set_sop_records_updated_at on public.sop_records;
create trigger set_sop_records_updated_at before update on public.sop_records for each row execute function public.set_updated_at();
drop trigger if exists set_improvement_suggestions_updated_at on public.improvement_suggestions;
create trigger set_improvement_suggestions_updated_at before update on public.improvement_suggestions for each row execute function public.set_updated_at();

alter table public.feedback_records enable row level security;
alter table public.review_records enable row level security;
alter table public.sop_records enable row level security;
alter table public.improvement_suggestions enable row level security;

create policy "feedback org read" on public.feedback_records
for select using (public.is_org_member(organization_id));
create policy "feedback create member or agent" on public.feedback_records
for insert with check (
  public.is_org_member(organization_id)
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
);
create policy "feedback admin manage" on public.feedback_records
for update using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "reviews org read" on public.review_records
for select using (public.is_org_member(organization_id));
create policy "reviews create" on public.review_records
for insert with check (
  public.is_org_member(organization_id)
  and (
    public.has_org_permission(organization_id, 'review.create')
    or public.has_org_permission(organization_id, 'review_record.create')
  )
);
create policy "reviews update" on public.review_records
for update using (
  public.is_org_admin(organization_id)
  or created_by = public.current_member_id(organization_id)
  or public.has_org_permission(organization_id, 'review.update')
) with check (
  public.is_org_admin(organization_id)
  or created_by = public.current_member_id(organization_id)
  or public.has_org_permission(organization_id, 'review.update')
);

create policy "sops org read" on public.sop_records
for select using (public.is_org_member(organization_id));
create policy "sops create" on public.sop_records
for insert with check (
  public.is_org_member(organization_id)
  and (
    public.has_org_permission(organization_id, 'sop.create')
    or public.has_org_permission(organization_id, 'sop_record.create')
  )
);
create policy "sops update" on public.sop_records
for update using (
  public.is_org_admin(organization_id)
  or owner_id = public.current_member_id(organization_id)
  or created_by = public.current_member_id(organization_id)
  or public.has_org_permission(organization_id, 'sop.update')
) with check (
  public.is_org_admin(organization_id)
  or owner_id = public.current_member_id(organization_id)
  or created_by = public.current_member_id(organization_id)
  or public.has_org_permission(organization_id, 'sop.update')
);

create policy "improvements org read" on public.improvement_suggestions
for select using (public.is_org_member(organization_id));
create policy "improvements create" on public.improvement_suggestions
for insert with check (
  public.is_org_member(organization_id)
  and (
    suggested_by_type = 'system'
    or public.has_org_permission(organization_id, 'improvement.manage')
    or public.has_org_permission(organization_id, 'feedback.create')
  )
);
create policy "improvements manage" on public.improvement_suggestions
for update using (
  public.is_org_admin(organization_id)
  or public.has_org_permission(organization_id, 'improvement.manage')
) with check (
  public.is_org_admin(organization_id)
  or public.has_org_permission(organization_id, 'improvement.manage')
);

insert into public.permissions (key, name, module, action, risk_level, description)
values
  ('governance.view', '查看组织护航盾', 'governance', 'view', 'medium', '查看权限、审批、日志、事件和风险总览。'),
  ('governance.manage', '管理组织护航盾', 'governance', 'manage', 'high', '管理治理设置和风险规则。'),
  ('risk_rule.view', '查看风险规则', 'governance', 'view', 'medium', '查看风险规则。'),
  ('risk_rule.manage', '管理风险规则', 'governance', 'manage', 'high', '管理风险规则。'),
  ('knowledge.view', '查看组织大脑库', 'knowledge', 'view', 'low', '查看知识资产、SOP 和复盘。'),
  ('knowledge.manage', '管理组织大脑库', 'knowledge', 'manage', 'medium', '管理知识资产。'),
  ('sop.view', '查看 SOP', 'knowledge', 'view', 'low', '查看 SOP。'),
  ('sop.create', '创建 SOP', 'knowledge', 'create', 'medium', '创建 SOP。'),
  ('sop.update', '更新 SOP', 'knowledge', 'update', 'medium', '更新 SOP。'),
  ('review.view', '查看复盘', 'knowledge', 'view', 'low', '查看复盘记录。'),
  ('review.create', '创建复盘', 'knowledge', 'create', 'medium', '创建复盘记录。'),
  ('review.update', '更新复盘', 'knowledge', 'update', 'medium', '更新复盘记录。'),
  ('evolution.view', '查看成长飞轮', 'evolution', 'view', 'low', '查看反馈、复盘、SOP 和优化建议。'),
  ('evolution.manage', '管理成长飞轮', 'evolution', 'manage', 'medium', '管理成长飞轮配置。'),
  ('feedback.view', '查看反馈', 'evolution', 'view', 'low', '查看反馈记录。'),
  ('feedback.create', '创建反馈', 'evolution', 'create', 'low', '创建反馈记录。'),
  ('review_record.view', '查看复盘记录', 'evolution', 'view', 'low', '查看复盘记录。'),
  ('review_record.create', '创建复盘记录', 'evolution', 'create', 'medium', '创建复盘记录。'),
  ('sop_record.view', '查看 SOP 记录', 'evolution', 'view', 'low', '查看 SOP 记录。'),
  ('sop_record.create', '创建 SOP 记录', 'evolution', 'create', 'medium', '创建 SOP 记录。'),
  ('improvement.view', '查看优化建议', 'evolution', 'view', 'low', '查看优化建议。'),
  ('improvement.manage', '管理优化建议', 'evolution', 'manage', 'medium', '处理优化建议状态。'),
  ('ai_workforce.view', '查看智能劳动力中心', 'ai_workforce', 'view', 'medium', '查看 Agent、Prompt、AI 调用与人工确认总览。'),
  ('ai_workforce.manage', '管理智能劳动力中心', 'ai_workforce', 'manage', 'high', '管理 AI 工作中心配置。'),
  ('agent.view', '查看 Agent', 'ai_workforce', 'view', 'medium', '查看 Agent 档案和运行记录。'),
  ('agent.manage', '管理 Agent', 'ai_workforce', 'manage', 'high', '管理 Agent 配置。'),
  ('prompt.view', '查看 Prompt', 'ai_workforce', 'view', 'medium', '查看 Prompt 模板。'),
  ('prompt.manage', '管理 Prompt', 'ai_workforce', 'manage', 'high', '管理 Prompt 模板。')
on conflict (key) do update set
  name = excluded.name,
  module = excluded.module,
  action = excluded.action,
  risk_level = excluded.risk_level,
  description = excluded.description;

insert into public.modules (key, name, description, icon, category, status, route, required_permission)
values
  ('dashboard', '领航驾驶舱', '看全局、盯重点、早发现、快决策。', 'Compass', 'core', 'active', '/dashboard', 'dashboard.read'),
  ('finance', '经营能量舱', '收入、支出、利润、现金流、经营健康度。', 'WalletCards', 'core', 'active', '/finance', 'finance.view'),
  ('projects', '执行指挥舱', '项目、任务、负责人、人机协作、进度追踪。', 'ListTodo', 'future', 'coming_soon', '/projects', 'projects.read'),
  ('ai_workforce', '智能劳动力中心', 'Agent、Prompt、AI 调用、权限、质量、人工确认。', 'BrainCircuit', 'ai', 'active', '/ai-workforce', 'ai_workforce.view'),
  ('governance', '组织护航盾', '权限、审批、日志、事件和风险控制。', 'ShieldCheck', 'system', 'active', '/governance', 'governance.view'),
  ('knowledge', '组织大脑库', '文件、SOP、复盘、Prompt、Agent 输出和经验沉淀。', 'Library', 'core', 'active', '/knowledge', 'knowledge.view'),
  ('evolution', '成长飞轮引擎', '反馈、复盘、SOP 和优化建议，驱动组织持续进化。', 'RefreshCw', 'core', 'active', '/evolution', 'evolution.view')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  status = excluded.status,
  route = excluded.route,
  required_permission = excluded.required_permission;

insert into public.organization_modules (organization_id, module_id, is_enabled, settings)
select o.id, m.id,
  case when m.key in ('dashboard', 'finance', 'ai_workforce', 'governance', 'knowledge', 'evolution') then true else false end,
  '{}'::jsonb
from public.organizations o
join public.modules m on m.key in ('dashboard', 'finance', 'projects', 'ai_workforce', 'governance', 'knowledge', 'evolution')
on conflict (organization_id, module_id) do update set
  is_enabled = excluded.is_enabled;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'governance.view','governance.manage','risk_rule.view','risk_rule.manage',
  'knowledge.view','knowledge.manage','sop.view','sop.create','sop.update','review.view','review.create','review.update',
  'evolution.view','evolution.manage','feedback.view','feedback.create','review_record.view','review_record.create',
  'sop_record.view','sop_record.create','improvement.view','improvement.manage',
  'ai_workforce.view','ai_workforce.manage','agent.view','agent.manage','prompt.view','prompt.manage'
)
where r.key in ('owner', 'admin')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'governance.view',
  'knowledge.view','sop.view','sop.create','sop.update','review.view','review.create','review.update',
  'evolution.view','feedback.view','feedback.create','review_record.view','review_record.create',
  'sop_record.view','sop_record.create','improvement.view',
  'ai_workforce.view','agent.view','prompt.view'
)
where r.key = 'manager'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'knowledge.view','sop.view','review.view',
  'evolution.view','feedback.view','feedback.create','review_record.view','sop_record.view',
  'ai_workforce.view','agent.view','prompt.view'
)
where r.key = 'member'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'knowledge.view','evolution.view','feedback.create','ai_workforce.view','agent.view'
)
where r.key = 'agent'
on conflict (role_id, permission_id) do nothing;
