import { KeyRound, Mail, UserPlus, UserRoundX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentOrganization } from "@/lib/auth";
import { getMembers } from "@/lib/data/queries";
import { createHumanMemberAction, disableMemberAction } from "./actions";

export default async function OrganizationPage() {
  const [organization, members] = await Promise.all([getCurrentOrganization(), getMembers()]);

  return (
    <>
      <PageHeader
        title="Organization 组织与成员"
        description="统一管理 human / agent / system 操作者身份；Agent 成员必须绑定人类负责人。"
        action={<Button asChild><a href="#add-member"><UserPlus className="h-4 w-4" />添加成员</a></Button>}
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>组织信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div><span className="text-muted-foreground">名称：</span>{organization.name}</div>
          <div><span className="text-muted-foreground">Slug：</span>{organization.slug}</div>
          <div><span className="text-muted-foreground">Timezone：</span>{String(organization.settings.timezone ?? "Asia/Shanghai")}</div>
        </CardContent>
      </Card>
      <Card id="add-member" className="mb-6">
        <CardHeader>
          <CardTitle>添加使用成员</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createHumanMemberAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_160px_1fr_auto] lg:items-end">
            <label className="space-y-2 text-sm font-medium">
              成员邮箱
              <input
                type="email"
                name="email"
                required
                placeholder="name@company.com"
                className="h-10 w-full rounded-md border border-slate-200/80 bg-white/80 px-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              姓名
              <input
                name="display_name"
                required
                placeholder="例如：运营负责人"
                className="h-10 w-full rounded-md border border-slate-200/80 bg-white/80 px-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              角色
              <select
                name="role_key"
                defaultValue="member"
                className="h-10 w-full rounded-md border border-slate-200/80 bg-white/80 px-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="member">Member 成员</option>
                <option value="manager">Manager 主管</option>
                <option value="admin">Admin 管理员</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              初始密码
              <input
                type="password"
                name="password"
                required
                minLength={8}
                placeholder="至少 8 位，创建后发给成员"
                className="h-10 w-full rounded-md border border-slate-200/80 bg-white/80 px-3 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <Button type="submit" className="h-10">
              <UserPlus className="h-4 w-4" />
              创建账号
            </Button>
          </form>
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" />创建后无需修改 Render 白名单，新成员会自动绑定当前组织。</div>
            <div className="flex items-center gap-2"><KeyRound className="h-4 w-4" />请把邮箱和初始密码单独发给成员，登录后建议尽快更换密码。</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>成员列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{member.display_name}</div>
                    <div className="text-xs text-muted-foreground">{member.email ?? member.agent_id}</div>
                  </TableCell>
                  <TableCell>{member.member_type}</TableCell>
                  <TableCell>{member.role?.name}</TableCell>
                  <TableCell>{member.owner_user_id ?? "-"}</TableCell>
                  <TableCell><StatusBadge value={member.status} /></TableCell>
                  <TableCell className="text-right">
                    {member.status === "active" ? (
                      <form action={disableMemberAction}>
                        <input type="hidden" name="member_id" value={member.id} />
                        <ConfirmSubmitButton
                          confirmText="禁用成员会影响登录、权限和 Agent 运行，确认继续？"
                          variant="destructive"
                        >
                          禁用
                        </ConfirmSubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <UserRoundX className="h-4 w-4" />
            删除、禁用、权限变更都应通过二次确认并写入 audit_logs。
          </div>
        </CardContent>
      </Card>
    </>
  );
}
