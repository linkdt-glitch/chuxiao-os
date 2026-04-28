import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv, hasValidSupabaseEnv } from "./env";

export function hasSupabaseEnv() {
  return hasValidSupabaseEnv();
}

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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies; auth route handlers can.
          }
        }
      }
    }
  );
}
