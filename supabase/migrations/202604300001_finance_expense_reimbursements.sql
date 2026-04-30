-- 初晓 OS 报销审批增量升级
-- 只新增报销审批相关表、权限、RLS、默认规则和事务函数。

begin;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  manager_member_id uuid references public.organization_members(id) on delete set null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.finance_categories add column if not exists expense_enabled boolean not null default false;
alter table public.finance_categories add column if not exists single_amount_limit numeric(14, 2);
alter table public.finance_categories add column if not exists monthly_budget_hint numeric(14, 2);

create table if not exists public.finance_expense_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_no text not null,
  title text not null,
  submitter_member_id uuid not null references public.organization_members(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'pending_manager', 'pending_finance', 'approved', 'paid', 'rejected', 'need_revision', 'withdrawn', 'cancelled')),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  currency text not null default 'CNY',
  occurred_at date not null default current_date,
  submitted_at timestamptz,
  approved_at timestamptz,
  paid_at date,
  payment_reference text,
  current_step text,
  current_approver_role text,
  finance_record_id uuid references public.finance_records(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, report_no)
);

create table if not exists public.finance_expense_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_report_id uuid not null references public.finance_expense_reports(id) on delete cascade,
  category_id uuid references public.finance_categories(id) on delete set null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'CNY',
  occurred_at date not null default current_date,
  merchant_name text,
  description text not null default '',
  ocr_raw_data jsonb not null default '{}'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_expense_approval_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_report_id uuid not null references public.finance_expense_reports(id) on delete cascade,
  step_order integer not null default 1,
  step_key text not null,
  label text not null,
  approver_role_key text,
  approver_member_id uuid references public.organization_members(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'need_revision', 'skipped')),
  comment text,
  decided_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_expense_approval_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  min_amount numeric(14, 2) not null default 0,
  max_amount numeric(14, 2),
  steps jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.finance_department_budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  budget_month date not null,
  category_id uuid references public.finance_categories(id) on delete set null,
  amount numeric(14, 2) not null default 0,
  currency text not null default 'CNY',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, department_id, budget_month, category_id)
);

create table if not exists public.finance_expense_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_member_id uuid not null references public.organization_members(id) on delete cascade,
  name text not null,
  category_id uuid references public.finance_categories(id) on delete set null,
  amount numeric(14, 2),
  merchant_name text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, owner_member_id, name)
);

create index if not exists idx_departments_org_active on public.departments(organization_id, is_active);
create index if not exists idx_finance_categories_expense_enabled on public.finance_categories(organization_id, expense_enabled, is_active);
create index if not exists idx_expense_reports_org_status on public.finance_expense_reports(organization_id, status, created_at desc);
create index if not exists idx_expense_reports_submitter on public.finance_expense_reports(organization_id, submitter_member_id, created_at desc);
create index if not exists idx_expense_reports_department on public.finance_expense_reports(organization_id, department_id, occurred_at desc);
create index if not exists idx_expense_reports_occurred on public.finance_expense_reports(organization_id, occurred_at desc);
create index if not exists idx_expense_items_report on public.finance_expense_items(expense_report_id, created_at);
create index if not exists idx_expense_items_org_category on public.finance_expense_items(organization_id, category_id, occurred_at desc);
create index if not exists idx_expense_items_duplicate on public.finance_expense_items(organization_id, merchant_name, amount, occurred_at);
create index if not exists idx_expense_steps_report on public.finance_expense_approval_steps(expense_report_id, step_order);
create index if not exists idx_expense_rules_org_active on public.finance_expense_approval_rules(organization_id, is_active, min_amount, max_amount);
create index if not exists idx_department_budgets_org_month on public.finance_department_budgets(organization_id, budget_month, department_id);
create index if not exists idx_expense_templates_owner on public.finance_expense_templates(organization_id, owner_member_id);

