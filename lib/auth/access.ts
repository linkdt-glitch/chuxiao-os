import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowedByConfig(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) return false;
  if (normalized === normalizeEmail(process.env.BOOTSTRAP_OWNER_EMAIL ?? "")) return true;

  const allowedEmails = parseList(process.env.AUTH_ALLOWED_EMAILS);
  const allowedDomains = parseList(process.env.AUTH_ALLOWED_EMAIL_DOMAINS).map((domain) =>
    domain.replace(/^@/, "")
  );
  const hasRestrictions = allowedEmails.length > 0 || allowedDomains.length > 0;

  if (!hasRestrictions && process.env.AUTH_REQUIRE_INVITE !== "true") return true;
  if (allowedEmails.includes(normalized)) return true;

  const domain = normalized.split("@")[1] ?? "";
  return allowedDomains.includes(domain);
}

// 仅用于登录前校验邮箱是否为已注册成员，登录流程中无组织上下文，故跨组织查询是预期行为。
// 不可用于组织内的成员去重检查，那类场景必须传入 organization_id。
export async function isExistingOrganizationEmail(email: string) {
  const normalized = normalizeEmail(email);
  const admin = createSupabaseAdminClient();
  if (!admin || !normalized) return false;

  const { data } = await admin
    .from("organization_members")
    .select("id")
    .ilike("email", normalized)
    .in("status", ["active", "invited"])
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function isEmailInOrganization(email: string, organizationId: string) {
  const normalized = normalizeEmail(email);
  const admin = createSupabaseAdminClient();
  if (!admin || !normalized || !organizationId) return false;

  const { data } = await admin
    .from("organization_members")
    .select("id")
    .ilike("email", normalized)
    .eq("organization_id", organizationId)
    .in("status", ["active", "invited"])
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function isEmailAllowedForLogin(email: string) {
  if (!email || !email.includes("@")) return false;
  if (await isExistingOrganizationEmail(email)) return true;
  return isEmailAllowedByConfig(email);
}
