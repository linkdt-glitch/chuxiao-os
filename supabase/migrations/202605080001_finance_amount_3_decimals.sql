-- migration: bump finance amount columns from numeric(14, 2) to numeric(14, 3)
-- 用户希望手动记账 / 一句话记账 / 报销都能精确到小数点 3 位（千分位）。
-- alter type 不会丢失现有数据（2 位 → 3 位是无损扩容）。

-- 财务账户余额
alter table public.finance_accounts
  alter column opening_balance type numeric(14, 3),
  alter column current_balance type numeric(14, 3);

-- 财务记录（手动记账 / AI 记账写入这里）
alter table public.finance_records
  alter column amount type numeric(14, 3),
  alter column quantity type numeric(14, 3);

-- 报销 / 报销条目
alter table public.finance_expense_reports
  alter column total_amount type numeric(14, 3);

alter table public.finance_expense_items
  alter column amount type numeric(14, 3);

-- 报销审批规则金额阈值
alter table public.finance_expense_approval_rules
  alter column min_amount type numeric(14, 3),
  alter column max_amount type numeric(14, 3);

-- 类目限额
alter table public.finance_categories
  alter column single_amount_limit type numeric(14, 3),
  alter column monthly_budget_hint type numeric(14, 3);

-- 部门预算
alter table public.finance_department_budgets
  alter column amount type numeric(14, 3);

-- 报销模板常用金额
alter table public.finance_expense_templates
  alter column amount type numeric(14, 3);
