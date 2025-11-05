# 添加新工具到 ReAct 模式 - 示例

本文档展示如何在 ReAct 模式中添加新工具。

## 示例：添加计算器工具

### 1. 在 `app/api/chat/route.ts` 中添加工具定义

```typescript
import { z } from 'zod';
import { tool } from 'ai';

// 在 tools 对象中添加
const tools: any = {
  // ... 现有工具
  
  calculator: tool({
    description: `Perform mathematical calculations. Use this tool when the user asks for:
    - Mathematical operations (addition, subtraction, multiplication, division)
    - Complex calculations or formulas
    - Unit conversions
    - Any computation that requires precise mathematical results
    
    Think about what operation is needed and prepare the expression before calling this tool.`,
    inputSchema: z.object({
      expression: z.string().describe('The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "100 * 0.15")'),
    }),
    execute: async ({ expression }) => {
      try {
        // 安全的数学表达式求值
        // 注意：在生产环境中应该使用更安全的求值方法
        const result = Function(`"use strict"; return (${expression})`)();
        return {
          expression,
          result,
          success: true,
        };
      } catch (error) {
        return {
          expression,
          error: error instanceof Error ? error.message : 'Invalid expression',
          success: false,
        };
      }
    },
  }),
};
```

### 2. 更新 System Prompt（可选）

如果需要，可以在 System Prompt 中提及新工具：

```typescript
const reactSystemPrompt = `You are a helpful AI assistant that uses ReAct (Reasoning and Acting) decision-making pattern...

**Available Tools:**
- weather: Get weather information for locations
- webSearch: Search the web for current information
- calculator: Perform mathematical calculations

...`;
```

### 3. 前端 UI 支持（可选）

如果工具需要特殊的 UI 显示，在 `app/components/chat/message-renderer.tsx` 中添加：

```typescript
case "tool-calculator":
  return (
    <div key={`${message.id}-${i}`} className="calculator-result">
      <h4>计算结果</h4>
      <p>表达式: {part.output?.expression}</p>
      <p>结果: {part.output?.result}</p>
    </div>
  );
```

或者使用通用的 Tool 组件（推荐）：

```typescript
// Tool 组件会自动处理，无需特殊处理
```

## 示例：添加数据库查询工具

### 工具定义

```typescript
databaseQuery: tool({
  description: `Query the database for information. Use this tool when:
  - The user asks about stored data or records
  - You need to retrieve specific information from the database
  - The question requires looking up historical or stored information
  
  Think carefully about what query would best retrieve the needed information.`,
  inputSchema: z.object({
    table: z.string().describe('The database table to query'),
    conditions: z.record(z.string()).optional().describe('Filter conditions as key-value pairs'),
    limit: z.number().optional().describe('Maximum number of results to return'),
  }),
  execute: async ({ table, conditions, limit = 10 }) => {
    try {
      // 执行数据库查询
      const results = await prisma[table].findMany({
        where: conditions,
        take: limit,
      });
      return {
        success: true,
        count: results.length,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
      };
    }
  },
}),
```

## 工具设计最佳实践

### 1. 清晰的描述

✅ **好的描述**：
```typescript
description: `Send an email. Use this tool when:
- The user explicitly asks to send an email
- The user provides email content and recipient
- Confirmation is needed before sending`
```

❌ **不好的描述**：
```typescript
description: 'Send email'
```

### 2. 详细的输入 Schema

使用 Zod schema 和 `.describe()` 提供清晰的参数说明：

```typescript
inputSchema: z.object({
  recipient: z.string().describe('Email address of the recipient'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body content'),
  cc: z.array(z.string()).optional().describe('CC recipients (optional)'),
}),
```

### 3. 错误处理

始终处理可能的错误：

```typescript
execute: async ({ param }) => {
  try {
    // 工具逻辑
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
},
```

### 4. 结构化返回

返回结构化的数据，便于模型理解和展示：

```typescript
return {
  success: true,
  data: {
    // 实际数据
  },
  metadata: {
    // 元数据
  },
};
```

## 测试新工具

### 1. 测试用例

```typescript
// 在聊天中测试
用户: "计算 123 + 456"
期望: AI 调用 calculator 工具，返回 579

用户: "北京的天气"
期望: AI 调用 weather 工具，返回天气信息
```

### 2. 调试

在工具执行时添加日志：

```typescript
execute: async ({ param }) => {
  console.log('Tool called with:', param);
  const result = await performAction(param);
  console.log('Tool result:', result);
  return result;
},
```

## 注意事项

1. **安全性**：确保工具执行不会泄露敏感信息或执行危险操作
2. **性能**：工具执行应该快速，避免长时间阻塞
3. **错误处理**：优雅处理错误，返回有用的错误信息
4. **文档**：为每个工具提供清晰的文档和使用说明

## 相关文件

- `app/api/chat/route.ts` - 工具定义位置
- `app/components/chat/message-renderer.tsx` - UI 渲染
- `docs/REACT_PATTERN.md` - ReAct 模式完整文档

