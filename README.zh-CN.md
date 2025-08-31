# Venus

简体中文 | [English](./README.md)

一个使用 Next.js、PostgreSQL 和 Prisma 构建的 AI 应用。

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **数据库**: PostgreSQL 15
- **ORM**: Prisma
- **样式**: Tailwind CSS
- **类型检查**: TypeScript
- **容器化**: Docker & Docker Compose

## 项目结构

```
my-nextjs-app/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── users/         # 用户相关 API
│   │   └── posts/         # 文章相关 API
│   ├── posts/             # 文章页面
│   ├── users/             # 用户页面
│   └── layout.tsx         # 根布局
├── components/            # React 组件
├── lib/                   # 工具库
│   └── prisma.ts         # Prisma 客户端
├── prisma/               # 数据库相关
│   ├── schema.prisma     # 数据库模型定义
│   ├── migrations/       # 迁移文件
│   └── seed.ts          # 种子数据
├── .env                  # 环境变量
├── docker-compose.yml    # Docker 服务配置
├── package.json
└── README.md
```

## 数据库模型

- **User**: 用户信息
- **Post**: 文章内容
- **Comment**: 评论
- **Tag**: 标签
- **ApiUsage**: API 使用记录

## 快速开始

### 前置要求

确保你的系统已安装：

- Node.js 18+
- Docker & Docker Compose
- Git

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd my-nextjs-app
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

创建 `.env` 文件：

```env
# 数据库连接
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/myapp_development"

# Next.js 配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### 4. 启动数据库服务

```bash
# 启动 PostgreSQL 数据库
docker-compose up -d postgres

# 验证数据库运行状态
docker-compose ps
```

### 5. 数据库初始化

```bash
# 运行数据库迁移
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate

# 填充种子数据（可选）
npx prisma db seed
```

### 6. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动。

## 可用脚本

```bash
# 开发
npm run dev                    # 启动开发服务器
npm run build                  # 构建生产版本
npm run start                  # 启动生产服务器

# 数据库管理
npm run db:up                  # 启动数据库服务
npm run db:down                # 停止数据库服务
npm run db:reset               # 重置数据库（删除所有数据）
npm run db:seed                # 运行种子数据
npm run db:studio              # 启动 Prisma Studio
npm run db:migrate             # 运行迁移
npm run db:generate            # 生成 Prisma Client

# 管理界面
npm run db:admin               # 启动 pgAdmin (http://localhost:8080)
npm run db:adminer             # 启动 Adminer (http://localhost:8081)
```

## 数据库管理界面

### Prisma Studio (推荐)

```bash
npm run db:studio
```

访问: http://localhost:5555

### pgAdmin

```bash
docker-compose up -d pgadmin
```

访问: http://localhost:8080

- 邮箱: admin@example.com
- 密码: admin123

### Adminer (轻量级)

```bash
docker-compose up -d adminer
```

访问: http://localhost:8081

- 服务器: postgres
- 用户名: myuser
- 密码: mypassword
- 数据库: myapp_development

### 命令行访问

```bash
# 通过 Docker 连接数据库
npm run db:psql

# 或直接使用 psql
psql -h localhost -p 5432 -U myuser -d myapp_development
```

## 开发工作流

### 添加新的数据模型

1. 编辑 `prisma/schema.prisma` 添加新模型
2. 创建迁移：
   ```bash
   npx prisma migrate dev --name add_new_model
   ```
3. 生成客户端：
   ```bash
   npx prisma generate
   ```

### 重置开发环境

```bash
# 完全重置（删除所有数据）
npm run db:reset

# 重新启动开发环境
npm run dev
```

### 数据库备份和恢复

```bash
# 备份数据库
docker exec my-app-postgres pg_dump -U myuser myapp_development > backup.sql

# 恢复数据库
docker exec -i my-app-postgres psql -U myuser myapp_development < backup.sql
```

## API 路由

### 用户相关

- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建新用户

### 文章相关

- `GET /api/posts` - 获取文章列表
- `GET /api/posts?published=true` - 获取已发布文章
- `POST /api/posts` - 创建新文章

## 页面路由

- `/` - 首页
- `/posts` - 文章列表页面
- `/users` - 用户列表页面
- `/posts/[slug]` - 文章详情页面（需要实现）

## 常见问题

### 数据库连接失败

1. 确保 Docker 服务正在运行：
   ```bash
   docker-compose ps
   ```
2. 检查环境变量配置
3. 重启数据库服务：
   ```bash
   docker-compose restart postgres
   ```

### 表不存在错误

```bash
# 检查迁移状态
npx prisma migrate status

# 如果需要，重置数据库
npx prisma migrate reset
```

### Prisma Studio 无法启动

```bash
# 确保 Prisma Client 是最新的
npx prisma generate

# 重新启动
npx prisma studio
```

### 端口占用

如果遇到端口占用问题，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "5433:5432" # 将本地端口改为 5433
```

然后更新 `.env` 中的 `DATABASE_URL`。

## 部署

### 生产环境构建

```bash
npm run build
npm run start
```

### Docker 生产部署

```bash
# 构建生产镜像
docker build -t my-app .

# 使用生产配置启动
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。
