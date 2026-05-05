import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "缺少新密码。" }, { status: 400 });
    }
    if (password.length < 12) {
      return NextResponse.json({ error: "密码至少需要 12 位。" }, { status: 400 });
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "密码需同时包含字母和数字。" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "系统配置不完整。" }, { status: 500 });
    }

    // Get current session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "未登录，请重新登录。" }, { status: 401 });
    }

    // Update password via admin client (bypasses email confirmation)
    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "系统服务不可用。" }, { status: 500 });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password });
    if (updateError) {
      console.error("[change-password] updateUserById failed", updateError);
      return NextResponse.json({ error: "密码更新失败，请重试。" }, { status: 400 });
    }

    // Clear the must_change_password flag
    await admin
      .from("user_profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[change-password]", err);
    return NextResponse.json({ error: "服务器内部错误。" }, { status: 500 });
  }
}
