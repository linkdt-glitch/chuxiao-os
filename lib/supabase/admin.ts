import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv, getSupabaseEnvIssue } from "./env";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();

  if (getSupabaseEnvIssue({ requireServiceRole: true })) return null;
  return createClient(url!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
