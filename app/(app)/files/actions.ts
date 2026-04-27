"use server";

import { revalidatePath } from "next/cache";
import { deleteFile, uploadFile } from "@/lib/files";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "upload";
}

function tags(raw?: string) {
  return raw
    ? raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : null;
}

export async function uploadFileAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("请选择要上传的文件");

  const assetType = value(formData, "asset_type") ?? "other";
  await uploadFile({
    file,
    file_name: file.name,
    storage_path: `files/${Date.now()}-${safeFileName(file.name)}`,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    visibility: (value(formData, "visibility") ?? "organization") as "organization" | "restricted",
    asset_type: assetType,
    tags: tags(value(formData, "tags")),
    summary: value(formData, "summary") ?? null,
    metadata: { asset_type: assetType }
  });

  revalidatePath("/files");
  revalidatePath("/knowledge");
}

export async function deleteFileAction(formData: FormData) {
  const id = value(formData, "file_id");
  if (!id) throw new Error("Missing file id");
  await deleteFile(id);
  revalidatePath("/files");
  revalidatePath("/knowledge");
}
