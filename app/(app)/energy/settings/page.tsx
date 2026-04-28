import Link from "next/link";
import { SlidersHorizontal, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/auth";
import { getEnergySettings } from "@/lib/energy/settings";
import {
  updateOrganizationEnergySettingsAction,
  updateUserEnergySettingsAction
} from "./actions";

export default async function EnergySettingsPage() {
  const [member, organizationSettings, userSettings] = await Promise.all([
    getCurrentMember(),
    getEnergySettings("organization"),
    getEnergySettings("user")
  ]);
  const canManageOrganization = ["owner", "admin"].includes(member.role?.key ?? "");

  return (
    <>
      <PageHeader
        title="能量系统设置"
        description="说明：动画和音效可以随时关闭。核心价值：保持正反馈，但不打扰专注工作。"
        action={<Button asChild variant="outline"><Link href="/energy">返回能量首页</Link></Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          title="我的反馈偏好"
          description="只影响你自己的浏览器体验。适合在专注工作或会议时开启静默模式。"
          action={updateUserEnergySettingsAction}
          defaults={userSettings}
          submitLabel="保存我的设置"
        />

        <Card>
          <CardHeader>
            <CardTitle>组织默认设置</CardTitle>
            <CardDescription>Owner / Admin 可配置组织级默认值，新成员会继承这组偏好。</CardDescription>
          </CardHeader>
          <CardContent>
            {canManageOrganization ? (
              <SettingsForm action={updateOrganizationEnergySettingsAction} defaults={organizationSettings} submitLabel="保存组织默认" />
            ) : (
              <div className="rounded-lg border border-dashed border-sky-200/80 bg-white/58 p-5 text-sm leading-6 text-muted-foreground">
                你可以调整自己的偏好。组织默认设置需要 Owner 或 Admin 权限。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SettingsCard({
  title,
  description,
  action,
  defaults,
  submitLabel
}: {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  defaults: Awaited<ReturnType<typeof getEnergySettings>>;
  submitLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsForm action={action} defaults={defaults} submitLabel={submitLabel} />
      </CardContent>
    </Card>
  );
}

function SettingsForm({
  action,
  defaults,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  defaults: Awaited<ReturnType<typeof getEnergySettings>>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <Toggle name="animations_enabled" label="开启动画" description="小花炮、星光、成就卡片和项目完成庆祝。" defaultChecked={defaults.animations_enabled} />
      <Toggle name="sounds_enabled" label="开启音效" description="默认音量较低，音效文件缺失时会自动静默。" defaultChecked={defaults.sounds_enabled} />
      <Toggle name="focus_mode" label="专注模式" description="只显示静默 Toast，不触发大动画。" defaultChecked={defaults.focus_mode} />
      <Toggle name="daily_motivation_enabled" label="每日鼓励卡" description="每天第一次登录时显示一张轻量鼓励卡。" defaultChecked={defaults.daily_motivation_enabled} />
      <Toggle name="large_celebrations_enabled" label="大型庆祝动画" description="仅用于项目完成、月度归档等重大成就。" defaultChecked={defaults.large_celebrations_enabled} />

      <label className="block rounded-lg border border-white/70 bg-white/58 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
          <Volume2 className="h-4 w-4 text-cyan-700" />
          音量
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          name="sound_volume"
          defaultValue={defaults.sound_volume}
          className="w-full accent-cyan-600"
        />
        <div className="mt-1 text-xs text-muted-foreground">建议保持在 20% 左右。</div>
      </label>

      <Button type="submit" className="w-full">
        <SlidersHorizontal className="h-4 w-4" />
        {submitLabel}
      </Button>
    </form>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-white/70 bg-white/58 p-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 accent-cyan-600"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