drop trigger if exists set_departments_updated_at on public.departments;
create trigger set_departments_updated_at before update on public.departments for each row execute function public.set_updated_at();
drop trigger if exists set_finance_expense_reports_updated_at on public.finance_expense_reports;
create trigger set_finance_expense_reports_updated_at before update on public.finance_expense_reports for each row execute function public.set_updated_at();
drop trigger if exists set_finance_expense_items_updated_at on public.finance_expense_items;
create trigger set_finance_expense_items_updated_at before update on public.finance_expense_items for each row execute function public.set_updated_at();
drop trigger if exists set_finance_expense_steps_updated_at on public.finance_expense_approval_steps;
create trigger set_finance_expense_steps_updated_at before update on public.finance_expense_approval_steps for each row execute function public.set_updated_at();
drop trigger if exists set_finance_expense_rules_updated_at on public.finance_expense_approval_rules;
create trigger set_finance_expense_rules_updated_at before update on public.finance_expense_approval_rules for each row execute function public.set_updated_at();
drop trigger if exists set_finance_department_budgets_updated_at on public.finance_department_budgets;
create trigger set_finance_department_budgets_updated_at before update on public.finance_department_budgets for each row execute function public.set_updated_at();
drop trigger if exists set_finance_expense_templates_updated_at on public.finance_expense_templates;
create trigger set_finance_expense_templates_updated_at before update on public.finance_expense_templates for each row execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.finance_expense_reports enable row level security;
alter table public.finance_expense_items enable row level security;
alter table public.finance_expense_approval_steps enable row level security;
alter table public.finance_expense_approval_rules enable row level security;
alter table public.finance_department_budgets enable row level security;
alter table public.finance_expense_templates enable row level security;

drop policy if exists "departments read" on public.departments;
create policy "departments read" on public.departments for select using (public.is_org_member(organization_id));
drop policy if exists "departments manage" on public.departments;
create policy "departments manage" on public.departments for all
using (public.has_org_permission(organization_id, 'finance.expense.manage') or public.has_org_permission(organization_id, 'organization.manage'))
with check (public.has_org_permission(organization_id, 'finance.expense.manage') or public.has_org_permission(organization_id, 'organization.manage'));

drop policy if exists "expense reports read scoped" on public.finance_expense_reports;
create policy "expense reports read scoped" on public.finance_expense_reports
for select using (
  public.is_org_member(organization_id)
  and (
    submitter_member_id = public.current_member_id(organization_id)
    or public.has_org_permission(organization_id, 'finance.view_all')
    or public.has_org_permission(organization_id, 'finance.expense.approve')
    or public.has_org_permission(organization_id, 'finance.expense.pay')
    or public.has_org_permission(organization_id, 'finance.expense.manage')
  )
);

drop policy if exists "expense reports create own" on public.finance_expense_reports;
create policy "expense reports create own" on public.finance_expense_reports
for insert with check (
  public.is_org_member(organization_id)
  and submitter_member_id = public.current_member_id(organization_id)
  and public.has_org_permission(organization_id, 'finance.expense.create')
);

drop policy if exists "expense reports update scoped" on public.finance_expense_reports;
create policy "expense reports update scoped" on public.finance_expense_reports
for update using (
  public.is_org_member(organization_id)
  and (
    (submitter_member_id = public.current_member_id(organization_id) and status in ('draft', 'submitted', 'need_revision'))
    or public.has_org_permission(organization_id, 'finance.expense.approve')
    or public.has_org_permission(organization_id, 'finance.expense.pay')
    or public.has_org_permission(organization_id, 'finance.expense.manage')
  )
) with check (
  public.is_org_member(organization_id)
  and (
    submitter_member_id = public.current_member_id(organization_id)
    or public.has_org_permission(organization_id, 'finance.expense.approve')
    or public.has_org_permission(organization_id, 'finance.expense.pay')
    or public.has_org_permission(organization_id, 'finance.expense.manage')
  )
);

drop policy if exists "expense items read scoped" on public.finance_expense_items;
create policy "expense items read scoped" on public.finance_expense_items
for select using (
  exists (
    select 1 from public.finance_expense_reports r
    where r.id = expense_report_id
      and r.organization_id = organization_id
  )
);

