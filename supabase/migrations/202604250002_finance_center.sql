create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.finance_categories(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense', 'both')),
  code text,
  description text not null default '',
  is_system boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, parent_id, name)
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('bank', 'cash', 'paypal', 'stripe', 'amazon', 'shopify', 'alipay', 'wechat', 'other')),
  currency text not null default 'CNY',
  opening_balance numeric(14, 2) not null default 0,
  current_balance numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.finance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_no text not null,
  record_type text not null check (record_type in ('income', 'expense', 'reimbursement', 'transfer', 'refund', 'adjustment')),
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'paid', 'cancelled')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'CNY',
  occurred_at date not null default current_date,
  category_id uuid references public.finance_categories(id) on delete set null,
  subcategory_id uuid references public.finance_categories(id) on delete set null,
  account_id uuid references public.finance_accounts(id) on delete set null,
  payment_method text,
  counterparty_name text,
  description text not null,
  quantity numeric(14, 2) not null default 1,
  project_id uuid,
  project_name text,
  department_id uuid,
  member_id uuid references public.organization_members(id) on delete set null,
  submitted_by uuid references public.organization_members(id) on delete set null,
  approved_by uuid references public.organization_members(id) on delete set null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  reimbursement_required boolean not null default false,
  reimbursed boolean not null default false,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  source text not null default 'manual' check (source in ('manual', 'ai_parse', 'import', 'agent')),
  related_module text,
  related_record_type text,
  related_record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, record_no)
);

