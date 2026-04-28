import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, hasValidSupabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();

  if (!hasValidSupabaseEnv()) return null;
  return createBrowserClient(url!, anonKey!);
}
