import { Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSystemEvents } from "@/lib/data/queries";

export default async function EventsPage() {
  const events = await getSystemEvents();

  return (
    <>
      <PageHeader
        title="Events 事件中心"
        description="统一记录 organization、member、approval、agent、ai 等系统事件，供自动化工作流订阅。"
      />
      <Card>
        <CardHeader>
          <CardTitle>按模块筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input placeholder="例如 approvals、agents、ai-settings" />
          <Button variant="outline"><Filter className="h-4 w-4" />筛选</Button>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>事件列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>event_key</TableHead>
                <TableHead>source</TableHead>
                <TableHead>actor</TableHead>
                <TableHead>module</TableHead>
                <TableHead>status</TableHead>
                <TableHead>payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.event_key}</TableCell>
                  <TableCell>{event.event_source}</TableCell>
                  <TableCell>{event.actor_type}:{event.actor_id ?? "system"}</TableCell>
                  <TableCell>{event.module}</TableCell>
                  <TableCell><StatusBadge value={event.status} /></TableCell>
                  <TableCell><code className="text-xs">{JSON.stringify(event.payload)}</code></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
