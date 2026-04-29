import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { invokeAI } from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAIWorkforceEvent } from "@/lib/ai-workforce/logging";
import { demoPrompts } from "@/lib/ai-workforce/demo";
import type { PromptTemplate, PromptTestRun, PromptVersion } from "@/lib/ai-workforce/types";

type PromptInput = {
  name: string;
  description?: string;
  scenario: string;
  module: string;
  tags?: string[];
  input_variables?: Array<Record<string, unknown>>;
  output_format?: string;
  quality_criteria?: string;
  content: string;
  owner_id?: string | null;
  status?: "draft" | "published" | "archived";
};

async function attachPromptRelations(prompts: PromptTemplate[]) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase || prompts.length === 0) return prompts;

  const promptIds = prompts.map((prompt) => prompt.id);
  const ownerIds = Array.from(new Set(prompts.map((prompt) => prompt.owner_id).filter(Boolean))) as string[];
  const [{ data: owners }, { data: versions }, { data: bindings }, { data: tests }, { data: feedback }] = await Promise.all([
    supabase.from("user_profiles").select("id, full_name, email").in("id", ownerIds),
    supabase
      .from("prompt_versions")
      .select("*")
      .eq("organization_id", organization.id)
      .in("prompt_template_id", promptIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("agent_prompt_bindings")
      .select("*, agents(*)")
      .eq("organization_id", organization.id)
      .in("prompt_template_id", promptIds)
      .eq("is_active", true),
    supabase
      .from("prompt_test_runs")
      .select("*")
      .eq("organization_id", organization.id)
      .in("prompt_template_id", promptIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("feedback_records")
      .select("*")
      .eq("organization_id", organization.id)
      .in("target_type", ["prompt_test_run", "prompt_run"])
      .order("created_at", { ascending: false })
  ]);

  const ownerMap = new Map((owners ?? []).map((owner) => [owner.id, owner]));
  const bindingRows = (((bindings ?? []) as Array<Record<string, unknown>>).map((binding) => ({
    ...binding,
    agent: binding.agents
  })) as unknown) as Array<Record<string, unknown> & { prompt_template_id: string }>;

  return prompts.map((prompt) => ({
    ...prompt,
    owner: prompt.owner_id ? ownerMap.get(prompt.owner_id) ?? null : null,
    versions: (versions ?? []).filter((version) => version.prompt_template_id === prompt.id),
    bindings: bindingRows.filter((binding) => binding.prompt_template_id === prompt.id),
    test_runs: (tests ?? []).filter((test) => test.prompt_template_id === prompt.id),
    feedback: (feedback ?? []).filter((item) => prompt.id === item.target_id)
  })) as PromptTemplate[];
}

export async function getPrompts() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoPrompts;

  const { data, error } = await supabase
    .from("prompt_templates")
    .select("*")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return attachPromptRelations((data ?? []) as PromptTemplate[]);
}

export async function getPromptById(promptId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoPrompts.find((prompt) => prompt.id === promptId) ?? null;

  const { data, error } = await supabase
    .from("prompt_templates")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", promptId)
    .single();

  if (error) throw error;
  const [prompt] = await attachPromptRelations([data as PromptTemplate]);
  return prompt ?? null;
}

export async function createPrompt(input: PromptInput) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ...input, id: "demo_prompt_created", organization_id: organization.id };

  const { data: prompt, error } = await supabase
    .from("prompt_templates")
    .insert({
      organization_id: organization.id,
      name: input.name,
      description: input.description ?? "",
      scenario: input.scenario,
      module: input.module,
      tags: input.tags ?? [],
      input_variables: input.input_variables ?? [],
      output_format: input.output_format ?? "",
      quality_criteria: input.quality_criteria ?? "",
      current_version: "1.0",
      status: input.status ?? "draft",
      owner_id: input.owner_id || member.user_id || null,
      created_by: member.id
    })
    .select()
    .single();

  if (error) throw error;

  const { data: version, error: versionError } = await supabase
    .from("prompt_versions")
    .insert({
      organization_id: organization.id,
      prompt_template_id: prompt.id,
      version: "1.0",
      content: input.content,
      change_note: "初始版本",
      created_by: member.id
    })
    .select()
    .single();

  if (versionError) throw versionError;

  await supabase.from("files").insert({
    organization_id: organization.id,
    storage_bucket: "company-assets",
    storage_path: `ai-workforce/prompts/${prompt.id}/v1.0.md`,
    file_name: `${input.name}-v1.0.md`,
    mime_type: "text/markdown",
    size_bytes: input.content.length,
    visibility: "organization",
    uploaded_by: member.user_id ?? member.agent_id ?? member.id,
    uploaded_by_type: member.member_type,
    metadata: { prompt_template_id: prompt.id, prompt_version_id: version.id },
    asset_type: "prompt_doc",
    tags: input.tags ?? [],
    summary: input.description ?? ""
  });

  await recordAIWorkforceEvent({
    event_key: "ai_workforce.prompt.created",
    action: "create",
    related_record_type: "prompt_template",
    related_record_id: prompt.id,
    after_data: { name: input.name, version: "1.0", status: input.status ?? "draft" },
    payload: { id: prompt.id, name: input.name }
  });
  return prompt as PromptTemplate;
}

