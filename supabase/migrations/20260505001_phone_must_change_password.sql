-- Migration: 添加 phone 列 + must_change_password 列
-- 执行环境：Supabase Dashboard → SQL Editor

-- 1. organization_members 补 phone 列（可为空，保持向后兼容）
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS phone text;

CREATE INDEX IF NOT EXISTS idx_org_members_phone
  ON organization_members (phone)
  WHERE phone IS NOT NULL;

-- 2. user_profiles 补 must_change_password 列
--    默认 false，首次由管理员创建 / 重置密码时设为 true
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- 完成