drop policy if exists "expense items create own" on public.finance_expense_items;
create policy "expense items create own" on public.finance_expense_items
for insert with check (
  public.is_org_member(organization_id)
  and exists (
    select 1 from public.finance_expense_reports r
    where r.id = expense_report_id
      and r.organization_id = organization_id
      and r.submitter_member_id = public.current_member_id(organization_id)
      and r.status in ('draft', 'need_revision')
  )
);

drop policy if exists "expense items update own" on public.finance_expense_items;
create policy "expense items update own" on public.finance_expense_items
for update using (
  public.is_org_member(organization_id)
  and exists (
    select 1 from public.finance_expense_reports r
    where r.id = expense_report_id
      and r.organization_id = organization_id
      and (
        (r.submitter_member_id = public.current_member_id(organization_id) and r.status in ('draft', 'need_revision'))
        or public.has_org_permission(organization_id, 'finance.expense.manage')
      )
  )
) with check (
  public.is_org_member(organization_id)
  and exists (
    select 1 from public.finance_expense_reports r
    where r.id = expense_report_id
      and r.organization_id = organization_id
      and (
        r.submitter_member_id = public.current_member_id(organization_id)
        or public.has_org_permission(organization_id, 'finance.expense.manage')
      )
  )
);

drop policy if exists "expense steps read scoped" on public.finance_expense_approval_steps;
create policy "expense steps read scoped" on public.finance_expense_approval_steps
for select using (public.is_org_member(organization_id));
drop policy if exists "expense steps update approver" on public.finance_expense_approval_steps;
create policy "expense steps update approver" on public.finance_expense_approval_steps
for update using (
  public.has_org_permission(organization_id, 'finance.expense.approve')
  or public.has_org_permission(organization_id, 'finance.expense.manage')
) with check (
  public.has_org_permission(organization_id, 'finance.expense.approve')
  or public.has_org_permission(organization_id, 'finance.expense.manage')
);

drop policy if exists "expense rules read" on public.finance_expense_approval_rules;
create policy "expense rules read" on public.finance_expense_approval_rules for select using (public.is_org_member(organization_id));
drop policy if exists "expense rules manage" on public.finance_expense_approval_rules;
create policy "expense rules manage" on public.finance_expense_approval_rules for all
using (public.has_org_permission(organization_id, 'finance.expense.manage'))
with check (public.has_org_permission(organization_id, 'finance.expense.manage'));

drop policy if exists "department budgets read" on public.finance_department_budgets;
create policy "department budgets read" on public.finance_department_budgets for select using (public.is_org_member(organization_id));
drop policy if exists "department budgets manage" on public.finance_department_budgets;
create policy "department budgets manage" on public.finance_department_budgets for all
using (public.has_org_permission(organization_id, 'finance.expense.manage'))
with check (public.has_org_permission(organization_id, 'finance.expense.manage'));

drop policy if exists "expense templates read own" on public.finance_expense_templates;
create policy "expense templates read own" on public.finance_expense_templates
for select using (
  public.is_org_member(organization_id)
  and (owner_member_id = public.current_member_id(organization_id) or public.has_org_permission(organization_id, 'finance.expense.manage'))
);
drop policy if exists "expense templates manage own" on public.finance_expense_templates;
create policy "expense templates manage own" on public.finance_expense_templates
for all using (
  public.is_org_member(organization_id)
  and (owner_member_id = public.current_member_id(organization_id) or public.has_org_permission(organization_id, 'finance.expense.manage'))
) with check (
  public.is_org_member(organization_id)
  and (owner_member_id = public.current_member_id(organization_id) or public.has_org_permission(organization_id, 'finance.expense.manage'))
);

