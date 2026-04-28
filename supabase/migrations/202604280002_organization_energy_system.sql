create table if not exists public.organization_energy_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete set null,
  source_event_id uuid references public.system_events(id) on delete set null,
  event_key text not null,
  source_module text,
  source_record_type text,
  source_record_id uuid,
  energy_points integer not null default 0,
  animation_type text not null check (animation_type in ('toast', 'sparkle', 'confetti', 'fireworks', 'badge', 'flywheel', 'glow', 'none')),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.achievement_badges (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  category text not null check (category in ('finance', 'execution', 'ai', 'knowledge', 'evolution', 'habit')),
  icon text,
  level text not null default 'bronze' check (level in ('bronze', 'silver', 'gold', 'platinum')),
  condition jsonb not null default '{}'::jsonb,
  energy_points integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  achievement_badge_id uuid not null references public.achievement_badges(id) on delete cascade,
  related_module text,
  related_record_type text,
  related_record_id uuid,
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, user_id, achievement_badge_id)
);

create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  streak_type text not null check (streak_type in ('login', 'bookkeeping', 'task_completion', 'review')),
  current_count integer not null default 0,
  longest_count integer not null default 0,
  last_active_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, streak_type)
);

create table if not exists public.energy_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete cascade,
  animations_enabled boolean not null default true,
  sounds_enabled boolean not null default true,
  sound_volume numeric not null default 0.2 check (sound_volume >= 0 and sound_volume <= 1),
  focus_mode boolean not null default false,
  daily_motivation_enabled boolean not null default true,
  large_celebrations_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_energy_events_org on public.organization_energy_events(organization_id);
create index if not exists idx_energy_events_user on public.organization_energy_events(user_id);
create index if not exists idx_energy_events_key on public.organization_energy_events(event_key);
create index if not exists idx_energy_events_source on public.organization_energy_events(source_event_id);
create index if not exists idx_energy_events_module on public.organization_energy_events(source_module);
create index if not exists idx_energy_events_created on public.organization_energy_events(created_at desc);
create unique index if not exists idx_energy_events_source_unique on public.organization_energy_events(source_event_id) where source_event_id is not null;

create index if not exists idx_user_achievements_org on public.user_achievements(organization_id);
create index if not exists idx_user_achievements_user on public.user_achievements(user_id);
create index if not exists idx_user_achievements_badge on public.user_achievements(achievement_badge_id);
create index if not exists idx_user_achievements_earned on public.user_achievements(earned_at desc);

create index if not exists idx_user_streaks_org on public.user_streaks(organization_id);
create index if not exists idx_user_streaks_user on public.user_streaks(user_id);
create index if not exists idx_user_streaks_type on public.user_streaks(streak_type);

create index if not exists idx_energy_settings_org on public.energy_settings(organization_id);
create index if not exists idx_energy_settings_user on public.energy_settings(user_id);
create unique index if not exists idx_energy_settings_org_unique on public.energy_settings(organization_id) where user_id is null;
create unique index if not exists idx_energy_settings_user_unique on public.energy_settings(organization_id, user_id) where user_id is not null;

drop trigger if exists set_energy_settings_updated_at on public.energy_settings;
create trigger set_energy_settings_updated_at before update on public.energy_settings for each row execute function public.set_updated_at();

drop trigger if exists set_user_streaks_updated_at on public.user_streaks;
create trigger set_user_streaks_updated_at before update on public.user_streaks for each row execute function public.set_updated_at();

alter table public.organization_energy_events enable row level security;
alter table public.achievement_badges enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_streaks enable row level security;
alter table public.energy_settings enable row level security;

drop policy if exists "energy events org read" on public.organization_energy_events;
create policy "energy events org read" on public.organization_energy_events
for select using (public.is_org_member(organization_id));

drop policy if exists "energy events create member" on public.organization_energy_events;
create policy "energy events create member" on public.organization_energy_events
for insert with check (public.is_org_member(organization_id));

drop policy if exists "achievement badges read" on public.achievement_badges;
create policy "achievement badges read" on public.achievement_badges
for select using (is_active = true);

drop policy if exists "user achievements org read" on public.user_achievements;
create policy "user achievements org read" on public.user_achievements
for select using (public.is_org_member(organization_id));

drop policy if exists "user achievements create self" on public.user_achievements;
create policy "user achievements create self" on public.user_achievements
for insert with check (
  public.is_org_member(organization_id)
  and (user_id = auth.uid() or public.is_org_admin(organization_id))
);

drop policy if exists "user streaks org read" on public.user_streaks;
create policy "user streaks org read" on public.user_streaks
for select using (public.is_org_member(organization_id));

drop policy if exists "user streaks write self" on public.user_streaks;
create policy "user streaks write self" on public.user_streaks
for all using (
  public.is_org_member(organization_id)
  and (user_id = auth.uid() or public.is_org_admin(organization_id))
) with check (
  public.is_org_member(organization_id)
  and (user_id = auth.uid() or public.is_org_admin(organization_id))
);

drop policy if exists "energy settings scoped read" on public.energy_settings;
create policy "energy settings scoped read" on public.energy_settings
for select using (
  public.is_org_member(organization_id)
  and (user_id is null or user_id = auth.uid() or public.is_org_admin(organization_id))
);

