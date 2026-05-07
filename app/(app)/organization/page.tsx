import { Shield, UserPlus, UserRoundX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AddMemberForm } from "@/components/organization/add-member-form";
import { MemberEditPanel } from "@/components/organization/member-edit-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { getMembers, getRolesAndPermissions } from "@/lib/data/queries";
import { disableMemberAction, enableMemberAction } from "./actions";

export default async function OrganizationPage() {
  const [organization, members, currentMember, { roles }] = await Promise.all([
    getCurrentOrganization(),
    getMembers(),
    getCurrentMember(),
    getRolesAndPermissions()
  ]);
  const isOwner = currentMember.role?.key === "owner";

  // Use agent_id as discriminator — more reliable than member_type string matching
  const humanMembers = members.filter((m) => !m.agent_id);
  const agentMembers = members.filter((m) => Boolean(m.agent_id));

  return (
    <>
      <PageHeader
        title="组织与成员"
        description="统一管理 human / agent / system 操作者身份；Agent 成员必须绑定人类负责人。"
        action={
          isOwner ? (
            <Button asChild>
              <a href="#add-member"><UserPlus className="h-4 w-4" />添加成员</a>
            </Button>
          ) : undefined
        }
      />

      {/* 组织信息 */}
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

      {/* 添加成员（仅 Owner） */}
      {isOwner && (
        <Card id="add-member" className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-orange-500" />
              添加成员
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddMemberForm />
          </CardContent>
        </Card>
      )}

      {/* 人类成员列表 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>人类成员 ({humanMembers.length})</CardTitle>
          {isOwner && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-orange-500" />
              Owner 可编辑全部字段
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">成员</TableHead>
                <TableHead className="w-[100px]">角色</TableHead>
                <TableHead>登录账号 / 编辑</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[100px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {humanMembers.map((member) => (
                <TableRow key={member.id} className="align-top">
                  <TableCell className="py-4">
                    <div className="font-medium">{member.display_name}</div>
                    <div className="text-xs text-muted-foreground">{member.user_id}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <RoleBadge roleKey={member.role?.key} roleName={member.role?.name} />
                  </TableCell>
                  <TableCell className="py-4">
                    <MemberEditPanel
                      member={member}
                      roles={roles}
                      isOwner={isOwner}
                    />
                  </TableCell>
                  <TableCell className="py-4">
                    <StatusBadge value={member.status} />
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    {member.status === "active" ? (
                      <form action={disableMemberAction}>
                        <input type="hidden" name="member_id" value={member.id} />
                        <ConfirmSubmitButton
                          confirmText="禁用后该成员无法登录，确认继续？"
                          variant="destructive"
                        >
                          禁用
                        </ConfirmSubmitButton>
                      </form>
                    ) : (
                      <form action={enableMemberAction}>
                        <input type="hidden" name="member_id" value={member.id} />
                        <ConfirmSubmitButton
                          confirmText="启用后该成员可重新登录，确认继续？"
                          variant="outline"
                        >
                          启用
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agent 成员 */}
      {agentMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Agent 成员 ({agentMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AI 员工</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium">{member.display_name}</div>
                      <div className="text-xs text-muted-foreground">{member.agent_id}</div>
                    </TableCell>
                    <TableCell><RoleBadge roleKey={member.role?.key} roleName={member.role?.name} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{member.owner_user_id ?? "—"}</TableCell>
                    <TableCell><StatusBadge value={member.status} /></TableCell>
                    <TableCell className="text-right">
                      {member.status === "active" ? (
                        <form action={disableMemberAction}>
                          <input type="hidden" name="member_id" value={member.id} />
                          <ConfirmSubmitButton confirmText="禁用 Agent 会影响所有关联任务，确认继续？" variant="destructive">禁用</ConfirmSubmitButton>
                        </form>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <UserRoundX className="h-4 w-4" />
        删除、禁用、权限变更都应通过二次确认并写入 audit_logs。
      </div>
    </>
  );
}

function RoleBadge({ roleKey, roleName }: { roleKey?: string; roleName?: string }) {
  const colors: Record<string, string> = {
    owner: "border-orange-500/40 bg-orange-500/[0.14] text-orange-300",
    admin: "border-red-500/40 bg-red-500/[0.12] text-red-300",
    manager: "border-amber-500/40 bg-amber-500/[0.12] text-amber-300",
    member: "border-white/10 bg-white/[0.04] text-slate-300",
    agent: "border-purple-500/40 bg-purple-500/[0.12] text-purple-300"
  };
  const cls = colors[roleKey ?? "member"] ?? colors.member;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide ${cls}`}>
      {roleName ?? roleKey ?? "—"}
    </span>
  );
}
