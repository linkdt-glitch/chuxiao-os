import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv, hasValidSupabaseEnv } from "./env";

export function hasSupabaseEnv() {
  return hasValidSupabaseEnv();
}

// 让 supabase auth cookie 在 apex (m0f.com) 和子域 (www.m0f.com) 间共享。
// 上线后用户在 www.m0f.com 提交登录会被 Cloudflare 301/307 到 m0f.com，
// 但 cookie 默认是 host-only（仅写到响应来源域）；后续如果 JS 用相对 URL
// 跳 /dashboard 而当前页面 URL 还在 www，浏览器拿不到 m0f.com 的 cookie，
// 立刻被 middleware 踢回 /login —— 表现就是"密码对了，但登不进去"。
//
// 设置 AUTH_COOKIE_DOMAIN=.m0f.com 后所有 supabase cookie 都加 Domain=.m0f.com，
// 浏览器在两个子域都会带上，不再受 301 重定向影响。
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  if (!hasSupabaseEnv()) return null;
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(
    url!,
    anonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const finalOptions: CookieOptions = COOKIE_DOMAIN
                ? { ...options, domain: COOKIE_DOMAIN }
                : options;
              cookieStore.set(name, value, finalOptions);
            });
          } catch {
            // Server Components cannot set cookies; auth route handlers can.
          }
        }
      }
    }
  );
}