drop policy if exists "energy settings write scoped" on public.energy_settings;
create policy "energy settings write scoped" on public.energy_settings
for all using (
  public.is_org_member(organization_id)
  and (
    (user_id = auth.uid())
    or (user_id is null and public.is_org_admin(organization_id))
  )
) with check (
  public.is_org_member(organization_id)
  and (
    (user_id = auth.uid())
    or (user_id is null and public.is_org_admin(organization_id))
  )
);

insert into public.permissions (key, name, module, action, risk_level, description)
values
  ('energy.view', '查看组织能量系统', 'energy', 'view', 'low', '查看组织能量、成就、连续使用和近期奖励。'),
  ('energy.manage', '管理组织能量设置', 'energy', 'manage', 'medium', '管理组织级动画、音效和庆祝规则。')
on conflict (key) do update set
  name = excluded.name,
  module = excluded.module,
  action = excluded.action,
  risk_level = excluded.risk_level,
  description = excluded.description;

insert into public.modules (key, name, description, icon, category, status, route, required_permission)
values
  ('energy', '组织能量系统', '记录小动作、里程碑和成就，让组织成长被看见。', 'Gem', 'core', 'active', '/energy', 'energy.view')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  status = excluded.status,
  route = excluded.route,
  required_permission = excluded.required_permission;

insert into public.organization_modules (organization_id, module_id, is_enabled, settings)
select o.id, m.id, true, '{"celebration_style":"calm"}'::jsonb
from public.organizations o
join public.modules m on m.key = 'energy'
on conflict (organization_id, module_id) do update set
  is_enabled = excluded.is_enabled;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in ('energy.view', 'energy.manage')
where r.key in ('owner', 'admin')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key = 'energy.view'
where r.key in ('manager', 'member')
on conflict (role_id, permission_id) do nothing;

insert into public.achievement_badges (key, name, description, category, icon, level, condition, energy_points, is_active)
values
  ('finance_first_record', '首次记账', '完成第一笔收入或支出记录。', 'finance', 'ReceiptText', 'bronze', '{"event_key":"finance.record.created","count":1}'::jsonb, 1, true),
  ('finance_ten_records', '完成 10 笔记账', '经营数据开始形成连续记忆。', 'finance', 'WalletCards', 'silver', '{"event_key":"finance.record.created","count":10}'::jsonb, 5, true),
  ('finance_month_closed', '完成月度财务归档', '月度经营记忆已沉淀。', 'finance', 'Archive', 'gold', '{"event_key":"finance.month_closed","count":1}'::jsonb, 10, true),
  ('execution_first_task', '完成第一个任务', '执行飞轮完成一次推进。', 'execution', 'CheckCircle2', 'bronze', '{"event_key":"tasks.completed","count":1}'::jsonb, 2, true),
  ('execution_ten_tasks', '完成 10 个任务', '团队执行开始形成稳定节奏。', 'execution', 'ListChecks', 'silver', '{"event_key":"tasks.completed","count":10}'::jsonb, 8, true),
  ('execution_first_project', '完成第一个项目', '从计划走到结果的一次完整闭环。', 'execution', 'Rocket', 'gold', '{"event_key":"projects.completed","count":1}'::jsonb, 20, true),
  ('ai_first_agent', '创建第一个 Agent', '第一位数字同事已加入组织。', 'ai', 'Bot', 'bronze', '{"event_key":"ai_workforce.agent.created","count":1}'::jsonb, 5, true),
  ('ai_first_prompt', '发布第一个 Prompt', 'AI 工作方法开始沉淀为资产。', 'ai', 'MessageSquareText', 'silver', '{"event_key":"ai_workforce.prompt.published","count":1}'::jsonb, 5, true),
  ('ai_first_run', 'Agent 首次运行成功', '数字劳动力贡献了第一次价值。', 'ai', 'Sparkles', 'bronze', '{"event_key":"ai_workforce.agent_run.completed","count":1}'::jsonb, 3, true),
  ('knowledge_first_file', '上传第一个文件', '组织记忆增加了一份。', 'knowledge', 'FolderOpen', 'bronze', '{"event_key":"knowledge.asset.created","count":1}'::jsonb, 2, true),
  ('knowledge_first_sop', '创建第一个 SOP', '经验开始变得可复制。', 'knowledge', 'Workflow', 'silver', '{"event_key":"sop.created","count":1}'::jsonb, 10, true),
  ('knowledge_first_review', '完成第一次复盘', '经验已进入成长飞轮。', 'knowledge', 'RefreshCw', 'silver', '{"event_key":"review.created","count":1}'::jsonb, 8, true),
  ('evolution_first_improvement', '采纳第一个优化建议', '组织流程开始主动升级。', 'evolution', 'Lightbulb', 'gold', '{"event_key":"improvement.status_changed","status":["accepted","done"],"count":1}'::jsonb, 10, true),
  ('evolution_closed_loop', '完成一次完整闭环', '反馈、复盘、SOP 与优化建议完成一次组织进化闭环。', 'evolution', 'Orbit', 'platinum', '{"type":"closed_loop"}'::jsonb, 30, true),
  ('habit_seven_day_login', '连续登录 7 天', '让系统每天多记住一点。', 'habit', 'Sunrise', 'gold', '{"streak_type":"login","count":7}'::jsonb, 10, true)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  level = excluded.level,
  condition = excluded.condition,
  energy_points = excluded.energy_points,
  is_active = excluded.is_active;

insert into public.energy_settings (organization_id, user_id)
select o.id, null
from public.organizations o
on conflict do nothing;
