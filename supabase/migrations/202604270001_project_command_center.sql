create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  owner_id uuid references public.organization_members(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed')),
  start_date timestamptz,
  due_date timestamptz,
  priority integer not null default 3 check (priority between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  assigned_to uuid references public.organization_members(id) on delete set null,
  status text not null default 'to_do' check (status in ('to_do', 'in_progress', 'completed', 'archived')),
  due_date timestamptz,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  comment_text text not null,
  commenter_id uuid references public.organization_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_id uuid references public.files(id) on delete set null,
  file_url text,
  file_name text not null,
  uploaded_by uuid references public.organization_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  summary text not null,
  successful_factors text,
  failure_factors text,
  lessons_learned text,
  next_actions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists idx_projects_org_status on public.projects(organization_id, status);
create index if not exists idx_projects_owner on public.projects(owner_id);
create index if not exists idx_projects_due on public.projects(due_date);
create index if not exists idx_tasks_org_project on public.tasks(organization_id, project_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_task_comments_task on public.task_comments(task_id, created_at desc);
create index if not exists idx_task_files_task on public.task_files(task_id, created_at desc);
create index if not exists idx_project_reviews_project on public.project_reviews(project_id);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists set_project_reviews_updated_at on public.project_reviews;
create trigger set_project_reviews_updated_at before update on public.project_reviews for each row execute function public.set_updated_at();

create or replace function public.can_view_project(project_row public.projects)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_org_member(project_row.organization_id)
    and (
      public.current_role_key(project_row.organization_id) in ('owner', 'admin')
      or project_row.owner_id = public.current_member_id(project_row.organization_id)
      or exists (
        select 1
        from public.tasks t
        where t.project_id = project_row.id
          and t.assigned_to = public.current_member_id(project_row.organization_id)
      )
    );
$$;

create or replace function public.can_view_task(task_row public.tasks)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_org_member(task_row.organization_id)
    and (
      public.current_role_key(task_row.organization_id) in ('owner', 'admin')
      or task_row.assigned_to = public.current_member_id(task_row.organization_id)
      or exists (
        select 1
        from public.projects p
        where p.id = task_row.project_id
          and p.owner_id = public.current_member_id(task_row.organization_id)
      )
    );
$$;

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_files enable row level security;
alter table public.project_reviews enable row level security;

create policy "projects scoped read" on public.projects
for select using (public.can_view_project(projects));

create policy "projects create" on public.projects
for insert with check (
  public.has_org_permission(organization_id, 'projects.manage')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and (
    public.current_role_key(organization_id) in ('owner', 'admin')
    or owner_id = public.current_member_id(organization_id)
  )
);

create policy "projects update scoped" on public.projects
for update using (
  public.has_org_permission(organization_id, 'projects.manage')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and (
    public.current_role_key(organization_id) in ('owner', 'admin')
    or owner_id = public.current_member_id(organization_id)
  )
) with check (
  public.has_org_permission(organization_id, 'projects.manage')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and (
    public.current_role_key(organization_id) in ('owner', 'admin')
    or owner_id = public.current_member_id(organization_id)
  )
);

create policy "tasks scoped read" on public.tasks
for select using (public.can_view_task(tasks));

create policy "tasks create in owned project" on public.tasks
for insert with check (
  public.has_org_permission(organization_id, 'tasks.create')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.organization_id = organization_id
      and (
        public.current_role_key(organization_id) in ('owner', 'admin')
        or p.owner_id = public.current_member_id(organization_id)
      )
  )
);

create policy "tasks update scoped" on public.tasks
for update using (
  (public.has_org_permission(organization_id, 'tasks.update') or public.has_org_permission(organization_id, 'tasks.archive'))
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and (
    public.current_role_key(organization_id) in ('owner', 'admin')
    or assigned_to = public.current_member_id(organization_id)
    or exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.owner_id = public.current_member_id(organization_id)
    )
  )
) with check (
  (
    public.has_org_permission(organization_id, 'tasks.update')
    or (status = 'archived' and public.has_org_permission(organization_id, 'tasks.archive'))
  )
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
);

create policy "tasks delete manage" on public.tasks
for delete using (
  public.has_org_permission(organization_id, 'tasks.delete')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and public.current_role_key(organization_id) in ('owner', 'admin')
);

create policy "task comments scoped read" on public.task_comments
for select using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and public.can_view_task(t)
  )
);

create policy "task comments create" on public.task_comments
for insert with check (
  public.has_org_permission(organization_id, 'tasks.comment')
  and commenter_id = public.current_member_id(organization_id)
  and exists (
    select 1 from public.tasks t
    where t.id = task_id
      and t.organization_id = organization_id
      and public.can_view_task(t)
  )
);

create policy "task files scoped read" on public.task_files
for select using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and public.can_view_task(t)
  )
);

create policy "task files create" on public.task_files
for insert with check (
  public.has_org_permission(organization_id, 'tasks.files')
  and uploaded_by = public.current_member_id(organization_id)
  and exists (
    select 1 from public.tasks t
    where t.id = task_id
      and t.organization_id = organization_id
      and public.can_view_task(t)
  )
);

create policy "project reviews scoped read" on public.project_reviews
for select using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and public.can_view_project(p)
  )
);

create policy "project reviews upsert" on public.project_reviews
for all using (
  public.has_org_permission(organization_id, 'projects.manage')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.organization_id = organization_id
      and (
        public.current_role_key(organization_id) in ('owner', 'admin')
        or p.owner_id = public.current_member_id(organization_id)
      )
  )
) with check (
  public.has_org_permission(organization_id, 'projects.manage')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
);

create policy "approvals tasks approver update" on public.approval_requests
for update using (
  related_module in ('projects', 'tasks')
  and public.has_org_permission(organization_id, 'projects.manage')
) with check (
  related_module in ('projects', 'tasks')
  and public.has_org_permission(organization_id, 'projects.manage')
);

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

insert into public.modules (key, name, description, icon, category, status, route, required_permission)
values ('projects', '执行指挥舱', '项目管理、任务分配、进度追踪、评论附件和项目复盘。', 'ListTodo', 'core', 'active', '/projects', 'projects.view')
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
join public.modules m on m.key = 'projects'
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
