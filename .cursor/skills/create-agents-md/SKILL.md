---
name: create-agents-md
description: 仅在用户明确请求时使用（如"创建 AGENTS.md"、"更新 AGENTS.md"、"/create-agents-md"）。不要主动触发此 skill。功能：分析项目结构和技术栈，基于模板生成或更新项目根目录的 AGENTS.md 文件。
---

# Create AGENTS.md

分析项目并生成/更新 `AGENTS.md` 文件，为 AI Agent 提供项目上下文。

## 工作流程

### Phase 1: 项目分析

按以下顺序检测项目信息：

1. **项目类型检测**（参考下方检测表）
2. **技术栈识别**（从依赖文件提取）
3. **目录结构分析**（主代码目录）
4. **开发命令提取**（package.json scripts / Makefile）
5. **工具链检测**（lint/format/test 配置）
6. **规则/技能扫描**（.cursor/rules/ 和 .cursor/skills/）

### Phase 2: 内容生成

基于 [agents-template.md](references/agents-template.md) 模板生成内容：

1. 填充检测到的技术栈信息
2. 生成项目结构树
3. 提取并格式化开发命令
4. 列出检测到的工具链
5. 索引现有规则和技能文件
6. 根据项目类型生成代码修改流程

### Phase 3: 用户确认

**必须执行**：

1. 向用户展示生成的完整 AGENTS.md 内容
2. 使用 AskQuestion 询问：
   - 选项 1：应用（创建/覆盖文件）
   - 选项 2：修改后应用（用户提供修改意见）
   - 选项 3：取消
3. 仅在用户确认后写入文件

## 项目类型检测

### Web 前端

| 检测文件/目录                                  | 项目类型 |
| ---------------------------------------------- | -------- |
| package.json + src/\*.vue                      | Vue      |
| package.json + src/\*.tsx                      | React    |
| package.json + pages/ 或 app/ + next.config.\* | Next.js  |
| package.json + nuxt.config.\*                  | Nuxt.js  |

### 移动端

| 检测文件/目录                          | 项目类型              |
| -------------------------------------- | --------------------- |
| package.json + react-native 依赖       | React Native          |
| pubspec.yaml                           | Flutter               |
| _.xcodeproj 或 _.xcworkspace           | iOS (Swift/ObjC)      |
| app/build.gradle + AndroidManifest.xml | Android (Kotlin/Java) |
| project.config.json + app.json         | 微信小程序            |
| package.json + @tarojs/\* 依赖         | Taro                  |
| package.json + @dcloudio/uni-\* 依赖   | uni-app               |

### 后端

| 检测文件/目录                     | 项目类型             |
| --------------------------------- | -------------------- |
| go.mod                            | Go                   |
| Cargo.toml                        | Rust                 |
| requirements.txt / pyproject.toml | Python               |
| pom.xml                           | Java (Maven)         |
| build.gradle                      | Java/Kotlin (Gradle) |
| Package.swift                     | Swift                |
| mix.exs                           | Elixir               |
| Gemfile                           | Ruby                 |
| composer.json                     | PHP                  |

### 其他

| 检测文件/目录                   | 项目类型   |
| ------------------------------- | ---------- |
| 多技术栈混合                    | Monorepo   |
| Dockerfile / docker-compose.yml | 容器化项目 |
| serverless.yml / vercel.json    | Serverless |

## 技术栈版本提取

| 项目类型 | 检测文件       | 提取字段                      |
| -------- | -------------- | ----------------------------- |
| Node.js  | package.json   | dependencies, devDependencies |
| Go       | go.mod         | require 语句                  |
| Rust     | Cargo.toml     | [dependencies]                |
| Python   | pyproject.toml | [project.dependencies]        |
| Flutter  | pubspec.yaml   | dependencies                  |

## 工具链检测

| 配置文件                         | 工具       |
| -------------------------------- | ---------- |
| .eslintrc* / eslint.config.*     | ESLint     |
| .oxlintrc.json                   | oxlint     |
| .prettierrc* / prettier.config.* | Prettier   |
| vitest.config.\*                 | Vitest     |
| jest.config.\*                   | Jest       |
| playwright.config.\*             | Playwright |
| cypress.config.\*                | Cypress    |
| .husky/                          | Husky      |
| commitlint.config.\*             | commitlint |

## 现有文件处理

如果 `AGENTS.md` 已存在：

1. 读取现有内容
2. 保留用户自定义章节（如"项目介绍"的具体描述）
3. 更新可自动检测的章节（技术栈、命令、工具链等）
4. 在预览中标注变更部分

## 输出要求

生成的 AGENTS.md 必须：

1. 使用中文
2. 表格对齐、格式规范
3. 目录结构使用 tree 格式
4. 命令使用反引号包裹
5. 文件路径使用相对路径
