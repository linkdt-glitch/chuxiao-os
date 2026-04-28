import Link from "next/link";
import { Award, CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAchievementBadges, getUserAchievements } from "@/lib/energy/achievements";
import { cn, formatDate } from "@/lib/utils";

const categories = [
  { key: "all", label: "全部" },
  { key: "finance", label: "经营" },
  { key: "execution", label: "执行" },
  { key: "ai", label: "AI" },
  { key: "knowledge", label: "知识" },
  { key: "evolution", label: "飞轮" },
  { key: "habit", label: "习惯" }
];

export default async function EnergyAchievementsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const category = params.category ?? "all";
  const [badges, achievements] = await Promise.all([
    getAchievementBadges(),
    getUserAchievements()
  ]);

  const earnedByBadgeId = new Map(achievements.map((item) => [item.achievement_badge_id, item]));
  const filtered = badges.filter((badge) => category === "all" || badge.category === category);

  return (
    <>
      <PageHeader
        title="成就徽章"
        description="说明：徽章用于记录组织能力沉淀，不做排名、不做 PK。核心价值：让重要成长节点被看见。"
        action={<Button asChild variant="outline"><Link href="/energy">返回能量首页</Link></Button>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((item) => (
          <Button key={item.key} asChild size="sm" variant={category === item.key ? "default" : "outline"}>
            <Link href={item.key === "all" ? "/energy/achievements" : `/energy/achievements?category=${item.key}`}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((badge) => {
          const earned = earnedByBadgeId.get(badge.id);
          return (
            <Card key={badge.id} className={cn(!earned && "opacity-78")}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                    earned
                      ? "border-amber-200 bg-gradient-to-br from-amber-100 via-cyan-100 to-indigo-100 text-amber-600"
                      : "border-slate-200 bg-white/50 text-muted-foreground"
                  )}>
                    {earned ? <Award className="h-6 w-6" /> : <Circle className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{badge.name}</div>
                      <Badge variant={earned ? "warning" : "outline"}>{badge.level}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{badge.description}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{badge.category}</span>
                      {earned ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {formatDate(earned.earned_at)}
                        </span>
                      ) : (
                        <span>尚未解锁</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
