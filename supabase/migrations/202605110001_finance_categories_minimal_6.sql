-- ─────────────────────────────────────────────────────────────────────────
-- 财务类目极简化：旧的 18+ 大类 → 6 大类
-- ─────────────────────────────────────────────────────────────────────────
-- 跨境电商 + AI 原生公司，第一性原理 6 大类（无子类目）。
-- 这条迁移是幂等的：只在「6 大类的 code 都不存在」时才动。
-- 应用层 ensureMinimal6FinanceCategories() 也跑同样的逻辑作为兜底，
-- 二者哪个先跑都不会重复执行。
--
-- 影响：旧流水的 category_id 会被设为 NULL（外键 on delete set null），
--       UI 显示「未分类」，可后续手动归类。
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  rec record;
  new_codes constant text[] := array[
    'goods_logistics',
    'platform_channel',
    'ai_tools',
    'people',
    'office_travel',
    'brand_others'
  ];
begin
  for rec in select id from public.organizations loop
    -- 标记检查：只要 6 个新 code 任意一个已存在，就跳过该组织（已迁移）
    if exists (
      select 1 from public.finance_categories
      where organization_id = rec.id
        and code = any(new_codes)
    ) then
      continue;
    end if;

    -- 1. 清掉该组织所有旧类目（子类目 cascade，旧流水 category_id 因 set null 自动置空）
    delete from public.finance_categories where organization_id = rec.id;

    -- 2. 插入 6 大类（type='both' 让收入 / 支出 / 报销都能用同一套）
    insert into public.finance_categories
      (organization_id, name, type, code, description, is_system, is_active, sort_order)
    values
      (rec.id, '货物与物流',     'both', 'goods_logistics',  '产品采购 / 国际物流 / 仓储 / 关税清关', true, true, 10),
      (rec.id, '平台与渠道',     'both', 'platform_channel', '平台月费佣金 / 广告投放 / 红人 Affiliate / 支付通道', true, true, 20),
      (rec.id, 'AI 与软件工具',  'both', 'ai_tools',         'AI 模型调用 / SaaS 订阅 / 云服务 / 域名代码库',       true, true, 30),
      (rec.id, '人员与外包',     'both', 'people',           '工资奖金 / 社保公积金 / 外包兼职 / 招聘培训',          true, true, 40),
      (rec.id, '办公与差旅',     'both', 'office_travel',    '房租水电 / 办公设备 / 差旅交通 / 商务餐饮 / 通讯',     true, true, 50),
      (rec.id, '品牌与其他',     'both', 'brand_others',     '品牌设计 / 内容拍摄 / 法务税务 / 其他兜底',            true, true, 60);
  end loop;
end $$;
