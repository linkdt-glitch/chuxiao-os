"use client";

/**
 * AssistantChat —— 初晓 AI 对话界面
 *
 * 视觉参考：Claude Code 对话面板
 *  - 中央单列，max-w-3xl
 *  - 用户消息：右对齐 + 柔和 bubble
 *  - 助手消息：全宽，无 bubble，avatar + 名字 + 纯文本（whitespace-pre-wrap）
 *  - 底部 floating composer：圆角大卡片 + 发送按钮
 *  - 空状态：hero 欢迎 + 4 张 starter prompt 卡（替代原来的右侧栏）
 *
 * 保留：流式接收、思考动画文案 ("AI 正在光速思考")、错误处理
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Brain, Sparkles } from "lucide-react";
import { AIThinking } from "@/components/ui/ai-thinking";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AssistantChatProps = {
  /** 是否创始人 / 老板 —— 用来在头部显示「创始人模式」徽章。 */
  isFounder?: boolean;
  /** 当前对话使用的模型显示名（如 "DeepSeek-R1（深度思考）"）。 */
  modelLabel?: string;
  /** 估一次对话的价格（CNY）—— 给用户「这次大概花多少」的参考。 */
  approxCostPerTurnCny?: number;
};

const STARTER_PROMPTS = [
  {
    title: "本周工作复盘",
    detail: "帮我把本周工作复盘成：做得好、问题、下一步行动。"
  },
  {
    title: "AI Agent 安全规则",
    detail: "请帮我设计一个小公司使用 AI Agent 的安全规则。"
  },
  {
    title: "经营会议提纲",
    detail: "给我一份月度经营复盘会议的提纲（含数据、风险、决策）。"
  },
  {
    title: "招聘 JD 草稿",
    detail: "给一份高级前端工程师的 JD 草稿，要突出 AI 工程能力。"
  }
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "你好，我是初晓 AI 助手。可以帮你梳理思路、起草文档、做决策、做经营复盘 —— 直接问我吧。"
};

function formatCostLabel(cost?: number) {
  if (!cost || cost <= 0) return "";
  if (cost < 0.01) return "< ¥0.01";
  return `约 ¥${cost.toFixed(2)}`;
}

export function AssistantChat({
  isFounder = false,
  modelLabel,
  approxCostPerTurnCny
}: AssistantChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const showStarter = messages.length === 1 && messages[0].role === "assistant" && !pending;

  // 新消息到来时自动滚到底部
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function sendMessage(content = input) {
    const question = content.trim();
    if (!question || pending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    const assistantIndex = nextMessages.length;
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, stream: true })
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "AI 助手暂时没有返回内容。");
        setMessages(nextMessages);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message, index) =>
            index === assistantIndex ? { ...message, content: answer } : message
          )
        );
      }

      if (!answer.trim()) {
        setMessages((current) =>
          current.map((message, index) =>
            index === assistantIndex ? { ...message, content: "AI 没有返回内容，请稍后重试。" } : message
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 助手调用失败。");
      setMessages(nextMessages);
    } finally {
      setPending(false);
    }
  }

  function pickStarter(detail: string) {
    sendMessage(detail);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      {/* 顶部模型徽章 —— 只对创始人显示，员工不需要看到模型 / 价格细节 */}
      {isFounder && modelLabel ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-white px-3.5 py-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Brain className="h-3 w-3" />
            创始人模式
          </span>
          <span className="font-semibold text-slate-900">{modelLabel}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-700">顶级推理模型，多步骤决策最强</span>
          {approxCostPerTurnCny ? (
            <span className="ml-auto font-mono tabular-nums text-slate-600">
              {formatCostLabel(approxCostPerTurnCny)}/次
            </span>
          ) : null}
        </div>
      ) : null}

      {/* 消息区 */}
      <div className="flex flex-col gap-7 pb-40 pt-2">
        {messages.map((message, index) => {
          // pending 中且最后一条 assistant 还没拿到第一个 chunk → 用 thinking 卡片代替
          const isStreamingPlaceholder =
            pending && index === messages.length - 1 && message.role === "assistant" && !message.content.trim();
          if (isStreamingPlaceholder) {
            return (
              <div key={`thinking-${index}`} className="flex gap-3">
                <AssistantAvatar />
                <div className="min-w-0 flex-1 pt-0.5">
                  <RoleLabel role="assistant" />
                  <div className="mt-2 max-w-md">
                    <AIThinking label="AI 正在光速思考" variant="card" />
                  </div>
                </div>
              </div>
            );
          }

          if (message.role === "user") {
            return (
              <div key={`u-${index}`} className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl bg-slate-100 px-4 py-3 text-[15px] leading-7 text-slate-900">
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                </div>
              </div>
            );
          }

          return (
            <div key={`a-${index}`} className="flex gap-3">
              <AssistantAvatar />
              <div className="min-w-0 flex-1 pt-0.5">
                <RoleLabel role="assistant" />
                <div className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-900">
                  {message.content}
                  {pending && index === messages.length - 1 ? (
                    <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-[2px] animate-pulse bg-orange-500/80 align-baseline" />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {/* 空状态：starter prompts */}
        {showStarter ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt.title}
                type="button"
                onClick={() => pickStarter(prompt.detail)}
                className="group rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50"
              >
                <div className="text-[14px] font-medium text-slate-900">{prompt.title}</div>
                <div className="mt-1 line-clamp-2 text-[12px] text-slate-500 group-hover:text-slate-700">
                  {prompt.detail}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <div ref={scrollAnchorRef} aria-hidden />
      </div>

      {/* 底部 floating composer —— 移动端给 MobileTabbar 留位 */}
      <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] -mx-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:bottom-0 lg:pb-4">
        <div
          className="pointer-events-none absolute inset-x-0 -top-12 h-12"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(250,250,249,0.92))"
          }}
        />
        {error ? (
          <div className="relative mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            {error}
          </div>
        ) : null}
        <div
          className="relative rounded-2xl border border-slate-200 bg-white p-2"
          style={{
            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -8px rgba(15,23,42,0.10)"
          }}
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="问点什么…  Enter 发送，Shift+Enter 换行"
            className="min-h-12 resize-none border-0 bg-transparent text-[15px] leading-7 shadow-none focus-visible:ring-0 focus-visible:shadow-none"
            rows={1}
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1">
            <span className="text-[10px] tracking-wider text-slate-400">
              {pending ? "AI 在思考…" : "Enter 发送 · Shift+Enter 换行"}
            </span>
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={pending || !input.trim()}
              className="grid h-8 w-8 place-items-center rounded-xl bg-orange-500 text-white transition-colors hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400"
              aria-label="发送"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="relative mt-2 text-center text-[10px] text-slate-400">
          AI 助手只提供分析、建议、总结、草稿 —— 不会自动付款 / 删数据 / 改权限 / 对外发送。
        </div>
      </div>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
      style={{
        background: "radial-gradient(circle at 50% 40%, rgba(251,191,36,0.45), #ffffff)",
        boxShadow: "0 0 0 1px rgba(251,146,60,0.40), 0 1px 4px rgba(249,115,22,0.20)"
      }}
      aria-hidden
    >
      <Sparkles className="h-3.5 w-3.5 text-orange-600" />
    </div>
  );
}

function RoleLabel({ role }: { role: "user" | "assistant" }) {
  return (
    <div className="text-[12px] font-semibold tracking-wide text-slate-700">
      {role === "assistant" ? "初晓 AI" : "你"}
    </div>
  );
}
