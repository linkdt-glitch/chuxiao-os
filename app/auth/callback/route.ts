import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isEmailAllowedForLogin } from "@/lib/auth/access";
import { ensureUserWorkspace } from "@/lib/auth/onboarding";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const allowed = await isEmailAllowedForLogin(data.user.email ?? "");
        if (!allowed) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL("/login?error=not_invited", request.url));
        }
        await ensureUserWorkspace(data.user);
      }
    }
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
