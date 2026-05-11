-- ─────────────────────────────────────────────────────────────────────────
-- 财务类目极简化：旧的 18+ 大类 → 6 大类
-- ─────────────────────────────────────────────────────────────────────────
-- 跨境电商 + AI 原生公司，第一性原理 6 大类（无子类目）。
-- 这条迁移是幂等的：
--   - 6 大类不存在 → 删旧 + 插入（带 expense_enabled=true）
--   - 6 大类已存在但 expense_enabled=false → UPDATE 修复
--   - 6 大类已存在且都对 → 跳过
--
-- 应用层 ensureMinimal6FinanceCategories() 也跑同样的逻辑作为兜底。
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
    -- 标记检查：6 大类是否已存在
    if exists (
      select 1 from public.finance_categories
      where organization_id = rec.id
        and code = any(new_codes)
    ) then
      -- 已迁移过 → 兜底修复 expense_enabled / is_active
      -- 历史 bug：第一版插入漏了 expense_enabled=true，导致报销表单类目下拉为空
      update public.finance_categories
      set
        expense_enabled = true,
        is_active = true,
        is_system = true
      where organization_id = rec.id
        and code = any(new_codes)
        and (expense_enabled is distinct from true or is_active is distinct from true);
      continue;
    end if;

    -- 1. 清掉该组织所有旧类目（子类目 cascade，旧流水 category_id 因 set null 自动置空）
    delete from public.finance_categories where organization_id = rec.id;

    -- 2. 插入 6 大类（type='both' 让收入 / 支出 / 报销都能用同一套；
    --    ⭐ expense_enabled=true 是关键 —— getExpenseCategories 过滤这个字段）
    insert into public.finance_categories
      (organization_id, name, type, code, description, is_system, is_active, expense_enabled, sort_order)
    values
      (rec.id, '货物与物流',     'both', 'goods_logistics',  '产品采购 / 国际物流 / 仓储 / 关税清关', true, true, true, 10),
      (rec.id, '平台与渠道',     'both', 'platform_channel', '平台月费佣金 / 广告投放 / 红人 Affiliate / 支付通道', true, true, true, 20),
      (rec.id, 'AI 与软件工具',  'both', 'ai_tools',         'AI 模型调用 / SaaS 订阅 / 云服务 / 域名代码库',       true, true, true, 30),
      (rec.id, '人员与外包',     'both', 'people',           '工资奖金 / 社保公积金 / 外包兼职 / 招聘培训',          true, true, true, 40),
      (rec.id, '办公与差旅',     'both', 'office_travel',    '房租水电 / 办公设备 / 差旅交通 / 商务餐饮 / 通讯',     true, true, true, 50),
      (rec.id, '品牌与其他',     'both', 'brand_others',     '品牌设计 / 内容拍摄 / 法务税务 / 其他兜底',            true, true, true, 60);
  end loop;
end $$;
