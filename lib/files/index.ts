import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function uploadFile(input: {
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("files")
    .insert({
      organization_id: organization.id,
      storage_bucket: "company-assets",
      storage_path: input.storage_path,
      file_name: input.file_name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      uploaded_by: member.user_id ?? member.agent_id ?? member.id,
      uploaded_by_type: member.member_type,
      visibility: "organization",
      metadata: {}
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({ event_key: "file.uploaded", action: "create", module: "files", related_record_type: "file", related_record_id: data.id });
  return data;
}

export async function linkFileToRecord(input: {
  file_id: string;
  module: string;
  record_type: string;
  record_id: string;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { error } = await supabase.from("file_links").insert({
    organization_id: organization.id,
    file_id: input.file_id,
    module: input.module,
    record_type: input.record_type,
    record_id: input.record_id
  });

  if (error) throw error;
  return { ok: true };
}
