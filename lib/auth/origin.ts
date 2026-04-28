function toSafeOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.hostname === "0.0.0.0") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveAppOrigin(fallbackOrigin?: string | null) {
  return (
    toSafeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    toSafeOrigin(fallbackOrigin) ??
    "http://localhost:3000"
  );
}
