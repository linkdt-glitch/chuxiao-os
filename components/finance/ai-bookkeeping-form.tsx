"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Keyboard, Mic, MicOff, Sparkles, Upload } from "lucide-react";
import { confirmParsedFinanceRecordAction, parseFinanceTextAction, type AIParseState } from "@/app/(app)/finance/actions";
import { ConfettiBurst } from "@/components/energy/confetti-burst";
import { AIThinking } from "@/components/ui/ai-thinking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormPendingOverlay } from "@/components/ui/form-pending-overlay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FinanceAccount, FinanceCategory } from "@/lib/finance/types";

function flat(categories: FinanceCategory[]) {
  return categories.flatMap((item) => [item, ...(item.children ?? [])]);
}

function rootCategoryFor(categories: FinanceCategory[], name?: string) {
  if (!name) return undefined;
  return categories.find((item) => item.name === name || item.children?.some((child) => child.name === name));
}

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition() {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function AIBookkeepingForm({ categories, accounts }: { categories: FinanceCategory[]; accounts: FinanceAccount[] }) {
  const router = useRouter();
  const [parseState, parseAction, parsing] = useActionState<AIParseState, FormData>(parseFinanceTextAction, {});
  const [confirmState, confirmAction, confirming] = useActionState<AIParseState, FormData>(confirmParsedFinanceRecordAction, {});
  const [rawText, setRawText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [saveCelebration, setSaveCelebration] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const parsed = parseState.parsed;
  const allCategories = flat(categories);
  const category = rootCategoryFor(categories, parsed?.category_name) ?? rootCategoryFor(categories, parsed?.subcategory_name);
  const subcategory = allCategories.find((item) => item.name === parsed?.subcategory_name);
  const account = accounts.find((item) => item.name === parsed?.account_name);

  function focusTextInput(message: string) {
    setVoiceFallback(true);
    setVoiceMessage(message);
    window.setTimeout(() => textareaRef.current?.focus(), 80);
  }

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      focusTextInput("当前浏览器不支持网页语音识别，已打开输入框。可以点击手机键盘上的麦克风说话，或直接输入文字。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const parts: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) parts.push(result[0].transcript.trim());
      }
      if (parts.length) {
        setRawText((current) => [current.trim(), parts.join("，")].filter(Boolean).join("，"));
        setVoiceMessage("语音已写入一句话描述，可以继续补充或直接识别。");
        setVoiceFallback(false);
      }
    };
    recognition.onerror = () => {
      setListening(false);
      focusTextInput("语音识别没有成功。已切换到文字输入，你也可以用手机键盘自带的麦克风继续说话。");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setVoiceMessage("");
    setVoiceFallback(false);
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      focusTextInput("语音识别启动失败。已打开输入框，请用手机键盘语音或直接输入文字。");
    }
  }

  useEffect(() => {
    if (!confirmState.success) return;

    setSaveCelebration(true);
    const redirectTimer = window.setTimeout(() => {
      window.location.assign("/finance/records?created=1");
      router.refresh();
    }, 650);
    const animationTimer = window.setTimeout(() => setSaveCelebration(false), 1200);

    return () => {
      window.clearTimeout(redirectTimer);
      window.clearTimeout(animationTimer);
    };
  }, [confirmState.success, router]);

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <ConfettiBurst active={saveCelebration} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> 快速 AI 记账</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={parseAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="raw_text">一句话描述</Label>
              <Textarea
                ref={textareaRef}
                id="raw_text"
                name="raw_text"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="今天支付供应商打样费680元，用于新款产品开发，微信支付，需要报销"
                className="min-h-28 text-base sm:min-h-40 sm:text-sm"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant={listening ? "default" : "outline"} onClick={toggleVoiceInput} className="h-11 w-full">
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? "正在听..." : "语音输入"}
              </Button>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 w-full">
                <Camera className="h-4 w-4" />
                拍照 / 上传票据
              </Button>
              <Input
                ref={fileInputRef}
                id="receipt_files"
                name="receipt_files"
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="sr-only"
                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []).map((file) => file.name))}
              />
            </div>
            {voiceMessage ? (
              <div className={`flex items-start gap-2 rounded-md p-3 text-xs ${voiceFallback ? "border border-cyan-100 bg-cyan-50 text-cyan-900" : "bg-muted text-muted-foreground"}`}>
                {voiceFallback ? <Keyboard className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
                <span>{voiceMessage}</span>
              </div>
            ) : null}
            {selectedFiles.length ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground"><Upload className="h-3.5 w-3.5" /> 已选择票据</div>
                {selectedFiles.map((name) => <div key={name} className="truncate">{name}</div>)}
              </div>
            ) : null}
            {parseState.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{parseState.error}</div> : null}
            <Button type="submit" disabled={parsing} className="h-11 w-full">{parsing ? "识别中..." : "AI 识别并生成草稿"}</Button>
            {parsing ? (
              <AIThinking
                label="AI 正在解析记账"
                variant="card"
                estimatedSeconds={6}
              />
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>解析确认</CardTitle>
        </CardHeader>
        <CardContent>
          {confirmState.success ? (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{confirmState.success}</span>
            </div>
          ) : null}
          {confirmState.error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{confirmState.error}</div> : null}
          {!parsed ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">输入一句话、语音或票据图片后，AI 会在这里生成待确认草稿。</div>
          ) : (
            <form action={confirmAction} className="grid gap-4 md:grid-cols-2">
              <FormPendingOverlay label="正在保存记账..." estimatedSeconds={2} />
              <input type="hidden" name="parse_log_id" value={parseState.parseLogId ?? ""} />
              {(parseState.pendingFileIds ?? []).map((fileId) => <input key={fileId} type="hidden" name="pending_file_id" value={fileId} />)}
              <div className="md:col-span-2 rounded-md bg-muted p-3 text-sm">
                置信度 {(parsed.confidence * 100).toFixed(0)}%
                {parsed.missing_fields.length ? <span className="ml-2 text-red-600">缺少：{parsed.missing_fields.join(", ")}</span> : null}
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <select name="record_type" defaultValue={parsed.record_type} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="income">收入</option>
                  <option value="expense">支出</option>
                  <option value="reimbursement">报销</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>金额</Label>
                <Input name="amount" type="number" step="0.01" required defaultValue={parsed.amount ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>币种</Label>
                <Input name="currency" defaultValue={parsed.currency} />
              </div>
              <div className="space-y-2">
                <Label>日期</Label>
                <Input name="occurred_at" type="date" defaultValue={parsed.occurred_at} />
              </div>
              <div className="space-y-2">
                <Label>核心类目</Label>
                <select name="category_id" defaultValue={category?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">先不分类</option>
                  {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>账户</Label>
                <select name="account_id" defaultValue={account?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">未选择</option>
                  {accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>说明</Label>
                <Textarea name="description" defaultValue={parsed.description} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>补充票据</Label>
                <Input name="receipt_files" type="file" accept="image/*,application/pdf" capture="environment" multiple />
              </div>
              <input type="hidden" name="quantity" value={parsed.quantity} />
              <details className="rounded-md border bg-muted/20 p-3 md:col-span-2">
                <summary className="cursor-pointer text-sm font-medium">更多信息</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>细分</Label>
                    <select name="subcategory_id" defaultValue={subcategory?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="">不选</option>
                      {allCategories.filter((item) => item.parent_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>支付方式</Label>
                    <Input name="payment_method" defaultValue={parsed.payment_method ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>供应商 / 客户</Label>
                    <Input name="counterparty_name" defaultValue={parsed.counterparty_name ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>项目</Label>
                    <Input name="project_name" defaultValue={parsed.project_name ?? ""} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>备注</Label>
                    <Input name="notes" defaultValue={parsed.notes ?? ""} />
                  </div>
                </div>
              </details>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="reimbursement_required" defaultChecked={parsed.reimbursement_required} />
                需要报销
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="submit_for_approval" defaultChecked={parsed.need_approval} />
                提交审批
              </label>
              <div className="grid gap-2 md:col-span-2 sm:grid-cols-2">
                {confirmState.success ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 sm:col-span-2">
                    保存成功，正在跳转到财务流水...
                  </div>
                ) : null}
                {confirmState.error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
                    {confirmState.error}
                  </div>
                ) : null}
                <Button type="submit" name="intent" value="confirm" disabled={confirming || Boolean(confirmState.success)} className="h-11">
                  {confirming ? "保存中..." : "确认并保存"}
                </Button>
                <Button type="submit" variant="outline" name="intent" value="draft" disabled={confirming || Boolean(confirmState.success)} className="h-11">
                  {confirming ? "正在保存..." : "保存草稿"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
