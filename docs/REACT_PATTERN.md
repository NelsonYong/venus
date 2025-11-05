# ReAct 决策模式实现指南

## 概述

本项目已成功集成了 **ReAct (Reasoning + Acting)** 决策模式，这是一种让 AI 模型在推理和行动之间循环的先进决策框架。通过 ReAct 模式，AI 助手能够：

- 🔍 **思考**：在采取行动前进行推理
- 🛠️ **行动**：使用工具获取信息或执行操作
- 👀 **观察**：分析工具执行结果
- 💬 **回答**：基于观察结果提供最终答案

## 实现架构

### 1. 后端实现 (`app/api/chat/route.ts`)

#### System Prompt 设计

我们设计了一个详细的 ReAct 模式 System Prompt，引导模型按照以下流程工作：

```typescript
const reactSystemPrompt = `You are a helpful AI assistant that uses ReAct (Reasoning and Acting) decision-making pattern...

**ReAct Pattern Guidelines:**
1. **Think**: 在行动前进行推理
2. **Act**: 使用工具获取信息
3. **Observe**: 分析工具结果
4. **Respond**: 提供最终答案
`;
```

#### 工具定义优化

每个工具都有清晰的描述，帮助模型理解何时使用：

```typescript
weather: tool({
  description: 'Get the current weather information for a specific location. Use this tool when the user asks about weather conditions...',
  // ...
})
```

#### 步骤控制

使用 `stopWhen: stepCountIs(10)` 来控制最大步骤数，支持完整的 ReAct 循环：

```typescript
const result = streamText({
  model,
  system: reactSystemPrompt,
  tools,
  stopWhen: stepCountIs(10), // 支持最多 10 步的 ReAct 循环
});
```

### 2. 前端实现

#### Hook 配置 (`app/hooks/use-chat-bot.ts`)

```typescript
const { messages, sendMessage, status } = useChat({
  api: "/api/chat",
  maxSteps: 10, // 与后端保持一致
});
```

#### UI 渲染 (`app/components/chat/message-renderer.tsx`)

消息渲染器支持显示：
- **Reasoning（推理）**：显示模型的思考过程
- **Tool Calls（工具调用）**：显示工具调用的状态和结果
- **Tool Results（工具结果）**：显示工具执行的结果

## ReAct 工作流程

### 典型执行流程

1. **用户提问**
   ```
   用户：北京今天的天气怎么样？
   ```

2. **模型思考（Think）**
   ```
   AI 推理：用户询问北京的天气，我需要使用 weather 工具来获取最新信息。
   ```

3. **模型行动（Act）**
   ```
   调用工具：weather({ location: "北京" })
   ```

4. **观察结果（Observe）**
   ```
   工具返回：{ location: "北京", temperature: 22, condition: "sunny" }
   ```

5. **最终回答（Respond）**
   ```
   AI 回答：根据最新数据，北京今天天气晴朗，温度 22°C...
   ```

## 最佳实践

### 1. 工具描述优化

✅ **好的工具描述**：
```typescript
description: 'Search the web for current information. Use this tool when: 1) The user asks about recent events, 2) You need to verify facts, 3) The question requires information beyond your training data.'
```

❌ **不好的工具描述**：
```typescript
description: 'Search the web.'
```

### 2. System Prompt 设计

- ✅ 明确说明 ReAct 循环的步骤
- ✅ 强调思考的重要性
- ✅ 鼓励模型解释推理过程
- ✅ 指导工具使用的时机

### 3. 步骤数配置

- **简单查询**：3-5 步足够
- **复杂任务**：5-10 步
- **多工具协作**：10+ 步

当前配置为 10 步，适合大多数场景。

### 4. 错误处理

工具执行失败时，模型应该：
- 识别错误原因
- 决定是否重试
- 向用户说明情况

## 工具调用可视化

### 工具状态

前端 UI 会自动显示工具调用的状态：

- 🔵 **Pending** (`input-streaming`)：工具调用准备中
- 🟡 **Running** (`input-available`)：工具执行中
- 🟢 **Completed** (`output-available`)：工具执行完成
- 🔴 **Error** (`output-error`)：工具执行失败

### 显示内容

每个工具调用会显示：
- 工具名称
- 调用参数（Parameters）
- 执行结果（Result）或错误信息（Error）

## 性能考虑

### Token 使用

ReAct 模式可能消耗更多 tokens，因为：
- 模型需要生成推理过程
- 工具调用增加对话历史
- 多步骤循环增加交互次数

### 优化建议

1. **限制步骤数**：根据任务复杂度调整
2. **工具选择**：让模型优先选择最相关的工具
3. **结果缓存**：对于相同查询，考虑缓存工具结果

## 扩展指南

### 添加新工具

1. **定义工具**：
```typescript
const tools = {
  // ... 现有工具
  newTool: tool({
    description: '清晰的工具描述，说明何时使用',
    inputSchema: z.object({
      // 定义输入参数
    }),
    execute: async ({ param }) => {
      // 实现工具逻辑
      return result;
    },
  }),
};
```

2. **更新 System Prompt**（如需要）：
```typescript
${hasNewTool ? 'You have access to newTool. Use it when...' : ''}
```

3. **前端 UI 支持**（如需要自定义显示）：
在 `message-renderer.tsx` 中添加工具特定的渲染逻辑。

### 启用 Reasoning

如果模型支持 reasoning（如 GPT-4o 或某些实验性模型），可以启用：

```typescript
const result = streamText({
  // ...
  experimental_reasoning: true, // 如果模型支持
});
```

## 调试技巧

### 查看工具调用

在浏览器控制台查看消息流：
```javascript
// 在 useChat hook 中添加
onFinish: (message) => {
  console.log('Tool calls:', message.toolCalls);
  console.log('Reasoning:', message.reasoning);
}
```

### 监控步骤数

在后端日志中监控实际执行的步骤数：
```typescript
onFinish: async (result) => {
  console.log('Steps taken:', result.steps?.length);
}
```

## 常见问题

### Q: 模型为什么没有使用工具？

A: 检查：
1. 工具描述是否清晰
2. System Prompt 是否鼓励工具使用
3. 用户问题是否明确需要工具

### Q: 步骤数太少，任务未完成？

A: 增加 `stopWhen: stepCountIs(N)` 中的 N 值。

### Q: 工具调用显示不正确？

A: 检查 `message-renderer.tsx` 中的工具部分渲染逻辑，确保处理了正确的消息格式。

## 参考资源

- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- [ReAct 论文](https://arxiv.org/abs/2210.03629)
- [工具调用最佳实践](https://sdk.vercel.ai/docs/guides/tools)

## 更新日志

- **2024-12**: 初始 ReAct 模式实现
  - 集成 ReAct System Prompt
  - 优化工具描述
  - 增加步骤数支持
  - 添加工具调用可视化

