"use client";

import { useRef, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const starterPrompts = [
  "帮我用 5 条要点说明初晓 OS 今天适合怎么开始使用。",
  "请帮我设计一个小公司使用 AI Agent 的安全规则。",
  "请帮我把本周工作复盘成：做得好、问题、下一步行动。"
];

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好，我是初晓 OS 的企业 AI 助手。你可以问我经营、任务、审批、文件、Agent、复盘和流程优化相关问题。"
    }
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function sendMessage(content = input) {
    const question = content.trim();
    if (!question || pending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setPending(true);
    setError("");

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: nextMessages })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: Message;
    };

    setPending(false);

    if (!response.ok || payload.error || !payload.message) {
      setError(payload.error ?? "AI 助手暂时没有返回内容。");
      return;
    }

    setMessages((current) => [...current, payload.message!]);
  }

  return (
    <div className="grid min-h-[680px] gap-4 lg:grid-cols-[1fr_320px]">
      <section className="flex min-h-[680px] flex-col rounded-lg border border-white/75 bg-white/72 shadow-sm backdrop-blur-xl">
        <div className="border-b border-slate-200/70 p-4">
          <div className="font-semibold">初晓 AI 对话</div>
          <div className="text-sm text-muted-foreground">连接当前启用的 AI Provider，调用记录会进入 AI 调用日志。</div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className="flex max-w-[82%] gap-3">
                {message.role === "assistant" ? (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                    <Bot className="h-4 w-4" />
                  </div>
                ) : null}
                <div
                  className={
                    message.role === "user"
                      ? "rounded-lg bg-gradient-to-b from-cyan-500 to-sky-600 px-4 py-3 text-sm leading-6 text-white shadow-sm"
                      : "rounded-lg border border-slate-200/70 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm"
                  }
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.role === "user" ? (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <UserRound className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {pending ? (
            <div className="flex justify-start">
              <div className="rounded-lg border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
                AI 正在思考...
              </div>
            </div>
          ) : null}
        </div>
        <div className="border-t border-slate-200/70 p-4">
          {error ? <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}
          <div className="flex gap-2">
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
              className="min-h-12"
              placeholder="输入问题，Enter 发送，Shift + Enter 换行"
            />
            <Button type="button" className="h-auto px-4" onClick={() => sendMessage()} disabled={pending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-lg border border-white/75 bg-white/72 p-4 shadow-sm backdrop-blur-xl">
          <div className="font-semibold">可以这样问</div>
          <div className="mt-3 space-y-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="w-full rounded-md border border-slate-200/70 bg-white/70 p-3 text-left text-sm text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50/70"
                onClick={() => {
                  setInput(prompt);
                  inputRef.current?.focus();
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/75 bg-white/72 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur-xl">
          <div className="mb-2 font-semibold text-foreground">安全边界</div>
          AI 助手当前只提供分析、建议、总结和草稿，不会自动付款、删数据、改权限或对外发送内容。
        </div>
      </aside>
    </div>
  );
}
