-- ─────────────────────────────────────────────────────────────────────────
-- 重置财务类目：清掉所有旧类目，按 6 大类极简方案重建
-- ─────────────────────────────────────────────────────────────────────────
-- 跨境电商 + AI 原生公司的第一性原理 6 大类。
-- 无子类目（用户决定先不要细分）。
--
-- 用法：在 Supabase Studio → SQL Editor 整段执行。
-- 安全：DELETE 前先 SELECT 看会删多少；执行完后再 SELECT 验证结果。
-- 影响：旧流水的 category_id 会被设为 NULL（外键 on delete set null），
--       UI 显示「未分类」，可后续手动归类。
-- ─────────────────────────────────────────────────────────────────────────

-- 0. 先看会影响多少条流水（dry run，只 SELECT）
SELECT
  fc.id AS old_category_id,
  fc.name AS old_category_name,
  COUNT(fr.id) AS records_will_be_unclassified
FROM finance_categories fc
LEFT JOIN finance_records fr ON fr.category_id = fc.id OR fr.subcategory_id = fc.id
GROUP BY fc.id, fc.name
ORDER BY records_will_be_unclassified DESC;

-- 1. 清掉所有旧类目（子类目会因 on delete cascade 一并删；
--    finance_records.category_id / subcategory_id 因 on delete set null 自动设 NULL）
DELETE FROM finance_categories;

-- 2. 插入 6 大类（所有 type = 'both'，让收入 / 支出 / 报销都能用同一套类目）
--    sort_order 控制下拉顺序：越小越靠前
INSERT INTO finance_categories (organization_id, name, type, code, description, is_system, is_active, sort_order)
SELECT
  o.id,
  c.name,
  'both',
  c.code,
  c.description,
  true,   -- is_system: 标记为系统类目（避免被误删 / 提供保护）
  true,
  c.sort_order
FROM organizations o
CROSS JOIN (VALUES
  ('货物与物流',     'goods_logistics',  '产品采购 / 国际物流 / 仓储 / 关税清关', 10),
  ('平台与渠道',     'platform_channel', '平台月费佣金 / 广告投放 / 红人 Affiliate / 支付通道', 20),
  ('AI 与软件工具',  'ai_tools',         'AI 模型调用 / SaaS 订阅 / 云服务 / 域名代码库',       30),
  ('人员与外包',     'people',           '工资奖金 / 社保公积金 / 外包兼职 / 招聘培训',          40),
  ('办公与差旅',     'office_travel',    '房租水电 / 办公设备 / 差旅交通 / 商务餐饮 / 通讯',     50),
  ('品牌与其他',     'brand_others',     '品牌设计 / 内容拍摄 / 法务税务 / 其他兜底',            60)
) AS c(name, code, description, sort_order)
ORDER BY c.sort_order;

-- 3. 验证：应该看到每个 organization 都有这 6 个类目
SELECT
  o.name AS organization,
  fc.name AS category,
  fc.code,
  fc.type,
  fc.sort_order
FROM finance_categories fc
JOIN organizations o ON o.id = fc.organization_id
ORDER BY o.name, fc.sort_order;

-- 4. 验证旧流水状态（应该都是 category_id IS NULL，UI 显示「未分类」）
SELECT
  COUNT(*) FILTER (WHERE category_id IS NULL) AS unclassified_count,
  COUNT(*) FILTER (WHERE category_id IS NOT NULL) AS classified_count,
  COUNT(*) AS total
FROM finance_records;
