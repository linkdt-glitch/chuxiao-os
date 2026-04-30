import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const preview = searchParams.get("preview") === "1";
  const supabase = await createSupabaseServerClient();
  if (!supabase) return new NextResponse("Supabase is not configured", { status: 404 });

  const organization = await getCurrentOrganization();
  const { data: file, error } = await supabase
    .from("files")
    .select("id, organization_id, storage_bucket, storage_path, file_name")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .single();

  if (error || !file) return new NextResponse("File not found", { status: 404 });

  const { data, error: signedUrlError } = await supabase.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, 60, preview ? undefined : { download: file.file_name });

  if (signedUrlError || !data?.signedUrl) {
    return new NextResponse("Unable to create download URL", { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
