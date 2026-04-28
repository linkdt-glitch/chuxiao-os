create or replace function public.has_org_permission(target_org_id uuid, permission_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with current_member as (
    select om.id as member_id, om.role_id, r.key as role_key
    from public.organization_members om
    join public.roles r on r.id = om.role_id
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
    limit 1
  )
  select coalesce(
    exists (
      select 1
      from current_member
      where role_key in ('owner', 'admin')
        or (role_key = 'finance_lead' and permission_key like 'finance.%')
    ),
    false
  )
  or coalesce(
    exists (
      select 1
      from current_member cm
      join public.role_permissions rp on rp.role_id = cm.role_id
      join public.permissions p on p.id = rp.permission_id
      where p.key = permission_key
    ),
    false
  )
  or coalesce(
    exists (
      select 1
      from current_member cm
      join public.member_permissions mp on mp.member_id = cm.member_id
      join public.permissions p on p.id = mp.permission_id
      where p.key = permission_key and mp.effect = 'allow'
    ),
    false
  );
$$;

drop policy if exists "tasks update scoped" on public.tasks;
create policy "tasks update scoped" on public.tasks
for update using (
  public.has_org_permission(organization_id, 'tasks.update')
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
  public.has_org_permission(organization_id, 'tasks.update')
  and status <> 'archived'
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
);

drop policy if exists "project reviews upsert" on public.project_reviews;
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

create or replace function public.apply_task_archive_approval(target_approval_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  approval_row public.approval_requests;
  task_row public.tasks;
begin
  select *
  into approval_row
  from public.approval_requests
  where id = target_approval_id
    and related_module = 'tasks'
    and related_record_type = 'task'
    and status = 'approved'
    and metadata->>'action' = 'archive_task';

  if approval_row.id is null then
    raise exception 'Task archive approval is not approved or not found';
  end if;

  if not public.has_org_permission(approval_row.organization_id, 'projects.manage') then
    raise exception 'Missing permission: projects.manage';
  end if;

  update public.tasks
  set status = 'archived'
  where id = approval_row.related_record_id::uuid
    and organization_id = approval_row.organization_id
  returning *
  into task_row;

  if task_row.id is null then
    raise exception 'Task not found for approval';
  end if;

  return task_row;
end;
$$;
