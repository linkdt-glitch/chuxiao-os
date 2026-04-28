create or replace function public.finance_can_view_record(target_record public.finance_records)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_member uuid;
  current_department uuid;
begin
  if not public.is_org_member(target_record.organization_id) then
    return false;
  end if;

  if public.has_org_permission(target_record.organization_id, 'finance.view_all') then
    return true;
  end if;

  current_member := public.current_member_id(target_record.organization_id);

  if target_record.submitted_by = current_member or target_record.member_id = current_member then
    return true;
  end if;

  if public.has_org_permission(target_record.organization_id, 'finance.view_team') then
    select nullif(om.metadata->>'department_id', '')::uuid
      into current_department
    from public.organization_members om
    where om.id = current_member;

    if current_department is not null and target_record.department_id = current_department then
      return true;
    end if;

    return exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_record.organization_id
        and om.id in (target_record.submitted_by, target_record.member_id)
        and (
          om.metadata->>'manager_member_id' = current_member::text
          or om.metadata->>'team_lead_member_id' = current_member::text
        )
    );
  end if;

  return false;
end;
$$;

drop policy if exists "finance records scoped read" on public.finance_records;
create policy "finance records scoped read" on public.finance_records
for select using (public.finance_can_view_record(finance_records));

create or replace function public.finance_settle_record(target_record_id uuid, actor_member_id uuid)
returns public.finance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  record_row public.finance_records;
  delta numeric(14, 2);
begin
  select *
    into record_row
  from public.finance_records
  where id = target_record_id
  for update;

  if not found then
    raise exception 'Finance record not found';
  end if;

  if not public.has_org_permission(record_row.organization_id, 'finance.approve')
     and not public.has_org_permission(record_row.organization_id, 'finance.account.manage') then
    raise exception 'Missing permission: finance.approve';
  end if;

  if record_row.status = 'paid' then
    return record_row;
  end if;

  if record_row.status <> 'approved' then
    raise exception 'Only approved finance records can be settled';
  end if;

  if record_row.account_id is null then
    raise exception 'Cannot settle finance record without account_id';
  end if;

  if record_row.record_type in ('income', 'refund') then
    delta := record_row.amount;
  elsif record_row.record_type in ('expense', 'reimbursement') then
    delta := -record_row.amount;
  else
    raise exception 'Record type % cannot be settled in MVP', record_row.record_type;
  end if;

  update public.finance_accounts
  set current_balance = current_balance + delta
  where id = record_row.account_id
    and organization_id = record_row.organization_id;

  update public.finance_records
  set
    status = 'paid',
    approved_by = coalesce(approved_by, actor_member_id),
    reimbursed = case when record_type = 'reimbursement' or reimbursement_required then true else reimbursed end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'paid_at', now(),
      'paid_by', actor_member_id,
      'account_delta', delta
    )
  where id = target_record_id
  returning * into record_row;

  return record_row;
end;
$$;

grant execute on function public.finance_can_view_record(public.finance_records) to authenticated;
grant execute on function public.finance_settle_record(uuid, uuid) to authenticated;