create table if not exists public.finance_ai_parse_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete set null,
  raw_text text not null,
  parsed_result jsonb not null default '{}'::jsonb,
  confirmed_result jsonb,
  ai_invocation_log_id uuid references public.ai_invocation_logs(id) on delete set null,
  status text not null check (status in ('parsed', 'confirmed', 'cancelled', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.finance_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  export_type text not null check (export_type in ('expense', 'income', 'reimbursement', 'all')),
  title text not null,
  file_name text not null,
  file_id uuid references public.files(id) on delete set null,
  date_from date,
  date_to date,
  filters jsonb not null default '{}'::jsonb,
  record_count integer not null default 0,
  total_amount numeric(14, 2) not null default 0,
  currency text not null default 'CNY',
  exported_by uuid references public.organization_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_records_org on public.finance_records(organization_id);
create index if not exists idx_finance_records_type on public.finance_records(record_type);
create index if not exists idx_finance_records_status on public.finance_records(status);
create index if not exists idx_finance_records_occurred on public.finance_records(occurred_at desc);
create index if not exists idx_finance_records_category on public.finance_records(category_id);
create index if not exists idx_finance_records_account on public.finance_records(account_id);
create index if not exists idx_finance_records_submitted_by on public.finance_records(submitted_by);
create index if not exists idx_finance_records_approval on public.finance_records(approval_request_id);
create index if not exists idx_finance_categories_org on public.finance_categories(organization_id, type, is_active);
create index if not exists idx_finance_accounts_org on public.finance_accounts(organization_id, is_active);
create index if not exists idx_finance_ai_logs_org on public.finance_ai_parse_logs(organization_id, created_at desc);
create index if not exists idx_finance_exports_org on public.finance_exports(organization_id, created_at desc);

drop trigger if exists set_finance_categories_updated_at on public.finance_categories;
create trigger set_finance_categories_updated_at before update on public.finance_categories for each row execute function public.set_updated_at();
drop trigger if exists set_finance_accounts_updated_at on public.finance_accounts;
create trigger set_finance_accounts_updated_at before update on public.finance_accounts for each row execute function public.set_updated_at();
drop trigger if exists set_finance_records_updated_at on public.finance_records;
create trigger set_finance_records_updated_at before update on public.finance_records for each row execute function public.set_updated_at();

create or replace function public.current_member_id(target_org_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select om.id
  from public.organization_members om
  where om.organization_id = target_org_id
    and om.user_id = auth.uid()
    and om.status = 'active'
    and om.member_type = 'human'
  limit 1;
$$;

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
    exists (select 1 from current_member where role_key in ('owner', 'admin', 'finance_lead')),
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

alter table public.finance_categories enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_records enable row level security;
alter table public.finance_ai_parse_logs enable row level security;
alter table public.finance_exports enable row level security;

create policy "finance categories read" on public.finance_categories for select using (public.is_org_member(organization_id));
create policy "finance categories manage" on public.finance_categories for all using (public.has_org_permission(organization_id, 'finance.category.manage')) with check (public.has_org_permission(organization_id, 'finance.category.manage'));

create policy "finance accounts read" on public.finance_accounts for select using (public.is_org_member(organization_id));
create policy "finance accounts manage" on public.finance_accounts for all using (public.has_org_permission(organization_id, 'finance.account.manage')) with check (public.has_org_permission(organization_id, 'finance.account.manage'));

create policy "finance records scoped read" on public.finance_records
for select using (
  public.is_org_member(organization_id)
  and (
    submitted_by = public.current_member_id(organization_id)
    or member_id = public.current_member_id(organization_id)
    or public.has_org_permission(organization_id, 'finance.view_all')
    or public.has_org_permission(organization_id, 'finance.view_team')
  )
);

create policy "finance records create" on public.finance_records
for insert with check (
  public.is_org_member(organization_id)
  and (
    submitted_by = public.current_member_id(organization_id)
    or public.has_org_permission(organization_id, 'finance.create')
  )
);

create policy "finance records update scoped" on public.finance_records
for update using (
  public.is_org_member(organization_id)
  and (
    public.has_org_permission(organization_id, 'finance.update')
    or (submitted_by = public.current_member_id(organization_id) and status in ('draft', 'rejected'))
    or public.has_org_permission(organization_id, 'finance.approve')
  )
) with check (
  public.is_org_member(organization_id)
  and (
    public.has_org_permission(organization_id, 'finance.update')
    or submitted_by = public.current_member_id(organization_id)
    or public.has_org_permission(organization_id, 'finance.approve')
  )
);

create policy "finance records delete manage" on public.finance_records
for delete using (
  public.has_org_permission(organization_id, 'finance.delete')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
);

create policy "finance ai logs scoped read" on public.finance_ai_parse_logs
for select using (
  public.is_org_member(organization_id)
  and (user_id = auth.uid() or public.has_org_permission(organization_id, 'finance.view_all'))
);
create policy "finance ai logs create" on public.finance_ai_parse_logs for insert with check (public.has_org_permission(organization_id, 'finance.ai_parse'));
create policy "finance ai logs update own" on public.finance_ai_parse_logs for update using (user_id = auth.uid() or public.has_org_permission(organization_id, 'finance.view_all')) with check (user_id = auth.uid() or public.has_org_permission(organization_id, 'finance.view_all'));

create policy "finance exports scoped read" on public.finance_exports
for select using (
  public.is_org_member(organization_id)
  and (exported_by = public.current_member_id(organization_id) or public.has_org_permission(organization_id, 'finance.view_all'))
);
create policy "finance exports create" on public.finance_exports
for insert with check (
  public.has_org_permission(organization_id, 'finance.export')
  and coalesce(public.current_role_key(organization_id), '') <> 'agent'
);

create policy "approvals finance approver update" on public.approval_requests
for update using (
  related_module = 'finance'
  and public.has_org_permission(organization_id, 'finance.approve')
) with check (
  related_module = 'finance'
  and public.has_org_permission(organization_id, 'finance.approve')
);

insert into public.permissions (key, name, module, action, risk_level, description)
values
  ('finance.view', '查看财务中心', 'finance', 'view', 'low', '进入财务中心并查看授权范围内数据。'),
  ('finance.create', '创建财务记录', 'finance', 'create', 'medium', '创建收入、支出和报销记录。'),
  ('finance.update', '更新财务记录', 'finance', 'update', 'medium', '编辑授权范围内财务记录。'),
  ('finance.delete', '删除财务记录', 'finance', 'delete', 'high', '删除财务记录。'),
  ('finance.approve', '审批财务记录', 'finance', 'approve', 'high', '批准或驳回报销与支出审批。'),
  ('finance.export', '导出财务表格', 'finance', 'export', 'medium', '导出授权范围内财务 Excel。'),
  ('finance.view_all', '查看全部财务数据', 'finance', 'view_all', 'high', '查看组织全部财务数据。'),
  ('finance.view_team', '查看团队财务数据', 'finance', 'view_team', 'medium', '查看团队或授权范围内财务数据。'),
  ('finance.category.manage', '管理财务类目', 'finance', 'category.manage', 'medium', '创建和维护财务类目。'),
  ('finance.account.manage', '管理财务账户', 'finance', 'account.manage', 'high', '创建和维护财务账户。'),
  ('finance.ai_parse', '使用 AI 记账解析', 'finance', 'ai_parse', 'medium', '使用 AI 解析自然语言记账。')
on conflict (key) do update set
  name = excluded.name,
  module = excluded.module,
  action = excluded.action,
  risk_level = excluded.risk_level,
  description = excluded.description;

insert into public.modules (key, name, description, icon, category, status, route, required_permission)
values ('finance', '财务中心', '一句话记账、报销审批、收支流水、财务看板与 Excel 导出。', 'WalletCards', 'core', 'active', '/finance', 'finance.view')
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
join public.modules m on m.key = 'finance'
on conflict (organization_id, module_id) do update set is_enabled = true;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key like 'finance.%'
where r.key in ('owner', 'admin', 'finance_lead')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in ('finance.view','finance.create','finance.update','finance.approve','finance.export','finance.view_team','finance.ai_parse')
where r.key = 'manager'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in ('finance.view','finance.create','finance.update','finance.export','finance.ai_parse')
where r.key = 'member'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (organization_id, role_id, permission_id)
select r.organization_id, r.id, p.id
from public.roles r
join public.permissions p on p.key in ('finance.view')
where r.key = 'agent'
on conflict (role_id, permission_id) do nothing;

with orgs as (select id as organization_id from public.organizations),
parents as (
  insert into public.finance_categories (organization_id, name, type, code, description, is_system, sort_order)
  select organization_id, name, type, code, '', true, sort_order
  from orgs
  cross join (values
    ('销售收入', 'income', 'INC-SALES', 10),
    ('服务收入', 'income', 'INC-SERVICE', 20),
    ('投资收益', 'income', 'INC-INVEST', 30),
    ('退款收入', 'income', 'INC-REFUND', 40),
    ('其他收入', 'income', 'INC-OTHER', 50),
    ('产品成本', 'expense', 'EXP-PRODUCT', 110),
    ('物流仓储', 'expense', 'EXP-LOGISTICS', 120),
    ('广告推广', 'expense', 'EXP-MARKETING', 130),
    ('软件与 AI 成本', 'expense', 'EXP-SOFTWARE-AI', 140),
    ('人工薪酬', 'expense', 'EXP-LABOR', 150),
    ('办公行政', 'expense', 'EXP-OFFICE', 160),
    ('差旅招待', 'expense', 'EXP-TRAVEL', 170),
    ('研发与产品', 'expense', 'EXP-RD', 180),
    ('税费手续费', 'expense', 'EXP-FEE-TAX', 190),
    ('其他支出', 'expense', 'EXP-OTHER', 200)
  ) as c(name, type, code, sort_order)
  on conflict (organization_id, parent_id, name) do nothing
  returning id, organization_id, name
)
insert into public.finance_categories (organization_id, parent_id, name, type, code, description, is_system, sort_order)
select p.organization_id, p.id, child.name, 'expense', child.code, '', true, child.sort_order
from public.finance_categories p
join (values
  ('产品成本', '采购成本', 'EXP-PRODUCT-PURCHASE', 111),
  ('产品成本', '打样费', 'EXP-PRODUCT-SAMPLE', 112),
  ('产品成本', '包装费', 'EXP-PRODUCT-PACKAGING', 113),
  ('物流仓储', '运费', 'EXP-LOGISTICS-FREIGHT', 121),
  ('物流仓储', '仓储费', 'EXP-LOGISTICS-STORAGE', 122),
  ('物流仓储', '关税', 'EXP-LOGISTICS-DUTY', 123),
  ('广告推广', '平台广告', 'EXP-MARKETING-PLATFORM', 131),
  ('广告推广', '社媒广告', 'EXP-MARKETING-SOCIAL', 132),
  ('广告推广', '红人合作', 'EXP-MARKETING-KOL', 133),
  ('广告推广', '内容制作', 'EXP-MARKETING-CONTENT', 134),
  ('软件与 AI 成本', 'AI 工具', 'EXP-SOFTWARE-AI-TOOL', 141),
  ('软件与 AI 成本', 'SaaS 软件', 'EXP-SOFTWARE-SAAS', 142),
  ('软件与 AI 成本', '云服务', 'EXP-SOFTWARE-CLOUD', 143),
  ('人工薪酬', '工资', 'EXP-LABOR-SALARY', 151),
  ('人工薪酬', '外包', 'EXP-LABOR-OUTSOURCE', 152),
  ('人工薪酬', '顾问费', 'EXP-LABOR-CONSULTANT', 153),
  ('办公行政', '办公用品', 'EXP-OFFICE-SUPPLY', 161),
  ('办公行政', '设备采购', 'EXP-OFFICE-EQUIPMENT', 162),
  ('办公行政', '通讯网络', 'EXP-OFFICE-NETWORK', 163),
  ('差旅招待', '交通', 'EXP-TRAVEL-TRANSPORT', 171),
  ('差旅招待', '住宿', 'EXP-TRAVEL-HOTEL', 172),
  ('差旅招待', '餐饮', 'EXP-TRAVEL-MEAL', 173),
  ('研发与产品', '设计费', 'EXP-RD-DESIGN', 181),
  ('研发与产品', '测试费', 'EXP-RD-TEST', 182),
  ('研发与产品', '专利商标', 'EXP-RD-IP', 183),
  ('税费手续费', '平台手续费', 'EXP-FEE-TAX-PLATFORM', 191),
  ('税费手续费', '支付手续费', 'EXP-FEE-TAX-PAYMENT', 192),
  ('税费手续费', '税费', 'EXP-FEE-TAX-TAX', 193)
) as child(parent_name, name, code, sort_order) on child.parent_name = p.name
where p.parent_id is null
on conflict (organization_id, parent_id, name) do nothing;

insert into public.finance_accounts (organization_id, name, account_type, currency, opening_balance, current_balance, is_active, metadata)
select o.id, a.name, a.account_type, a.currency, 0, 0, true, '{}'::jsonb
from public.organizations o
cross join (values
  ('公司现金', 'cash', 'CNY'),
  ('公司银行账户', 'bank', 'CNY'),
  ('微信支付', 'wechat', 'CNY'),
  ('支付宝', 'alipay', 'CNY'),
  ('PayPal', 'paypal', 'USD'),
  ('Stripe', 'stripe', 'USD'),
  ('Amazon', 'amazon', 'USD'),
  ('Shopify', 'shopify', 'USD')
) as a(name, account_type, currency)
on conflict (organization_id, name) do nothing;
