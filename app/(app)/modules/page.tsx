import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status";
import { getAllModulesWithOrganizationState } from "@/lib/modules";
import { toggleOrganizationModuleAction } from "./actions";

export default async function ModulesPage() {
  const modules = (await getAllModulesWithOrganizationState()).filter((item) => item.module?.key !== "approvals");

  return (
    <>
      <PageHeader
        title="Modules 模块管理"
        description="模块通过 key、route、required_permission 和 organization_modules 注册，未来模块可逐个接入。"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-3 text-sm">
                <span>{item.module?.name}</span>
                <StatusBadge value={item.module?.status ?? "disabled"} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="min-h-10 text-sm text-muted-foreground">{item.module?.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.is_enabled ? "success" : "secondary"}>
                  {item.is_enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Badge variant="outline">{item.module?.category}</Badge>
                <Badge variant="outline">{item.module?.key}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <code className="text-xs text-muted-foreground">{JSON.stringify(item.settings)}</code>
                <form action={toggleOrganizationModuleAction}>
                  <input type="hidden" name="module_id" value={item.module_id} />
                  <input type="hidden" name="enabled" value={String(!item.is_enabled)} />
                  <Button type="submit" variant={item.is_enabled ? "outline" : "default"} size="sm">
                    {item.is_enabled ? "停用" : "启用"}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
