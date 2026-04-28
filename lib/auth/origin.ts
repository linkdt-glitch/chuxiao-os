type HeaderReader = {
  get(name: string): string | null;
};

const productionOrigin = "https://chuxiao-os.onrender.com";

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