insert into public.permissions (key, name, module, action, risk_level, description)
values
  ('finance.expense.view', '查看报销单', 'finance', 'expense.view', 'low', '查看自己的报销单和审批进度。'),
  ('finance.expense.create', '创建报销单', 'finance', 'expense.create', 'medium', '创建报销草稿并提交审批。'),
  ('finance.expense.update', '编辑报销单', 'finance', 'expense.update', 'medium', '编辑草稿或需要修改的报销单。'),
  ('finance.expense.approve', '审批报销单', 'finance', 'expense.approve', 'high', '在财务中心批准、驳回或要求补充材料。'),
  ('finance.expense.pay', '标记报销付款', 'finance', 'expense.pay', 'high', '批量标记已批准报销为已付款。'),
  ('finance.expense.manage', '管理报销配置', 'finance', 'expense.manage', 'high', '管理部门、预算、类别和审批规则。'),
  ('finance.expense.export', '导出报销对账', 'finance', 'expense.export', 'medium', '导出月度报销对账 Excel。')
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
  'finance.expense.view',
  'finance.expense.create',
  'finance.expense.update',
  'finance.expense.approve',
  'finance.expense.pay',
  'finance.expense.manage',
  'finance.expense.export'
)
where r.key in ('owner', 'admin')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in ('finance.expense.view', 'finance.expense.create', 'finance.expense.update')
where r.key = 'member'
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.key = 'manager'
  and p.key in ('finance.approve', 'finance.expense.approve', 'finance.expense.pay', 'finance.expense.manage');

with orgs as (select id as organization_id from public.organizations)
insert into public.departments (organization_id, name, code, metadata)
select organization_id, name, code, '{"seeded_default": true}'::jsonb
from orgs
cross join (values
  ('综合管理部', 'GENERAL'),
  ('运营部', 'OPS'),
  ('产品研发部', 'PRODUCT'),
  ('财务部', 'FINANCE')
) as d(name, code)
on conflict (organization_id, name) do nothing;

update public.finance_categories
set
  expense_enabled = true,
  single_amount_limit = coalesce(single_amount_limit, case
    when name in ('差旅与招待', '差旅招待', '交通', '住宿') then 2000
    when name in ('餐饮') then 500
    when name in ('办公与行政', '办公行政', '办公用品') then 1000
    when name in ('软件、AI 与云服务', '软件与 AI 成本', 'AI 工具', 'SaaS 软件') then 3000
    else 1000
  end)
where type in ('expense', 'both')
  and (
    name in ('差旅与招待', '差旅招待', '交通', '住宿', '餐饮', '办公与行政', '办公行政', '办公用品', '软件、AI 与云服务', '软件与 AI 成本', 'AI 工具', 'SaaS 软件', '其他支出')
    or code in ('EXP-TRAVEL', 'EXP-TRAVEL-TRANSPORT', 'EXP-TRAVEL-HOTEL', 'EXP-TRAVEL-MEAL', 'EXP-OFFICE', 'EXP-OFFICE-SUPPLY', 'EXP-SOFTWARE-AI', 'EXP-SOFTWARE-AI-TOOL')
  );

with orgs as (select id as organization_id from public.organizations)
insert into public.finance_expense_approval_rules (organization_id, name, min_amount, max_amount, steps, metadata)
select organization_id, name, min_amount, max_amount, steps::jsonb, '{"seeded_default": true}'::jsonb
from orgs
cross join (values
  ('1000 元以下：管理员快速审批', 0::numeric, 999.99::numeric, '[{"step_key":"manager_review","label":"一级审批","approver_role_key":"admin"}]'),
  ('1000-4999 元：管理员与财务复核', 1000::numeric, 4999.99::numeric, '[{"step_key":"manager_review","label":"一级审批","approver_role_key":"admin"},{"step_key":"finance_review","label":"财务复核","approver_role_key":"admin"}]'),
  ('5000 元以上：高额审批链', 5000::numeric, null::numeric, '[{"step_key":"manager_review","label":"一级审批","approver_role_key":"admin"},{"step_key":"finance_review","label":"财务复核","approver_role_key":"admin"},{"step_key":"owner_review","label":"Owner 复核","approver_role_key":"owner"}]')
) as r(name, min_amount, max_amount, steps)
on conflict (organization_id, name) do nothing;

