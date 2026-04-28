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
