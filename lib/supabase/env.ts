const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const PUBLISHABLE_KEY_PREFIX = "sb_publishable_";
const SECRET_KEY_PREFIX = "sb_secret_";

function clean(value: string | undefined) {
  return value?.trim();
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isJwtLike(value: string) {
  return JWT_PATTERN.test(value);
}

function isPublishableKey(value: string) {
  return value.startsWith(PUBLISHABLE_KEY_PREFIX) || isJwtLike(value);
}

function isPrivilegedKey(value: string) {
  return value.startsWith(SECRET_KEY_PREFIX) || isJwtLike(value);
}

export function getSupabaseEnv() {
  return {
    url: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  };
}

export function getSupabaseEnvIssue({ requireServiceRole = false } = {}) {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();

  if (!url || !anonKey) return "Supabase 环境变量未配置完整。";
  if (!isValidHttpUrl(url)) return "NEXT_PUBLIC_SUPABASE_URL 必须是有效的 http 或 https 地址。";
  if (!isPublishableKey(anonKey)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY 必须填写 Supabase 的 Publishable key 或 legacy anon public JWT，不要填写中文、项目名或 URL。";
  }
  if (requireServiceRole) {
    if (!serviceRoleKey) return "SUPABASE_SERVICE_ROLE_KEY 未配置。";
    if (!isPrivilegedKey(serviceRoleKey)) {
      return "SUPABASE_SERVICE_ROLE_KEY 必须填写 Supabase 的 Secret key 或 legacy service_role JWT。";
    }
  }

  return null;
}

export function hasValidSupabaseEnv() {
  return getSupabaseEnvIssue() === null;
}
