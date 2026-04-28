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

export async function isEmailAllowedForLogin(email: string) {
  if (!email || !email.includes("@")) return false;
  if (await isExistingOrganizationEmail(email)) return true;
  return isEmailAllowedByConfig(email);
}
