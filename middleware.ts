import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// API 路由中不需要登录校验的公开端点
const PUBLIC_API_PATHS = [
  "/api/auth/request-link",
  "/api/auth/password-login",
  "/api/auth/bootstrap-owner",
  "/api/auth/change-password"
];

// 页面路由中不需要登录校验的公开页面
// Note: app/(auth)/change-password 's URL is `/change-password`,
// not `/auth/change-password` ((auth) is a route group, hidden from URL).
const PUBLIC_PAGE_PATHS = [
  "/login",
  "/auth/callback",
  "/change-password"
];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_API_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_PAGE_PATHS.some((p) => pathname.startsWith(p))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源和 Next.js 内部路由不处理
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 公开路径直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 仅在配置了 Supabase 时才做会话校验
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers }
  });

  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const finalOptions = cookieDomain ? { ...options, domain: cookieDomain } : options;
          response.cookies.set(name, value, finalOptions);
        });
      }
    }
  });

  // ⚠️ supabase.auth.getUser() 在网络抖动 / Supabase 短暂不可用时会抛错。
  // 之前没有 try/catch —— 一旦抛错整个 middleware 崩，Next.js 返回 500 给
  // 所有受保护页面，全公司同时打不开网站。
  //
  // 容错策略：抓住异常，记录日志，**当作没登录**处理（最保守）。
  //   - 受保护 API → 401（前端可识别后弹"请稍后重试"）
  //   - 受保护页面 → /login（用户会看到登录页，避免出现白屏 500）
  //   - 公开页面 /login 本身已在 isPublicPath 提前 return，不受这里影响
  let user: { id: string } | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("[middleware] supabase.auth.getUser() threw — fail closed to /login:", {
      error_name: error instanceof Error ? error.name : typeof error,
      error_message: error instanceof Error ? error.message : String(error),
      pathname
    });
    user = null;
  }

  // 未登录（或 supabase 异常被当作未登录）访问受保护路由 → 重定向到登录页或返回 401
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "请先登录后再操作。" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
