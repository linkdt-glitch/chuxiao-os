create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  is_system boolean not null default false,
  risk_rank integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete cascade,
  agent_id uuid,
  role_id uuid not null references public.roles(id),
  member_type text not null check (member_type in ('human', 'agent', 'system')),
  display_name text not null,
  email text,
  status text not null default 'active' check (status in ('active', 'disabled', 'invited')),
  owner_user_id uuid references public.user_profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_actor_check check (
    (member_type = 'human' and user_id is not null and agent_id is null)
    or (member_type = 'agent' and agent_id is not null and owner_user_id is not null)
    or (member_type = 'system')
  )
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  module text not null,
  action text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table public.member_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, permission_id)
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default 'Blocks',
  category text not null default 'core',
  status text not null check (status in ('active', 'coming_soon', 'disabled')),
  route text not null,
  required_permission text not null,
  config_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  is_enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, module_id)
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_id uuid,
  requester_type text not null check (requester_type in ('human', 'agent', 'system')),
  title text not null,
  description text,
  related_module text not null,
  related_record_type text,
  related_record_id text,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  step_order integer not null default 1,
  approver_member_id uuid references public.organization_members(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'skipped')),
  decided_at timestamptz,
  comment text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  module text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  is_active boolean not null default true,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid,
  actor_type text not null check (actor_type in ('human', 'agent', 'system')),
  event_key text not null,
  action text not null,
  module text not null,
  related_record_type text,
  related_record_id text,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.system_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_key text not null,
  event_source text not null check (event_source in ('human', 'agent', 'system')),
  actor_id uuid,
  actor_type text not null check (actor_type in ('human', 'agent', 'system')),
  module text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'processed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  checksum text,
  visibility text not null default 'organization' check (visibility in ('organization', 'restricted')),
  uploaded_by uuid,
  uploaded_by_type text not null check (uploaded_by_type in ('human', 'agent', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, storage_bucket, storage_path)
);

create table public.file_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  module text not null,
  record_type text not null,
  record_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (file_id, module, record_type, record_id)
);