export async function updatePrompt(promptId: string, patch: Partial<Omit<PromptInput, "content">>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { error } = await supabase.from("prompt_templates").update(patch).eq("id", promptId);
  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: "ai_workforce.prompt.updated",
    action: "update",
    related_record_type: "prompt_template",
    related_record_id: promptId,
    after_data: patch as Record<string, unknown>
  });
  return { ok: true };
}

export async function createPromptVersion(input: {
  prompt_template_id: string;
  version: string;
  content: string;
  change_note?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data: existing } = await supabase
    .from("prompt_versions")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("prompt_template_id", input.prompt_template_id)
    .eq("version", input.version)
    .maybeSingle();
  if (existing) throw new Error(`版本号 ${input.version} 已存在，请使用不同的版本号`);

  const { data, error } = await supabase
    .from("prompt_versions")
    .insert({
      organization_id: organization.id,
      prompt_template_id: input.prompt_template_id,
      version: input.version,
      content: input.content,
      change_note: input.change_note,
      created_by: member.id
    })
    .select()
    .single();

  if (error) throw error;
  const { error: updateError } = await supabase
    .from("prompt_templates")
    .update({ current_version: input.version })
    .eq("id", input.prompt_template_id);
  if (updateError) throw updateError;

  await recordAIWorkforceEvent({
    event_key: "ai_workforce.prompt.version_created",
    action: "create_version",
    related_record_type: "prompt_template",
    related_record_id: input.prompt_template_id,
    after_data: { version: input.version, change_note: input.change_note ?? "" }
  });
  return data as PromptVersion;
}

async function setPromptStatus(promptId: string, status: "published" | "archived", eventKey: string, action: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  if (status === "published") {
    const { data: versions } = await supabase
      .from("prompt_versions")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("prompt_template_id", promptId)
      .limit(1);
    if (!versions || versions.length === 0) {
      throw new Error("无法发布：该提示词尚未创建任何版本");
    }
  }

  const { error } = await supabase.from("prompt_templates").update({ status }).eq("id", promptId);
  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: eventKey,
    action,
    related_record_type: "prompt_template",
    related_record_id: promptId,
    after_data: { status }
  });
  return { ok: true };
}

export async function publishPrompt(promptId: string) {
  return setPromptStatus(promptId, "published", "ai_workforce.prompt.published", "publish");
}

export async function archivePrompt(promptId: string) {
  return setPromptStatus(promptId, "archived", "ai_workforce.prompt.archived", "archive");
}

function renderPrompt(content: string, variables: Record<string, unknown>) {
  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => String(variables[key] ?? ""));
}

export async function testPrompt(input: {
  prompt_template_id: string;
  prompt_version_id?: string | null;
  test_input: Record<string, unknown>;
  rating?: number | null;
  notes?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true, test_output: "AI Provider interface reserved. Real model execution can be plugged in here." };

  const prompt = await getPromptById(input.prompt_template_id);
  if (!prompt) throw new Error("Prompt not found");
  const version =
    prompt.versions?.find((item) => item.id === input.prompt_version_id) ??
    prompt.versions?.find((item) => item.version === prompt.current_version) ??
    prompt.versions?.[0];

  if (!version) throw new Error("Prompt version not found");

  const rendered = renderPrompt(version.content, input.test_input);
  const ai = await invokeAI({ module: "ai_workforce", prompt: rendered });

  const { data, error } = await supabase
    .from("prompt_test_runs")
    .insert({
      organization_id: organization.id,
      prompt_template_id: input.prompt_template_id,
      prompt_version_id: version.id,
      tested_by: member.id,
      test_input: input.test_input,
      test_output: ai.text,
      ai_invocation_log_id: ai.invocationLogId ?? null,
      rating: input.rating ?? null,
      notes: input.notes ?? null
    })
    .select()
    .single();

  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: "ai_workforce.prompt.tested",
    action: "test",
    related_record_type: "prompt_test_run",
    related_record_id: data.id,
    after_data: { prompt_template_id: input.prompt_template_id, prompt_version_id: version.id }
  });
  return data as PromptTestRun;
}
