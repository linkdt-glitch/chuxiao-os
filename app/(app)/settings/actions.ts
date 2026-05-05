"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function saveAnnouncementsAction(formData: FormData) {
  const raw = (formData.get("announcements") as string) ?? "";
  const announcements = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    // Demo mode: persist via cookie so all server components see the update
    const jar = await cookies();
    jar.set("demo_announcements", JSON.stringify(announcements), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return;
  }

  await requirePermission("organization.manage");

  const org = await getCurrentOrganization();

  await supabase
    .from("organizations")
    .update({ settings: { ...org.settings, announcements } })
    .eq("id", org.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
