type HeaderReader = {
  get(name: string): string | null;
};

// 生产域名 fallback（实际优先用 APP_URL / NEXT_PUBLIC_APP_URL / 请求 Host）。
// 主要用于 OTP/magic-link 邮件 emailRedirectTo —— 必须和用户真实访问的域名一致，
// 否则 Supabase 邮件里的链接点开后域名对不上，cookie 拿不到，登录瞬间失败。
const productionOrigin = "https://m0f.com";

function toSafeOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.hostname === "0.0.0.0") return null;
    if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function originFromHeaders(headers?: HeaderReader | null) {
  const host = headers?.get("x-forwarded-host") ?? headers?.get("host");
  if (!host) return null;

  const proto = headers?.get("x-forwarded-proto") ?? "https";
  return toSafeOrigin(`${proto}://${host}`);
}

export function resolveAppOrigin(fallbackOrigin?: string | null, headers?: HeaderReader | null) {
  return (
    toSafeOrigin(process.env.APP_URL) ??
    toSafeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    originFromHeaders(headers) ??
    toSafeOrigin(fallbackOrigin) ??
    (process.env.NODE_ENV === "production" ? productionOrigin : "http://localhost:3000")
  );
}