create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_name text not null check (provider_name in ('openai', 'anthropic', 'google', 'local')),
  label text not null,
  api_key_encrypted text,
  base_url text,
  model_name text not null,
  is_active boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_invocation_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_id uuid references public.ai_providers(id) on delete set null,
  invoked_by uuid,
  invoked_by_type text not null check (invoked_by_type in ('human', 'agent', 'system')),
  module text not null,
  prompt_preview text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_estimate numeric(12, 6) not null default 0,
  status text not null check (status in ('success', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  owner_user_id uuid not null references public.user_profiles(id),
  permission_level text not null check (permission_level in ('L1', 'L2', 'L3', 'L4', 'L5')),
  allowed_modules jsonb not null default '[]'::jsonb,
  allowed_tools jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_members
  add constraint organization_members_agent_id_fkey foreign key (agent_id) references public.agents(id) on delete cascade;

create table public.agent_run_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  run_type text not null,
  status text not null check (status in ('success', 'failed', 'running')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create index idx_members_org_user on public.organization_members(organization_id, user_id);
create index idx_members_org_status on public.organization_members(organization_id, status);
create index idx_role_permissions_role on public.role_permissions(role_id);
create index idx_member_permissions_member on public.member_permissions(member_id);
create index idx_org_modules_org on public.organization_modules(organization_id, is_enabled);
create index idx_approvals_org_status on public.approval_requests(organization_id, status);
create index idx_audit_org_created on public.audit_logs(organization_id, created_at desc);
create index idx_events_org_status on public.system_events(organization_id, status);
create index idx_files_org on public.files(organization_id, created_at desc);
create index idx_file_links_record on public.file_links(organization_id, module, record_type, record_id);
create index idx_ai_logs_org_created on public.ai_invocation_logs(organization_id, created_at desc);
create index idx_agents_org_status on public.agents(organization_id, status);
create index idx_agent_runs_agent on public.agent_run_logs(agent_id, started_at desc);
create index idx_settings_org_key on public.system_settings(organization_id, key);

create trigger set_user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_roles_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger set_members_updated_at before update on public.organization_members for each row execute function public.set_updated_at();
create trigger set_permissions_updated_at before update on public.permissions for each row execute function public.set_updated_at();
create trigger set_role_permissions_updated_at before update on public.role_permissions for each row execute function public.set_updated_at();
create trigger set_member_permissions_updated_at before update on public.member_permissions for each row execute function public.set_updated_at();
create trigger set_modules_updated_at before update on public.modules for each row execute function public.set_updated_at();
create trigger set_org_modules_updated_at before update on public.organization_modules for each row execute function public.set_updated_at();
create trigger set_approval_requests_updated_at before update on public.approval_requests for each row execute function public.set_updated_at();
create trigger set_approval_steps_updated_at before update on public.approval_steps for each row execute function public.set_updated_at();
create trigger set_approval_policies_updated_at before update on public.approval_policies for each row execute function public.set_updated_at();
create trigger set_system_events_updated_at before update on public.system_events for each row execute function public.set_updated_at();
create trigger set_files_updated_at before update on public.files for each row execute function public.set_updated_at();
create trigger set_file_links_updated_at before update on public.file_links for each row execute function public.set_updated_at();
create trigger set_ai_providers_updated_at before update on public.ai_providers for each row execute function public.set_updated_at();
create trigger set_agents_updated_at before update on public.agents for each row execute function public.set_updated_at();
create trigger set_agent_run_logs_updated_at before update on public.agent_run_logs for each row execute function public.set_updated_at();
create trigger set_system_settings_updated_at before update on public.system_settings for each row execute function public.set_updated_at();

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
      and status = 'active'
      and member_type = 'human'
  );
$$;

create or replace function public.current_role_key(target_org_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select r.key
  from public.organization_members om
  join public.roles r on r.id = om.role_id
  where om.organization_id = target_org_id
    and om.user_id = auth.uid()
    and om.status = 'active'
  limit 1;
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_role_key(target_org_id) in ('owner', 'admin'), false);
$$;

alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.member_permissions enable row level security;
alter table public.modules enable row level security;
alter table public.organization_modules enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_steps enable row level security;
alter table public.approval_policies enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_events enable row level security;
alter table public.files enable row level security;
alter table public.file_links enable row level security;
alter table public.ai_providers enable row level security;
alter table public.ai_invocation_logs enable row level security;
alter table public.agents enable row level security;
alter table public.agent_run_logs enable row level security;
alter table public.system_settings enable row level security;

create policy "profiles read self" on public.user_profiles for select using (id = auth.uid() or exists (select 1 from public.organization_members om where om.user_id = user_profiles.id and public.is_org_member(om.organization_id)));
create policy "profiles update self" on public.user_profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations member read" on public.organizations for select using (public.is_org_member(id));
create policy "organizations admin update" on public.organizations for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy "permissions read" on public.permissions for select using (true);
create policy "modules read" on public.modules for select using (true);

create policy "members org read" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "members admin write" on public.organization_members for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "roles org read" on public.roles for select using (public.is_org_member(organization_id));
create policy "roles owner admin write" on public.roles for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "role_permissions org read" on public.role_permissions for select using (public.is_org_member(organization_id));
create policy "role_permissions admin write" on public.role_permissions for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "member_permissions org read" on public.member_permissions for select using (public.is_org_member(organization_id));
create policy "member_permissions admin write" on public.member_permissions for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "org_modules org read" on public.organization_modules for select using (public.is_org_member(organization_id));
create policy "org_modules admin write" on public.organization_modules for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "approvals org read" on public.approval_requests for select using (public.is_org_member(organization_id));
create policy "approvals member create" on public.approval_requests for insert with check (public.is_org_member(organization_id));
create policy "approvals admin update" on public.approval_requests for update using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "approval_steps org read" on public.approval_steps for select using (public.is_org_member(organization_id));
create policy "approval_steps admin write" on public.approval_steps for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "approval_policies org read" on public.approval_policies for select using (public.is_org_member(organization_id));
create policy "approval_policies admin write" on public.approval_policies for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "audit_logs org read" on public.audit_logs for select using (public.is_org_member(organization_id));
create policy "audit_logs append only" on public.audit_logs for insert with check (public.is_org_member(organization_id));

create policy "events org read" on public.system_events for select using (public.is_org_member(organization_id));
create policy "events member insert" on public.system_events for insert with check (public.is_org_member(organization_id));
create policy "events admin update" on public.system_events for update using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "files org read" on public.files for select using (public.is_org_member(organization_id));
create policy "files member insert" on public.files for insert with check (public.is_org_member(organization_id));
create policy "files admin update delete" on public.files for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "file_links org read" on public.file_links for select using (public.is_org_member(organization_id));
create policy "file_links member insert" on public.file_links for insert with check (public.is_org_member(organization_id));
create policy "file_links admin write" on public.file_links for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "ai_providers org read" on public.ai_providers for select using (public.is_org_member(organization_id));
create policy "ai_providers admin write" on public.ai_providers for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "ai_logs org read" on public.ai_invocation_logs for select using (public.is_org_member(organization_id));
create policy "ai_logs insert" on public.ai_invocation_logs for insert with check (public.is_org_member(organization_id));

create policy "agents org read" on public.agents for select using (public.is_org_member(organization_id));
create policy "agents admin write" on public.agents for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "agent_runs org read" on public.agent_run_logs for select using (public.is_org_member(organization_id));
create policy "agent_runs insert" on public.agent_run_logs for insert with check (public.is_org_member(organization_id));

create policy "settings org read" on public.system_settings for select using (public.is_org_member(organization_id));
create policy "settings admin write" on public.system_settings for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

revoke select (api_key_encrypted) on public.ai_providers from anon, authenticated;
