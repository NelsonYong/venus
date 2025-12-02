# Blob 资源清理系统

## 📋 概述

本系统实现了完整的 Vercel Blob 资源清理方案，用于在删除对话或账号时自动清理关联的 blob 文件（图片、文档等）。

## 🏗️ 架构设计

### 方案选择：**数据库级联删除 + 后台任务清理**

- ✅ **数据一致性**：Prisma schema 设置 `onDelete: Cascade`
- ✅ **用户体验**：删除操作立即返回，不阻塞
- ✅ **资源清理**：后台异步清理 blob 文件
- ✅ **容错性**：blob 清理失败不影响数据删除

## 📁 文件结构

```
lib/blob/
├── cleaner.ts                    # Blob 清理工具函数
└── README.md                     # 本文档

app/api/
├── conversations/[id]/route.ts   # 对话删除 API（集成 blob 清理）
├── auth/delete-account/route.ts  # 账号删除 API（清理所有资源）
├── cleanup/blobs/route.ts        # 后台清理任务 API
└── cron/cleanup-deleted-conversations/route.ts  # 定时清理任务
```

## 🔧 核心功能

### 1. 单个对话删除

**API**: `DELETE /api/conversations/:id`

支持两种删除模式：

#### 软删除（默认）
```typescript
// 前端调用
await fetch('/api/conversations/xxx', { method: 'DELETE' })
```
- 标记 `isDeleted: true`
- 不删除 blob 文件
- 可恢复

#### 硬删除（永久）
```typescript
// 前端调用
await fetch('/api/conversations/xxx', {
  method: 'DELETE',
  body: JSON.stringify({ permanent: true })
})
```
- 从数据库永久删除
- 异步清理 blob 文件
- 不可恢复

### 2. 账号删除

**API**: `DELETE /api/auth/delete-account`

删除用户账号时会清理：
- ✅ 所有对话记录
- ✅ 所有消息
- ✅ 所有上传的 blob 文件
- ✅ 计费记录
- ✅ 使用记录
- ✅ 模型配置
- ✅ MCP 服务器配置
- ✅ OAuth 连接
- ✅ Session

```typescript
// 前端调用
await fetch('/api/auth/delete-account', {
  method: 'DELETE',
  body: JSON.stringify({ confirmation: 'DELETE' })
})
```

### 3. 后台清理任务

**API**: `POST /api/cleanup/blobs`

手动触发批量清理：

```bash
curl -X POST https://your-domain.com/api/cleanup/blobs \
  -H "Content-Type: application/json" \
  -d '{"conversationIds": ["id1", "id2", "id3"]}'
```

### 4. 定时清理任务

**API**: `GET /api/cron/cleanup-deleted-conversations`

自动清理 30 天前软删除的对话。

#### 配置 Vercel Cron

在 `vercel.json` 中添加：

```json
{
  "crons": [{
    "path": "/api/cron/cleanup-deleted-conversations",
    "schedule": "0 2 * * *"
  }]
}
```

#### 设置环境变量

```bash
CRON_SECRET=your-secret-token
```

## 🛠️ 工具函数

### `extractBlobUrls(uploadedAttachments)`

从 `uploadedAttachments` JSON 中提取 blob URLs。

```typescript
import { extractBlobUrls } from '@/lib/blob/cleaner';

const urls = extractBlobUrls(message.uploadedAttachments);
// => ['https://xxx.blob.vercel-storage.com/...']
```

### `collectConversationBlobUrls(conversationId)`

收集某个对话的所有 blob URLs。

```typescript
import { collectConversationBlobUrls } from '@/lib/blob/cleaner';

const urls = await collectConversationBlobUrls('conv-id');
```

### `collectUserBlobUrls(userId)`

收集某个用户的所有 blob URLs。

```typescript
import { collectUserBlobUrls } from '@/lib/blob/cleaner';

const urls = await collectUserBlobUrls('user-id');
```

### `deleteBlobFiles(urls)`

批量删除 blob 文件（带重试和错误处理）。

```typescript
import { deleteBlobFiles } from '@/lib/blob/cleaner';

const result = await deleteBlobFiles(urls);
console.log(result);
// {
//   success: 10,
//   failed: 2,
//   errors: [{ url: '...', error: '...' }]
// }
```

### `cleanupConversationBlobs(conversationId)`

清理单个对话的所有 blob 文件（高级封装）。

```typescript
import { cleanupConversationBlobs } from '@/lib/blob/cleaner';

await cleanupConversationBlobs('conv-id');
```

### `cleanupUserBlobs(userId)`

清理用户的所有 blob 文件（高级封装）。

```typescript
import { cleanupUserBlobs } from '@/lib/blob/cleaner';

await cleanupUserBlobs('user-id');
```

## 🔐 安全考虑

1. **权限验证**：所有删除操作都验证用户身份
2. **级联删除**：数据库层面保证关联数据一致性
3. **异步清理**：blob 清理不阻塞主流程
4. **错误容忍**：blob 清理失败不影响数据删除
5. **日志记录**：完整的操作日志便于追踪

## 📊 监控和日志

系统会输出详细日志：

```
🧹 Starting blob cleanup for conversation xxx
📦 Found 5 blob file(s) to delete
✅ Deleted blob: https://...
✅ Blob cleanup completed for conversation xxx: { total: 5, success: 5, failed: 0 }
```

## 🚀 生产环境建议

### 1. 使用专业队列系统

替换简单的 `fetch` 调用：

- [Inngest](https://www.inngest.com/) - 推荐
- [QStash](https://upstash.com/docs/qstash) - Serverless
- [Bull Queue](https://github.com/OptimalBits/bull) - Redis-based

### 2. 添加重试机制

```typescript
// 使用 Inngest 示例
import { inngest } from './inngest';

inngest.send({
  name: 'blob/cleanup',
  data: { conversationIds: [id] }
});
```

### 3. 监控和告警

- 监控 blob 清理成功率
- 设置失败告警
- 定期检查孤儿 blob 文件

### 4. 成本优化

- 批量删除降低 API 调用
- 定期清理过期文件
- 监控 blob 存储使用量

## 🧪 测试

### 测试对话删除
```bash
# 软删除
curl -X DELETE https://your-domain.com/api/conversations/xxx

# 硬删除
curl -X DELETE https://your-domain.com/api/conversations/xxx \
  -H "Content-Type: application/json" \
  -d '{"permanent": true}'
```

### 测试账号删除
```bash
curl -X DELETE https://your-domain.com/api/auth/delete-account \
  -H "Content-Type: application/json" \
  -d '{"confirmation": "DELETE"}'
```

### 测试清理任务
```bash
curl -X POST https://your-domain.com/api/cleanup/blobs \
  -H "Content-Type: application/json" \
  -d '{"conversationIds": ["id1", "id2"]}'
```

## 📝 注意事项

1. **先清理后删除**：账号删除时，先清理 blob 再删数据库
2. **不影响用户**：清理失败不影响删除操作
3. **批量限流**：每批最多处理 5 个文件，避免速率限制
4. **去重处理**：自动去除重复的 blob URLs

## 🔗 相关资源

- [Vercel Blob 文档](https://vercel.com/docs/storage/vercel-blob)
- [Prisma Cascade Delete](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/referential-actions)
