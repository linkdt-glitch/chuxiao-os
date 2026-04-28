import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { requirePermission } from "@/lib/permissions";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown",
  "application/zip", "application/x-zip-compressed",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav", "audio/ogg"
]);

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

function normalizeStoragePath(organizationId: string, storagePath: string) {
  const cleanPath = storagePath.replace(/^\/+/, "");
  if (cleanPath.startsWith(`${organizationId}/`)) return cleanPath;
  return `${organizationId}/${cleanPath}`;
}

export async function uploadFile(input: {
  file?: File;
  body?: Blob | ArrayBuffer | Buffer;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  visibility?: "organization" | "restricted";
  asset_type?: string | null;
  tags?: string[] | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!ALLOWED_MIME_TYPES.has(input.mime_type)) {
    throw new Error(`不支持的文件类型：${input.mime_type}`);
  }
  if (input.size_bytes > MAX_FILE_SIZE_BYTES) {
    throw new Error("文件大小不能超过 100MB。");
  }

  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };
  const storagePath = normalizeStoragePath(organization.id, input.storage_path);
  const fileBody = input.file ?? input.body;

  if (fileBody) {
    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(storagePath, fileBody, {
        contentType: input.mime_type || input.file?.type || "application/octet-stream",
        upsert: false
      });

    if (uploadError) throw uploadError;
  }

  const { data, error } = await supabase
    .from("files")
    .insert({
      organization_id: organization.id,
      storage_bucket: "company-assets",
      storage_path: storagePath,
      file_name: input.file_name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      uploaded_by: member.user_id ?? member.agent_id ?? member.id,
      uploaded_by_type: member.member_type,
      visibility: input.visibility ?? "organization",
      metadata: input.metadata ?? {},
      asset_type: input.asset_type,
      tags: input.tags,
      summary: input.summary
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({
    event_key: "file.uploaded",
    action: "create",
    module: "files",
    related_record_type: "file",
    related_record_id: data.id,
    after_data: data
  });
  await emitEvent({
    event_key: "knowledge.asset.updated",
    module: "knowledge",
    payload: { id: data.id, file_name: data.file_name, asset_type: data.asset_type ?? input.metadata?.asset_type }
  });
  return data;
}

export async function deleteFile(fileId: string) {
  await requirePermission("governance.manage");
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", fileId)
    .single();

  if (fileError) throw fileError;

  await supabase.storage.from(file.storage_bucket).remove([file.storage_path]);

  const { error } = await supabase
    .from("files")
    .delete()
    .eq("organization_id", organization.id)
    .eq("id", fileId);

  if (error) throw error;
  await logAction({
    event_key: "file.deleted",
    action: "delete",
    module: "files",
    related_record_type: "file",
    related_record_id: fileId,
    before_data: file
  });
  await emitEvent({
    event_key: "knowledge.asset.updated",
    module: "knowledge",
    payload: { id: fileId, action: "deleted" }
  });
  return { ok: true };
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
