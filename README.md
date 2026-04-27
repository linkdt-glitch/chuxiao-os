# 初晓 OS 系统企业智能操作系统底座

一个简单、稳定、可扩展的 AI 原生企业内部系统统一底座。当前版本只实现底座能力：账号组织、角色权限、模块导航、审批流程、日志事件、文件资产、AI Provider、Agent 身份和系统设置。

## 项目目录结构

```txt
app/                         Next.js App Router 页面
  (auth)/login               邮箱登录 / 注册入口
  (app)/*                    管理台页面
  auth/callback              Supabase magic link 回调与首次组织初始化
components/                  布局与 shadcn 风格基础组件
lib/
  auth                       当前用户、组织、成员与 onboarding
  permissions                统一权限判断
  modules                    模块注册、导航、启停
  audit                      操作日志
  events                     系统事件
  approvals                  审批服务
  files                      文件资产服务
  ai                         AI Provider 与调用日志
  agents                     Agent 档案与运行日志
  data                       demo 数据与查询聚合
supabase/
  migrations                 数据库结构、RLS、索引、触发器
  seed.sql                   初始化数据
docs/module-integration.md   后续模块接入说明
```

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。未配置 Supabase 环境变量时，应用会使用内置 demo 数据，便于先查看 UI 与架构。

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

`SUPABASE_SERVICE_ROLE_KEY` 仅用于服务端首次登录后的组织初始化，不要暴露到浏览器。
生产环境默认不要开启 demo 模式；只有临时演示时才把 `NEXT_PUBLIC_ENABLE_DEMO_MODE` 设为 `true`。

## Supabase 配置

1. 创建 Supabase 项目。
2. 执行 `supabase/migrations/202604250001_ai_company_os_base.sql`。
3. 执行 `supabase/seed.sql` 初始化示例组织和模块。
4. 创建 Storage bucket：`company-assets`。
5. 在 Supabase Auth 中启用 Email OTP / Magic Link。
6. 将回调地址加入 Auth Redirect URLs：`http://localhost:3000/auth/callback` 和生产域名 `/auth/callback`。

## 部署

### Vercel

1. 导入 Git 仓库。
2. 配置 `.env.example` 中的环境变量。
3. Build command 使用 `npm run build`。
4. 部署后把 `https://your-domain/auth/callback` 加入 Supabase Auth Redirect URLs。

### Netlify

项目包含 `netlify.toml`，使用 `@netlify/plugin-nextjs`：

1. 在 Netlify 连接仓库。
2. Build command：`npm run build`。
3. 配置 Supabase 环境变量。
4. 将 Netlify 域名的 `/auth/callback` 加入 Supabase。

## 已实现功能清单

- 左侧模块导航：可用模块 + Coming Soon 模块。
- 顶部组织、用户、角色展示。
- 登录 / 注册入口：Supabase magic link，首次登录初始化组织。
- Dashboard：组织、角色、启用模块、待审批、事件、日志、AI 调用、Agent 数量。
- 组织与成员：human / agent 成员、负责人、禁用二次确认入口。
- 权限与角色：默认 5 角色、权限矩阵、系统角色标记。
- 模块管理：模块启停、coming soon、settings jsonb 预留。
- 审批中心：创建审批表单、审批列表、批准/驳回确认入口。
- 操作日志：按模块、操作者、动作筛选入口。
- 事件中心：事件列表、payload、状态、模块筛选入口。
- 文件中心：上传入口、文件列表、权限、删除确认。
- AI 设置：Provider 抽象、安全 API Key 输入、调用日志。
- Agent 档案：权限等级 L1-L5、负责人、允许模块、运行日志。
- 系统设置：组织设置、安全设置、审批规则、模块设置入口。
- Supabase migration：21 张核心表、索引、外键、updated_at、RLS。
- Seed 数据：组织、角色、成员、模块、审批、事件、AI Provider、Agent。

## 架构约束

- 所有组织级数据包含 `organization_id`。
- 所有模块复用统一权限、审批、日志、事件、文件和 AI 调用模型。
- Agent 必须绑定 `owner_user_id`，并使用 L1-L5 权限等级。
- 高风险操作预留审批，关键操作写审计日志。
- API Key 存储字段为 `api_key_encrypted`，前端查询不选择该字段。

后续模块接入细节见 `docs/module-integration.md`。

## 自进化组织系统升级

已新增增量升级说明：[docs/self-evolving-os-upgrade.md](docs/self-evolving-os-upgrade.md)。

新增核心入口：

- `/dashboard`：领航驾驶舱
- `/governance`：组织护航盾
- `/knowledge`：组织大脑库
- `/evolution`：成长飞轮引擎
- `/ai-workforce`：智能劳动力中心

新增基础页面：

- `/knowledge/sops`
- `/knowledge/reviews`
- `/evolution/improvements`
