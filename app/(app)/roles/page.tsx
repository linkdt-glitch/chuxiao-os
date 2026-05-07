import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRolesAndPermissions } from "@/lib/data/queries";
import { getRolePermissionKeys } from "@/lib/permissions";

export default async function RolesPage() {
  const { roles, permissions } = await getRolesAndPermissions();

  return (
    <>
      <PageHeader
        title="权限与角色"
        description="默认角色不可删除；自定义角色复用同一套 permissions、role_permissions、member_permissions。"
        action={<Button disabled variant="outline">自定义角色稍后开放</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-sm">
                  {role.name}
                  {role.is_system ? <Badge variant="info">System</Badge> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{role.description}</p>
                <div className="flex items-center justify-between">
                  <span>Risk rank {role.risk_rank}</span>
                  <Button disabled variant="outline" size="sm">
                    {role.is_system ? "系统角色保护" : "删除稍后开放"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>权限矩阵</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">Permission</th>
                    {roles.map((role) => (
                      <th key={role.id} className="h-10 px-3 text-left text-xs font-medium text-muted-foreground">{role.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => (
                    <tr key={permission.id} className="border-b">
                      <td className="px-3 py-3">
                        <div className="font-medium">{permission.name}</div>
                        <div className="text-xs text-muted-foreground">{permission.key}</div>
                      </td>
                      {roles.map((role) => {
                        const keys = getRolePermissionKeys(role.key);
                        const checked = keys.includes("*") || keys.includes(permission.key);
                        return (
                          <td key={role.id} className="px-3 py-3">
                            <input
                              type="checkbox"
                              defaultChecked={checked}
                              disabled
                              aria-label={`${role.name} ${permission.key}`}
                              className="cursor-not-allowed"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
