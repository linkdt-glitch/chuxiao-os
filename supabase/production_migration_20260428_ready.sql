-- 初晓 OS 生产库增量迁移合并文件
-- 执行顺序：finance hardening -> project hardening -> essential finance categories
-- 生成时间：2026-04-29 10:31:57 CST

begin;

-- 1. Finance hardening
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

-- 2. Project command center hardening
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

-- 3. Finance essential categories
with essential(name, type, code, sort_order) as (
  values
    ('商品销售收入', 'income', 'INC-PRODUCT-SALES', 10),
    ('服务与订阅收入', 'income', 'INC-SERVICE-SUBSCRIPTION', 20),
    ('其他经营收入', 'income', 'INC-OTHER-OPERATING', 30),
    ('退款与销售调整', 'income', 'INC-SALES-ADJUSTMENT', 40),
    ('商品成本', 'expense', 'EXP-COGS', 110),
    ('物流仓储', 'expense', 'EXP-LOGISTICS', 120),
    ('平台与渠道费用', 'expense', 'EXP-PLATFORM-CHANNEL', 130),
    ('广告与增长', 'expense', 'EXP-GROWTH', 140),
    ('支付与金融费用', 'expense', 'EXP-PAYMENT-FINANCE', 150),
    ('软件、AI 与云服务', 'expense', 'EXP-SOFTWARE-AI-CLOUD', 160),
    ('人工与外包', 'expense', 'EXP-PEOPLE-OUTSOURCE', 170),
    ('研发与产品', 'expense', 'EXP-RD-PRODUCT', 180),
    ('办公与行政', 'expense', 'EXP-OFFICE-ADMIN', 190),
    ('专业服务与合规', 'expense', 'EXP-PROFESSIONAL-COMPLIANCE', 200),
    ('差旅与招待', 'expense', 'EXP-TRAVEL-ENTERTAINMENT', 210),
    ('税费', 'expense', 'EXP-TAX', 220),
    ('资产与折旧', 'expense', 'EXP-ASSET-DEPRECIATION', 230),
    ('异常损失与调整', 'expense', 'EXP-LOSS-ADJUSTMENT', 240)
),
organizations_scope as (
  select id as organization_id from public.organizations
)
,
top_level_source as (
  select o.organization_id, e.name, e.type, e.code, e.sort_order
  from organizations_scope o
  cross join essential e
)
update public.finance_categories fc
set
  type = s.type,
  code = s.code,
  description = '长期稳定核心类目',
  is_system = true,
  is_active = true,
  sort_order = s.sort_order
from top_level_source s
where fc.organization_id = s.organization_id
  and fc.parent_id is null
  and fc.name = s.name;

with essential(name, type, code, sort_order) as (
  values
    ('商品销售收入', 'income', 'INC-PRODUCT-SALES', 10),
    ('服务与订阅收入', 'income', 'INC-SERVICE-SUBSCRIPTION', 20),
    ('其他经营收入', 'income', 'INC-OTHER-OPERATING', 30),
    ('退款与销售调整', 'income', 'INC-SALES-ADJUSTMENT', 40),
    ('商品成本', 'expense', 'EXP-COGS', 110),
    ('物流仓储', 'expense', 'EXP-LOGISTICS', 120),
    ('平台与渠道费用', 'expense', 'EXP-PLATFORM-CHANNEL', 130),
    ('广告与增长', 'expense', 'EXP-GROWTH', 140),
    ('支付与金融费用', 'expense', 'EXP-PAYMENT-FINANCE', 150),
    ('软件、AI 与云服务', 'expense', 'EXP-SOFTWARE-AI-CLOUD', 160),
    ('人工与外包', 'expense', 'EXP-PEOPLE-OUTSOURCE', 170),
    ('研发与产品', 'expense', 'EXP-RD-PRODUCT', 180),
    ('办公与行政', 'expense', 'EXP-OFFICE-ADMIN', 190),
    ('专业服务与合规', 'expense', 'EXP-PROFESSIONAL-COMPLIANCE', 200),
    ('差旅与招待', 'expense', 'EXP-TRAVEL-ENTERTAINMENT', 210),
    ('税费', 'expense', 'EXP-TAX', 220),
    ('资产与折旧', 'expense', 'EXP-ASSET-DEPRECIATION', 230),
    ('异常损失与调整', 'expense', 'EXP-LOSS-ADJUSTMENT', 240)
),
organizations_scope as (
  select id as organization_id from public.organizations
)
insert into public.finance_categories (organization_id, name, type, code, description, is_system, is_active, sort_order)
select o.organization_id, e.name, e.type, e.code, '长期稳定核心类目', true, true, e.sort_order
from organizations_scope o
cross join essential e
where not exists (
  select 1
  from public.finance_categories fc
  where fc.organization_id = o.organization_id
    and fc.parent_id is null
    and fc.name = e.name
);

