# AGENTS.md — 大晓COS定制工坊

## 项目概览

面向COSPLAY服装制作场景的网页版AI工具。浏览器直接访问，PC优先、响应式兼容移动端。
当前为 V1.0 第一阶段（框架搭建），全部为 mock 数据，未接入真实AI/数据库。

### 版本技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + 自定义设计token（二次元定制工坊风）
- **状态管理**: React Context（Toast） + localStorage（mock 用户态）

## 目录结构

```
src/
├── app/
│   ├── layout.tsx         # 根布局，含 ToastRoot
│   ├── globals.css        # 全局样式 + 设计token + 星光背景动效
│   ├── page.tsx           # 根路径 → redirect /home
│   ├── login/page.tsx     # 登录页
│   ├── home/page.tsx      # 工作台主页
│   ├── analyze/page.tsx   # 服饰鉴定页
│   ├── draw/page.tsx      # 绘梦工坊页
│   ├── profile/page.tsx   # 个人中心 / 角色卡
│   └── admin/page.tsx     # 工会大厅 / 管理端
├── components/
│   ├── PageShell.tsx      # 页面外壳（星光背景 + 顶部悬浮导航 + ToastProvider）
│   ├── GlowButton.tsx     # 发光按钮（primary/accent/ghost/danger 四态）
│   ├── GlowCard.tsx       # 发光卡片容器
│   ├── CrystalBadge.tsx   # 体力水晶胶囊
│   ├── SectionTitle.tsx   # 带霓虹渐变条的小节标题
│   ├── MagicCircle.tsx    # 加载动画组件
│   ├── Modal.tsx          # 发光边框模态框
│   ├── Toast.tsx          # Toast 提示 + Context Provider
│   ├── ToastRoot.tsx      # 客户端 ToastRoot，供 layout 引入
│   └── Icons.tsx          # SVG 图标集合
├── api/
│   └── mock.ts            # Mock API 层（类型定义 + mock 数据 + 异步函数）
├── hooks/
├── lib/
│   └── utils.ts           # cn 工具函数
└── server.ts
```

## 设计规范

详见 `DESIGN.md`。
- 风格：二次元定制工坊 / 日系手游界面
- 主色：深夜紫罗兰 #1A1033 + 霓虹粉 #FF3CAC + 电光青 #21E6C1 + 星芒黄 #FFE66D
- 游戏化措辞：体力水晶、额度、鉴定、绘梦、角色卡、工会大厅、招募旅者 等；产品文案勿用「魔法」「魔力」
- **反后台五不做**：无左侧边栏、无密集表格、无灰白商务配色、无CRUD术语、无面板式布局

## 开发规范

- 所有页面使用 `PageShell` 包裹（登录页除外）
- 页面组件一律 `'use client'`（当前阶段全部客户端渲染 + mock）
- 复用通用组件，不重复造样式
- 调用 API 统一走 `@/api/mock`，后续替换实现不改调用方
- Toast 通过 `useToast()` hook 使用（ToastProvider 已在 layout 顶层）

## Mock API 接口签名

| 函数 | 说明 | 入参 | 出参 |
|------|------|------|------|
| `loginApi` | 登录 | account, password | User |
| `getCurrentUser` | 获取当前用户 | - | User |
| `getQuota` | 获取额度 | - | {analyzeCount, drawCount} |
| `submitAnalyze` | 提交服饰鉴定 | imageBase64 | AnalyzeResult |
| `text2img` | 文生图 | prompt, style | DrawImage |
| `img2img` | 图生图 | imageBase64, prompt, style | DrawImage |
| `adminListUsers` | 管理端用户列表 | page?, pageSize?, q? | {items, total, page, pageSize} |
| `adminCreateUser` | 招募旅者 | account,nickname,password,analyzeCount,drawCount | User |
| `adminUpdateUser` | 编辑角色卡 | id, nickname?, count? | User |
| `adminAdjustQuota` | 补充次数 | userId, type, delta | User |
| `getGlobalConfig` | 工坊法则 | - | GlobalConfig |
| `updateGlobalConfig` | 更新法则 | Partial<GlobalConfig> | GlobalConfig |

## 构建与启动

```bash
pnpm install      # 安装依赖
pnpm dev          # 开发环境（热更新）
pnpm build        # 生产构建
pnpm start        # 生产启动
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint 检查
```

## 后续接入路径

1. **真实鉴权**：替换 `loginApi` 为真实登录，接入 Supabase Auth
2. **AI 调用**：在 `src/app/api/` 下新建服务端 API route，封装模型调用
3. **数据库**：Supabase 存储用户、额度、历史记录
4. **文件上传**：对象存储存上传图和生成图
5. **支付**：补充次数的支付对接
