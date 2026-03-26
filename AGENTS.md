## 项目介绍

LangChain — 基于 Next.js 的 AI 对话平台，集成多模型提供商（OpenAI、Anthropic、Google、DeepSeek）、MCP 工具调用、Generative UI、计费系统和国际化支持。

## 语言与沟通

- **回复语言**：与用户沟通默认使用中文（除非用户明确要求其他语言）。

## 技术栈

| 类别 | 技术 | 版本 |
| ---- | ---- | ---- |
| 框架 | Next.js | ^16.1.4 |
| 语言 | TypeScript | ^5 |
| UI 库 | React | 19.2.3 |
| AI SDK | Vercel AI SDK (`ai`) | 6.0.49 |
| AI 提供商 | @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/deepseek | ^2.0.64, ^2.0.53, ^2.0.44, ^1.0.11 |
| ORM | Prisma | ^6.14.0 |
| 数据库 | PostgreSQL | 15 |
| 缓存 | Upstash Redis | ^1.35.7 |
| CSS 框架 | Tailwind CSS | ^4 |
| UI 组件 | Radix UI + shadcn/ui 模式 | — |
| 图标 | lucide-react | ^0.541.0 |
| 状态管理 | TanStack React Query | ^5.85.5 |
| 动画 | Motion (Framer Motion) | ^12.23.24 |
| 认证 | NextAuth.js | ^5.0.0-beta.25 |
| 国际化 | i18next + react-i18next | ^25.4.2 / ^15.7.2 |
| Schema 校验 | Zod | ^4.1.1 |
| 包管理器 | pnpm | 10.0.0 |

## 开发命令

### 常用命令

| 命令 | 说明 |
| ---- | ---- |
| `pnpm dev` | 启动开发服务器（Turbopack，端口 3353） |
| `pnpm build` | 构建生产版本（含 Prisma generate） |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | ESLint 代码检查 |
| `pnpm check:types` | TypeScript 类型检查 |

### 数据库命令

| 命令 | 说明 |
| ---- | ---- |
| `pnpm db:up` | 启动 PostgreSQL 容器 |
| `pnpm db:down` | 停止容器 |
| `pnpm db:reset` | 重置数据库（清除数据卷） |
| `pnpm db:seed` | 执行数据库 Seed |
| `pnpm prisma-studio` | 启动 Prisma Studio 数据浏览器 |

## 项目结构

```
├── agents/                # AI Agent 定义（chat-agent 等）
├── tools/                 # AI 工具定义（weather、web-search、ask-user、generate-ui）
├── app/
│   ├── api/               # Next.js API Routes
│   │   ├── chat/          # 聊天 API（流式处理）
│   │   ├── auth/          # 认证 API
│   │   ├── billing/       # 计费 API
│   │   ├── conversations/ # 对话管理 API
│   │   ├── models/        # 模型管理 API
│   │   └── ...
│   ├── components/        # 页面级组件
│   │   ├── chat/          # 聊天相关组件（消息渲染、工具视图等）
│   │   ├── auth/          # 认证组件
│   │   ├── sidebar/       # 侧边栏
│   │   ├── landing/       # 落地页
│   │   └── ui/            # 页面级 UI 组件
│   ├── hooks/             # 自定义 Hooks（use-chat、use-conversations 等）
│   └── contexts/          # React Context
├── components/
│   ├── ui/                # shadcn/ui 基础组件
│   └── ai-elements/       # AI 交互组件（a2ui-sdk 相关）
├── lib/
│   ├── chat/              # 聊天核心逻辑（消息保存等）
│   ├── mcp/               # MCP 协议桥接与传输
│   ├── middleware/         # 中间件（计费、devtools）
│   ├── providers/         # AI 模型提供商解析
│   ├── types/             # 共享类型定义
│   └── ...                # auth、prisma、redis、billing 等工具
├── prisma/                # Prisma Schema 与迁移
├── locales/               # 国际化资源（zh-CN、en-US、ja-JP）
├── scripts/               # 脚本工具（seed、pricing 初始化等）
├── docs/                  # 开发文档
├── public/                # 静态资源
└── types/                 # 全局类型声明
```

## 工具链

### ESLint

- 配置文件：`eslint.config.mjs`
- 继承：`next/core-web-vitals`、`next/typescript`
- 自定义规则：关闭 `@typescript-eslint/no-explicit-any`
- 运行：`pnpm lint`

### TypeScript

- 配置文件：`tsconfig.json`
- 严格模式：开启
- 路径别名：`@/*` → `./*`
- 运行：`pnpm check:types`

### Docker

- 配置文件：`docker-compose.yml`
- 服务：PostgreSQL 15、Redis、pgAdmin
- 启动：`pnpm db:up`

## 相关规范索引

### 技能（按需调用）

| 技能 | 说明 |
| ---- | ---- |
| `.cursor/skills/create-agents-md/` | 分析项目并生成 AGENTS.md |
| `.claude/skills/backend-patterns/` | 后端架构模式与 API 设计最佳实践 |
| `.claude/skills/frontend-patterns/` | 前端开发模式与 React/Next.js 最佳实践 |
| `.claude/skills/coding-standards/` | 通用编码规范 |
| `.claude/skills/security-review/` | 安全审查清单 |
| `.claude/skills/tdd-workflow/` | TDD 测试驱动开发流程 |
| `.claude/skills/clickhouse-io/` | ClickHouse 数据库模式 |
| `.claude/skills/continuous-learning/` | 自动提取可复用模式 |
| `.claude/skills/eval-harness/` | 评估框架 |
| `.claude/skills/strategic-compact/` | 上下文压缩策略 |
| `.claude/skills/verification-loop/` | 验证循环 |

## 代码修改流程（代理执行顺序）

1. **最小改动原则**：优先修改现有文件与现有抽象，不随意新增"平行实现"。
2. **保持一致性**：沿用仓库当前的代码风格、目录放置、命名与依赖用法。
3. **改动后自检**：
   - 确保类型与导入无误（`pnpm check:types`）
   - 检查是否引入 lint 错误（`pnpm lint`）
   - 检查 React Hook 依赖是否完整
   - 检查组件 memo / useMemo / useCallback 是否需要
4. **数据库变更**：
   - 修改 `prisma/schema.prisma` 后运行 `npx prisma generate`
   - 创建迁移：`npx prisma migrate dev --name <描述>`
5. **国际化**：新增用户可见文案时，确保在 `locales/` 下所有语言文件中添加对应 key。
6. **提交前验证**：运行 `pnpm build` 确保构建无错误。
