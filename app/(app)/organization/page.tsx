import { UserPlus, UserRoundX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AddMemberForm } from "@/components/organization/add-member-form";
import { MemberCredentialCell } from "@/components/organization/member-credential-cell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { getMembers } from "@/lib/data/queries";
import { disableMemberAction } from "./actions";

export default async function OrganizationPage() {
  const [organization, members, currentMember] = await Promise.all([
    getCurrentOrganization(),
    getMembers(),
    getCurrentMember()
  ]);
  const isOwner = currentMember.role?.key === "owner";

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
          <AddMemberForm />
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
                <TableHead>登录账号</TableHead>
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
                  <TableCell>
                    {member.member_type === "human" ? (
                      <MemberCredentialCell
                        memberId={member.id}
                        email={member.email}
                        phone={member.phone}
                        isOwner={isOwner}
                      />
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
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