create or replace function public.finance_next_expense_report_no(target_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  month_key text := to_char(now(), 'YYYYMM');
  current_count integer;
begin
  select count(*)
    into current_count
  from public.finance_expense_reports
  where organization_id = target_org_id
    and report_no like 'EXP-' || month_key || '-%';

  return 'EXP-' || month_key || '-' || lpad((current_count + 1)::text, 4, '0');
end;
$$;

create or replace function public.finance_expense_status_for_step(step_key text)
returns text
language sql
immutable
as $$
  select case
    when step_key = 'manager_review' then 'pending_manager'
    when step_key in ('finance_review', 'owner_review') then 'pending_finance'
    else 'pending_finance'
  end;
$$;

create or replace function public.finance_submit_expense_report(target_report_id uuid, actor_member_id uuid)
returns public.finance_expense_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.finance_expense_reports;
  total numeric(14, 2);
  rule_row public.finance_expense_approval_rules;
  first_step_key text;
begin
  select *
    into report_row
  from public.finance_expense_reports
  where id = target_report_id
  for update;

  if not found then
    raise exception 'Expense report not found';
  end if;

  if actor_member_id <> report_row.submitter_member_id
     and not public.has_org_permission(report_row.organization_id, 'finance.expense.manage') then
    raise exception 'Missing permission: finance.expense.create';
  end if;

  if report_row.status not in ('draft', 'submitted', 'need_revision') then
    raise exception 'Only draft, submitted or need_revision reports can be submitted';
  end if;

  select coalesce(sum(amount), 0)
    into total
  from public.finance_expense_items
  where expense_report_id = report_row.id;

  if total <= 0 then
    raise exception 'Expense report amount must be greater than 0';
  end if;

  select *
    into rule_row
  from public.finance_expense_approval_rules
  where organization_id = report_row.organization_id
    and is_active = true
    and total >= min_amount
    and (max_amount is null or total <= max_amount)
  order by min_amount desc
  limit 1;

  delete from public.finance_expense_approval_steps
  where expense_report_id = report_row.id;

  if found and jsonb_array_length(coalesce(rule_row.steps, '[]'::jsonb)) > 0 then
    insert into public.finance_expense_approval_steps (
      organization_id,
      expense_report_id,
      step_order,
      step_key,
      label,
      approver_role_key,
      status
    )
    select
      report_row.organization_id,
      report_row.id,
      ordinality::integer,
      coalesce(step->>'step_key', 'finance_review'),
      coalesce(step->>'label', '审批'),
      coalesce(step->>'approver_role_key', 'admin'),
      'pending'
    from jsonb_array_elements(rule_row.steps) with ordinality as s(step, ordinality);
  else
    insert into public.finance_expense_approval_steps (
      organization_id,
      expense_report_id,
      step_order,
      step_key,
      label,
      approver_role_key,
      status
    )
    values (
      report_row.organization_id,
      report_row.id,
      1,
      'manager_review',
      '一级审批',
      'admin',
      'pending'
    );
  end if;

  select step_key
    into first_step_key
  from public.finance_expense_approval_steps
  where expense_report_id = report_row.id
  order by step_order
  limit 1;

  update public.finance_expense_reports
  set
    status = public.finance_expense_status_for_step(first_step_key),
    total_amount = total,
    submitted_at = now(),
    current_step = first_step_key,
    current_approver_role = (
      select approver_role_key
      from public.finance_expense_approval_steps
      where expense_report_id = report_row.id
      order by step_order
      limit 1
    ),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('approval_rule_id', rule_row.id)
  where id = report_row.id
  returning * into report_row;

  insert into public.audit_logs (organization_id, actor_id, actor_type, event_key, action, module, related_record_type, related_record_id, after_data)
  values (report_row.organization_id, actor_member_id, 'human', 'finance.expense.submitted', 'submit', 'finance', 'finance_expense_report', report_row.id::text, to_jsonb(report_row));

  insert into public.system_events (organization_id, event_key, event_source, actor_id, actor_type, module, payload, status)
  values (report_row.organization_id, 'finance.expense.submitted', 'human', actor_member_id, 'human', 'finance', jsonb_build_object('id', report_row.id, 'report_no', report_row.report_no, 'amount', report_row.total_amount), 'new');

  return report_row;
end;
$$;

create or replace function public.finance_decide_expense_report(target_report_id uuid, decision text, decision_comment text, actor_member_id uuid)
returns public.finance_expense_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.finance_expense_reports;
  step_row public.finance_expense_approval_steps;
  next_step public.finance_expense_approval_steps;
  next_status text;
begin
  if decision not in ('approved', 'rejected', 'need_revision') then
    raise exception 'Unsupported decision %', decision;
  end if;

  select *
    into report_row
  from public.finance_expense_reports
  where id = target_report_id
  for update;

  if not found then
    raise exception 'Expense report not found';
  end if;

  if not public.has_org_permission(report_row.organization_id, 'finance.expense.approve') then
    raise exception 'Missing permission: finance.expense.approve';
  end if;

  select *
    into step_row
  from public.finance_expense_approval_steps
  where expense_report_id = report_row.id
    and status = 'pending'
  order by step_order
  limit 1
  for update;

  if not found then
    raise exception 'No pending approval step';
  end if;

  update public.finance_expense_approval_steps
  set
    status = decision,
    approver_member_id = actor_member_id,
    comment = coalesce(decision_comment, ''),
    decided_at = now()
  where id = step_row.id;

  if decision = 'rejected' then
    update public.finance_expense_reports
    set
      status = 'rejected',
      current_step = null,
      current_approver_role = null,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('reject_reason', coalesce(decision_comment, ''))
    where id = report_row.id
    returning * into report_row;
  elsif decision = 'need_revision' then
    update public.finance_expense_reports
    set
      status = 'need_revision',
      current_step = null,
      current_approver_role = null,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('revision_reason', coalesce(decision_comment, ''))
    where id = report_row.id
    returning * into report_row;
  else
    select *
      into next_step
    from public.finance_expense_approval_steps
    where expense_report_id = report_row.id
      and status = 'pending'
    order by step_order
    limit 1;

    if found then
      next_status := public.finance_expense_status_for_step(next_step.step_key);
      update public.finance_expense_reports
      set
        status = next_status,
        current_step = next_step.step_key,
        current_approver_role = next_step.approver_role_key
      where id = report_row.id
      returning * into report_row;
    else
      update public.finance_expense_reports
      set
        status = 'approved',
        current_step = null,
        current_approver_role = null,
        approved_at = now()
      where id = report_row.id
      returning * into report_row;
    end if;
  end if;

  insert into public.audit_logs (organization_id, actor_id, actor_type, event_key, action, module, related_record_type, related_record_id, after_data)
  values (report_row.organization_id, actor_member_id, 'human', 'finance.expense.' || decision, decision, 'finance', 'finance_expense_report', report_row.id::text, to_jsonb(report_row));

  insert into public.system_events (organization_id, event_key, event_source, actor_id, actor_type, module, payload, status)
  values (report_row.organization_id, 'finance.expense.' || decision, 'human', actor_member_id, 'human', 'finance', jsonb_build_object('id', report_row.id, 'status', report_row.status, 'comment', decision_comment), 'new');

  return report_row;
end;
$$;

create or replace function public.finance_withdraw_expense_report(target_report_id uuid, actor_member_id uuid)
returns public.finance_expense_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.finance_expense_reports;
begin
  select *
    into report_row
  from public.finance_expense_reports
  where id = target_report_id
  for update;

  if not found then
    raise exception 'Expense report not found';
  end if;

  if report_row.submitter_member_id <> actor_member_id then
    raise exception 'Only submitter can withdraw expense report';
  end if;

  if report_row.status not in ('submitted', 'pending_manager') then
    raise exception 'Only submitted or pending_manager reports can be withdrawn';
  end if;

  update public.finance_expense_reports
  set status = 'draft', current_step = null, current_approver_role = null
  where id = target_report_id
  returning * into report_row;

  update public.finance_expense_approval_steps
  set status = 'skipped', comment = 'submitter withdrawn', decided_at = now()
  where expense_report_id = target_report_id
    and status = 'pending';

  insert into public.audit_logs (organization_id, actor_id, actor_type, event_key, action, module, related_record_type, related_record_id, after_data)
  values (report_row.organization_id, actor_member_id, 'human', 'finance.expense.withdrawn', 'withdraw', 'finance', 'finance_expense_report', report_row.id::text, to_jsonb(report_row));

  insert into public.system_events (organization_id, event_key, event_source, actor_id, actor_type, module, payload, status)
  values (report_row.organization_id, 'finance.expense.withdrawn', 'human', actor_member_id, 'human', 'finance', jsonb_build_object('id', report_row.id), 'new');

  return report_row;
end;
$$;

create or replace function public.finance_mark_expense_reports_paid(target_report_ids uuid[], paid_on date, payment_ref text, actor_member_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.finance_expense_reports;
  target_id uuid;
  updated_count integer := 0;
  month_key text;
  record_count integer;
  new_record_id uuid;
  new_record_no text;
begin
  foreach target_id in array target_report_ids loop
    select *
      into report_row
    from public.finance_expense_reports
    where id = target_id
    for update;

    if not found then
      continue;
    end if;

    if not public.has_org_permission(report_row.organization_id, 'finance.expense.pay') then
      raise exception 'Missing permission: finance.expense.pay';
    end if;

    if report_row.status <> 'approved' then
      continue;
    end if;

    new_record_id := report_row.finance_record_id;
    if new_record_id is null then
      month_key := to_char(now(), 'YYYYMM');
      select count(*) into record_count
      from public.finance_records
      where organization_id = report_row.organization_id
        and record_no like 'FIN-' || month_key || '-%';

      new_record_no := 'FIN-' || month_key || '-' || lpad((record_count + 1)::text, 4, '0');

      insert into public.finance_records (
        organization_id,
        record_no,
        record_type,
        status,
        amount,
        currency,
        occurred_at,
        department_id,
        member_id,
        submitted_by,
        approved_by,
        reimbursement_required,
        reimbursed,
        risk_level,
        source,
        related_module,
        related_record_type,
        related_record_id,
        description,
        metadata
      )
      values (
        report_row.organization_id,
        new_record_no,
        'reimbursement',
        'paid',
        report_row.total_amount,
        report_row.currency,
        report_row.occurred_at,
        report_row.department_id,
        report_row.submitter_member_id,
        report_row.submitter_member_id,
        actor_member_id,
        true,
        true,
        'low',
        'manual',
        'finance',
        'finance_expense_report',
        report_row.id::text,
        '报销付款：' || report_row.title,
        jsonb_build_object('expense_report_id', report_row.id, 'payment_reference', coalesce(payment_ref, ''))
      )
      returning id into new_record_id;
    end if;

    update public.finance_expense_reports
    set
      status = 'paid',
      paid_at = coalesce(paid_on, current_date),
      payment_reference = coalesce(payment_ref, ''),
      finance_record_id = new_record_id,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('paid_by', actor_member_id)
    where id = report_row.id
    returning * into report_row;

    insert into public.audit_logs (organization_id, actor_id, actor_type, event_key, action, module, related_record_type, related_record_id, after_data)
    values (report_row.organization_id, actor_member_id, 'human', 'finance.expense.paid', 'paid', 'finance', 'finance_expense_report', report_row.id::text, to_jsonb(report_row));

    insert into public.system_events (organization_id, event_key, event_source, actor_id, actor_type, module, payload, status)
    values (report_row.organization_id, 'finance.expense.paid', 'human', actor_member_id, 'human', 'finance', jsonb_build_object('id', report_row.id, 'amount', report_row.total_amount, 'payment_reference', payment_ref), 'new');

    updated_count := updated_count + 1;
  end loop;

  return updated_count;
end;
$$;

grant execute on function public.finance_next_expense_report_no(uuid) to authenticated;
grant execute on function public.finance_submit_expense_report(uuid, uuid) to authenticated;
grant execute on function public.finance_decide_expense_report(uuid, text, text, uuid) to authenticated;
grant execute on function public.finance_withdraw_expense_report(uuid, uuid) to authenticated;
grant execute on function public.finance_mark_expense_reports_paid(uuid[], date, text, uuid) to authenticated;

commit;
