/**
 * Extract a human-readable message from any throwable shape.
 *
 * Why we need this:
 *   - JS `Error` instances have `.message`
 *   - Supabase / PostgrestError uses `{ code, message, details, hint }`,
 *     which is NOT an Error instance; `instanceof Error` is false
 *   - Some libraries throw plain strings or arbitrary objects
 *
 * If we only check `instanceof Error`, we lose all real error info from
 * Supabase and the user sees a generic "操作失败" with no clue what's wrong.
 */
export function extractErrorMessage(
  error: unknown,
  fallback = "操作失败，请稍后重试。"
): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const e = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts: string[] = [];
    if (typeof e.message === "string" && e.message) parts.push(e.message);
    if (typeof e.details === "string" && e.details) parts.push(e.details);
    if (typeof e.hint === "string" && e.hint) parts.push(`提示：${e.hint}`);
    if (typeof e.code === "string" && e.code) parts.push(`(code: ${e.code})`);
    if (parts.length) return parts.join(" · ");
  }
  if (typeof error === "string") return error;
  return fallback;
}

/**
 * Build a redirect URL with an `error` query param,
 * preserving any existing query string.
 */
export function withErrorParam(path: string, message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}error=${encodeURIComponent(message)}`;
}