with essential_names(name) as (
  values
    ('商品销售收入'),
    ('服务与订阅收入'),
    ('其他经营收入'),
    ('退款与销售调整'),
    ('商品成本'),
    ('物流仓储'),
    ('平台与渠道费用'),
    ('广告与增长'),
    ('支付与金融费用'),
    ('软件、AI 与云服务'),
    ('人工与外包'),
    ('研发与产品'),
    ('办公与行政'),
    ('专业服务与合规'),
    ('差旅与招待'),
    ('税费'),
    ('资产与折旧'),
    ('异常损失与调整')
)
update public.finance_categories
set is_active = false
where is_system = true
  and parent_id is null
  and name not in (select name from essential_names);

with parent_map as (
  select id, organization_id, name
  from public.finance_categories
  where parent_id is null
    and name in (
      '商品销售收入','服务与订阅收入','其他经营收入','退款与销售调整',
      '商品成本','物流仓储','平台与渠道费用','广告与增长','支付与金融费用',
      '软件、AI 与云服务','人工与外包','研发与产品','办公与行政',
      '专业服务与合规','差旅与招待','税费','资产与折旧','异常损失与调整'
    )
),
children(parent_name, child_name, type, code, sort_order) as (
  values
    ('商品销售收入', '自营站销售', 'income', 'INC-PRODUCT-DTC', 11),
    ('商品销售收入', '第三方平台销售', 'income', 'INC-PRODUCT-MARKETPLACE', 12),
    ('服务与订阅收入', 'AI 软件订阅', 'income', 'INC-AI-SUBSCRIPTION', 21),
    ('服务与订阅收入', '技术服务', 'income', 'INC-TECH-SERVICE', 22),
    ('商品成本', '采购 / 生产', 'expense', 'EXP-COGS-PURCHASE', 111),
    ('商品成本', '包装 / 质检 / 打样', 'expense', 'EXP-COGS-SAMPLE-QC', 112),
    ('物流仓储', '国际物流 / 头程', 'expense', 'EXP-LOGISTICS-FIRST-MILE', 121),
    ('物流仓储', '海外仓 / FBA / 尾程', 'expense', 'EXP-LOGISTICS-FULFILLMENT', 122),
    ('平台与渠道费用', '平台佣金 / 履约费', 'expense', 'EXP-PLATFORM-FEE', 131),
    ('平台与渠道费用', '店铺 / 渠道工具', 'expense', 'EXP-CHANNEL-TOOL', 132),
    ('广告与增长', '广告投放', 'expense', 'EXP-GROWTH-ADS', 141),
    ('广告与增长', '内容 / 红人 / Affiliate', 'expense', 'EXP-GROWTH-CONTENT', 142),
    ('支付与金融费用', '支付手续费', 'expense', 'EXP-PAYMENT-FEE', 151),
    ('支付与金融费用', '汇兑 / 利息', 'expense', 'EXP-FX-INTEREST', 152),
    ('软件、AI 与云服务', 'AI API / AI 工具', 'expense', 'EXP-AI-TOOL', 161),
    ('软件、AI 与云服务', 'SaaS / 云服务', 'expense', 'EXP-SAAS-CLOUD', 162),
    ('人工与外包', '工资 / 福利', 'expense', 'EXP-PEOPLE-SALARY', 171),
    ('人工与外包', '外包 / 顾问', 'expense', 'EXP-OUTSOURCE-CONSULTANT', 172),
    ('研发与产品', '产品设计 / 测试', 'expense', 'EXP-RD-DESIGN-TEST', 181),
    ('研发与产品', '专利 / 商标 / 认证', 'expense', 'EXP-RD-IP-CERT', 182),
    ('专业服务与合规', '会计 / 法律 / 税务', 'expense', 'EXP-PROFESSIONAL', 201),
    ('税费', 'VAT / GST / 销售税', 'expense', 'EXP-TAX-SALES', 221),
    ('异常损失与调整', '库存报废 / 货损', 'expense', 'EXP-LOSS-INVENTORY', 241)
)
insert into public.finance_categories (organization_id, parent_id, name, type, code, description, is_system, is_active, sort_order)
select p.organization_id, p.id, c.child_name, c.type, c.code, '可选细分，日常记账可不选', true, true, c.sort_order
from parent_map p
join children c on c.parent_name = p.name
on conflict (organization_id, parent_id, name) do update set
  type = excluded.type,
  code = excluded.code,
  description = excluded.description,
  is_system = true,
  is_active = true,
  sort_order = excluded.sort_order;

commit;
