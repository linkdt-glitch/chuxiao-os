import Link from "next/link";
import { Award, CalendarDays, Flame, Gem, Settings, Sparkles } from "lucide-react";
import { EnergyProgressBar } from "@/components/energy/energy-progress-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserAchievements } from "@/lib/energy/achievements";
import { getEnergySummary, getRecentEnergyEvents } from "@/lib/energy/events";
import { getUserStreaks } from "@/lib/energy/streaks";
import { formatDate } from "@/lib/utils";

export default async function EnergyPage() {
  const [summary, events, achievements, streaks] = await Promise.all([
    getEnergySummary(),
    getRecentEnergyEvents(10),
    getUserAchievements(),
    getUserStreaks()
  ]);

  const loginStreak = streaks.find((item) => item.streak_type === "login");
  const recentAchievements = achievements.slice(0, 4);

  return (
    <>
      <PageHeader
        title="组织能量系统"
        description="说明：把记账、任务、Agent 协作、文件归档、复盘和 SOP 沉淀转化为克制的成长反馈。核心价值：小事有反馈，大事有仪式，长期有成长。"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/energy/achievements"><Award className="h-4 w-4" />成就徽章</Link></Button>
            <Button asChild><Link href="/energy/settings"><Settings className="h-4 w-4" />能量设置</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <EnergyMetric title="今日组织能量" value={summary.today} icon={Sparkles} />
        <EnergyMetric title="本周组织能量" value={summary.week} icon={Flame} />
        <EnergyMetric title="本月组织能量" value={summary.month} icon={Gem} />
        <EnergyMetric title="我的本月能量" value={summary.mine} icon={CalendarDays} suffix={`连续 ${loginStreak?.current_count ?? 0} 天`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>能量进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <EnergyProgressBar label="今日节奏" value={summary.today} max={20} />
            <EnergyProgressBar label="本周推进" value={summary.week} max={120} />
            <EnergyProgressBar label="本月沉淀" value={summary.month} max={420} />
            <div className="rounded-lg border border-white/70 bg-white/58 p-4 text-sm leading-6 text-muted-foreground">
              能量不是排名，也不是考核。它只是让组织看见每一次完成、归档、复盘和协作，让长期成长有更清晰的反馈。
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近成就</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAchievements.length ? (
              <div className="space-y-3">
                {recentAchievements.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/70 bg-white/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.badge?.name}</div>
                      <Badge variant="warning">{item.badge?.level}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.earned_at)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="还没有成就" description="完成第一笔记账、一个任务、一次复盘或一个 SOP 后，会在这里沉淀。" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>最近能量事件</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>事件</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>反馈</TableHead>
                  <TableHead>能量</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="font-medium">{event.event_key}</div>
                      <div className="text-xs text-muted-foreground">{event.message ?? "-"}</div>
                    </TableCell>
                    <TableCell>{event.source_module ? <Badge variant="outline">{event.source_module}</Badge> : "-"}</TableCell>
                    <TableCell>{event.animation_type}</TableCell>
                    <TableCell className="font-mono text-cyan-700">+{event.energy_points}</TableCell>
                    <TableCell>{formatDate(event.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="暂时没有能量事件" description="系统会从财务、项目、AI、知识和复盘事件中生成组织能量。" />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function EnergyMetric({
  title,
  value,
  icon: Icon,
  suffix
}: {
  title: string;
  value: number;
  icon: typeof Sparkles;
  suffix?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-cyan-700" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{suffix ?? "组织成长反馈"}</div>
      </CardContent>
    </Card>
  );
}
