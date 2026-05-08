import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { saveHomeContentAction } from "@/app/(app)/home/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentMember } from "@/lib/auth";
import { getHomeContent } from "@/lib/home/queries";

function valuesToText(values: { title: string; description?: string }[]) {
  return values
    .map((v) => (v.description ? `${v.title} :: ${v.description}` : v.title))
    .join("\n");
}

function goalsToText(goals: { title: string; description?: string; target_date?: string; progress?: number }[]) {
  return goals
    .map((g) =>
      [g.title, g.description ?? "", g.target_date ?? "", g.progress ?? ""]
        .map((s) => String(s).trim())
        .join(" | ")
        .replace(/(\s*\|\s*)+$/, "")
    )
    .join("\n");
}

export default async function HomeEditPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const member = await getCurrentMember();
  if (member?.role?.key !== "owner") {
    redirect("/home");
  }

  const params = (await searchParams) ?? {};
  const content = await getHomeContent();

  return (
    <>
      <PageHeader
        title="编辑首页内容"
        description="使命、愿景、价值观、近期目标、公告栏。所有内容仅创始人可编辑，全公司同步。"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/home">
              <ArrowLeft className="h-3.5 w-3.5" />返回首页
            </Link>
          </Button>
        }
      />

      {params.error ? (
        <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.10] p-3 text-[13px] text-rose-200">
          {params.error}
        </div>
      ) : null}

      <form action={saveHomeContentAction} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>使命</CardTitle>
            <CardDescription>一句话表达：公司存在是为了解决什么问题。</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="mission"
              defaultValue={content.mission ?? ""}
              rows={3}
              placeholder="例：用 AI 让每一个普通团队都能像顶级公司一样高效协作。"
              className="text-[15px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>愿景（支持多段落）</CardTitle>
            <CardDescription>
              这是首页最显眼的内容。可以写多段，用空行 (Enter 两次) 分段。展示时会按段落排版。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="vision"
              defaultValue={content.vision ?? ""}
              rows={12}
              placeholder={"我们相信，每个普通人都该有顶级团队的杠杆。\n\nAI 不是工具，而是可以信任的同事。我们要让 AI 真正参与决策、执行、复盘，把信息差变成执行差，把执行差变成结果差。\n\n3-5 年后，初晓 OS 会成为 AI 原生公司的操作系统标准 —— 像 Office 之于文档、Notion 之于知识、Figma 之于设计。"}
              className="text-[15px] leading-7"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>价值观</CardTitle>
            <CardDescription>
              一行一条。格式：
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">标题 :: 描述</code>
              （描述可省略）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="values"
              defaultValue={valuesToText(content.values)}
              rows={6}
              placeholder={"客户至上 :: 把 100% 的注意力放到用户的真实问题上\n极致专注 :: 做对的事，做透\n快速迭代 :: 每周都看得到进步"}
              className="font-mono text-[13px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>近期目标</CardTitle>
            <CardDescription>
              一行一条。格式（用 <code className="font-mono text-[11px]">|</code> 分隔）：
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
                标题 | 描述 | 目标日期 (YYYY-MM-DD) | 进度 (0-100)
              </code>
              。后三个可省略。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="goals"
              defaultValue={goalsToText(content.goals)}
              rows={6}
              placeholder={"2025 Q4 营收破 100 万 | 达成首个百万营收里程碑 | 2025-12-31 | 60\nAI 能力矩阵搭建完成 | 上线 5 个核心 AI 员工 | 2025-11-30 | 40"}
              className="font-mono text-[13px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>公告栏</CardTitle>
            <CardDescription>一行一条公告，最多 10 条。最新的写在最前。</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="announcements"
              defaultValue={content.announcements.join("\n")}
              rows={5}
              placeholder={"本周五下午 3 点全员复盘\n新版报销审批已上线，详见操作手册"}
              className="text-[14px]"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              当前 {content.announcements.length} 条 · 最多 10 条 · 同时同步到顶部 banner
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="outline" type="button">
            <Link href="/home">取消</Link>
          </Button>
          <Button type="submit">保存所有内容</Button>
        </div>
      </form>
    </>
  );
}
