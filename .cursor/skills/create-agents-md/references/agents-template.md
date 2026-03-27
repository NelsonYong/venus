# AGENTS.md 模板

本文档定义 AGENTS.md 的标准结构，用于指导 AI Agent 生成项目文档。

## 模板结构

```markdown
## 项目介绍

{{PROJECT_DESCRIPTION}}

## 语言与沟通

- **回复语言**：与用户沟通默认使用中文（除非用户明确要求其他语言）。

## 技术栈

| 类别 | 技术 | 版本 |
| ---- | ---- | ---- |

{{TECH_STACK_ROWS}}

## 环境要求

{{ENVIRONMENT_REQUIREMENTS}}

## 开发命令

### 常用命令

| 命令 | 说明 |
| ---- | ---- |

{{COMMON_COMMANDS}}

{{#IF HAS_ADDITIONAL_COMMAND_SECTIONS}}
{{ADDITIONAL_COMMAND_SECTIONS}}
{{/IF}}

## 项目结构

\`\`\`
{{PROJECT_STRUCTURE}}
\`\`\`

{{#IF HAS_TOOLCHAIN}}

## 工具链

{{TOOLCHAIN_SECTIONS}}
{{/IF}}

{{#IF HAS_RULES}}

## 相关规范索引

### 规则（自动加载）

| 规则文件 | 说明 |
| -------- | ---- |

{{RULES_TABLE}}
{{/IF}}

{{#IF HAS_SKILLS}}

### 技能（按需调用）

| 技能 | 说明 |
| ---- | ---- |

{{SKILLS_TABLE}}
{{/IF}}

## 代码修改流程（代理执行顺序）

{{CODE_MODIFICATION_GUIDELINES}}
```

## 章节说明

### 必填章节

| 章节         | 说明                     |
| ------------ | ------------------------ |
| 项目介绍     | 一句话描述项目用途       |
| 语言与沟通   | AI 回复语言偏好          |
| 技术栈       | 核心技术依赖及版本       |
| 开发命令     | 常用开发、构建、测试命令 |
| 项目结构     | 主要目录及其用途         |
| 代码修改流程 | 修改代码时的约束和检查项 |

### 可选章节

| 章节     | 触发条件                                     |
| -------- | -------------------------------------------- |
| 环境要求 | 检测到 .nvmrc / .node-version / engines 字段 |
| 工具链   | 检测到 lint/format/test 相关配置文件         |
| 规则索引 | .cursor/rules/ 目录存在                      |
| 技能索引 | .cursor/skills/ 目录存在                     |

## 技术栈检测映射

### 类别定义

| 类别         | 说明                                            |
| ------------ | ----------------------------------------------- |
| 框架         | 主要应用框架（Vue、React、Next.js、Express 等） |
| 语言         | 编程语言（TypeScript、JavaScript、Go、Rust 等） |
| 构建工具     | Vite、Webpack、Rollup、esbuild 等               |
| UI 组件库    | Ant Design、Arco Design、Element Plus 等        |
| 状态管理     | Pinia、Redux、Zustand、MobX 等                  |
| 请求管理     | TanStack Query、SWR、Apollo Client 等           |
| 路由         | Vue Router、React Router、Next.js App Router 等 |
| HTTP 客户端  | Axios、fetch、ky、got 等                        |
| CSS 框架     | Tailwind CSS、UnoCSS、Bootstrap 等              |
| CSS 预处理器 | Less、Sass、Stylus 等                           |
| 工具库       | VueUse、lodash、date-fns 等                     |
| 测试框架     | Vitest、Jest、Mocha、pytest 等                  |
| ORM          | Prisma、TypeORM、Drizzle、SQLAlchemy 等         |
| 数据库       | PostgreSQL、MySQL、MongoDB、Redis 等            |

### 版本检测来源

| 项目类型 | 检测来源                                    |
| -------- | ------------------------------------------- |
| Node.js  | package.json (dependencies/devDependencies) |
| Go       | go.mod                                      |
| Rust     | Cargo.toml                                  |
| Python   | pyproject.toml / requirements.txt           |
| Java     | pom.xml / build.gradle                      |
| Flutter  | pubspec.yaml                                |

## 命令提取规则

### package.json scripts

从 scripts 字段提取，常见映射：

| script 名称            | 命令说明            |
| ---------------------- | ------------------- |
| dev / start / serve    | 启动开发服务器      |
| build                  | 构建生产版本        |
| test / test:unit       | 运行单元测试        |
| test:e2e               | 运行 E2E 测试       |
| lint                   | 代码检查            |
| format                 | 代码格式化          |
| typecheck / type-check | TypeScript 类型检查 |
| preview                | 预览构建产物        |

### Makefile

提取 .PHONY 目标或带注释的目标。

### 其他

| 文件           | 提取方式                |
| -------------- | ----------------------- |
| Cargo.toml     | cargo 标准命令          |
| go.mod         | go 标准命令             |
| pyproject.toml | poetry / pdm / pip 命令 |

## 项目结构生成规则

1. 只展示 src/ 或主代码目录下的一级子目录
2. 每个目录附带简短说明（注释格式）
3. 隐藏 node_modules、.git、dist 等生成目录
4. 深度限制：最多 2 层

示例输出：

```
src/
├── components/      # 可复用组件
├── pages/           # 页面组件
├── hooks/           # 自定义 Hooks
├── utils/           # 工具函数
├── types/           # TypeScript 类型定义
└── styles/          # 全局样式
```

## 工具链检测

| 检测文件                                      | 工具             | 用途       |
| --------------------------------------------- | ---------------- | ---------- |
| .eslintrc* / eslint.config.*                  | ESLint           | 代码检查   |
| .oxlintrc.json                                | oxlint           | 代码检查   |
| .prettierrc* / prettier.config.*              | Prettier         | 代码格式化 |
| .stylelintrc\*                                | Stylelint        | 样式检查   |
| vitest.config.\*                              | Vitest           | 单元测试   |
| jest.config.\*                                | Jest             | 单元测试   |
| playwright.config.\*                          | Playwright       | E2E 测试   |
| cypress.config.\*                             | Cypress          | E2E 测试   |
| .husky/                                       | Husky            | Git Hooks  |
| .simple-git-hooks\*                           | simple-git-hooks | Git Hooks  |
| commitlint.config.\*                          | commitlint       | 提交规范   |
| .lintstagedrc\* / lint-staged in package.json | lint-staged      | 暂存区检查 |

## 代码修改流程模板

通用部分（所有项目适用）：

```markdown
1. **最小改动原则**：优先修改现有文件与现有抽象，不随意新增"平行实现"。
2. **保持一致性**：沿用仓库当前的代码风格、目录放置、命名与依赖用法。
3. **改动后自检**：
   - 确保类型与导入无误
   - 检查是否引入 lint 错误
4. **提交前验证**：运行项目检查命令确保无错误。
```

可根据项目类型添加特定检查项：

| 项目类型  | 额外检查项                            |
| --------- | ------------------------------------- |
| Vue       | 检查 BEM、嵌套层级、颜色硬编码        |
| React     | 检查 Hook 依赖、组件 memo             |
| i18n 项目 | 确保 key 命名符合规范，多语言结构一致 |
| 后端 API  | 检查错误处理、日志记录、接口文档更新  |
