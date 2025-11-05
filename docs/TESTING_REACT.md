# 测试 ReAct 模式

## 如何验证 ReAct 模式是否工作

### 1. 检查后端日志

当发送消息时，查看服务器控制台日志：

```
🔧 Available tools: weather, webSearch
📝 Tools count: 2
✅ ReAct 执行完成: { steps: 3, toolCalls: 1, finishReason: 'stop' }
```

**关键指标：**
- `steps` > 1：说明执行了多步骤（ReAct 循环）
- `toolCalls` > 0：说明工具被调用了
- `finishReason` 应该是 `'stop'` 或 `'tool-calls'`

### 2. 测试用例

#### 测试 1：天气查询（必须使用工具）

**输入：**
```
北京今天的天气怎么样？
```

**预期行为：**
1. 模型识别需要天气信息
2. 调用 `weather` 工具，参数：`{ location: "北京" }`
3. 工具返回天气数据
4. 模型基于工具结果回答

**检查点：**
- 浏览器控制台应该显示工具调用
- UI 中应该显示工具调用卡片
- 最终回答应该基于工具返回的数据

#### 测试 2：联网搜索（如果启用了 webSearch）

**输入：**
```
今天有什么重要新闻？
```

**预期行为：**
1. 模型识别需要最新信息
2. 调用 `webSearch` 工具
3. 搜索并返回结果
4. 模型基于搜索结果回答

**检查点：**
- 应该看到 webSearch 工具调用
- 应该看到搜索结果
- 回答应该引用搜索结果

### 3. 前端调试

在浏览器控制台中检查消息格式：

```javascript
// 在 message-renderer.tsx 中添加的调试日志会显示：
🔍 Unknown message part type: <type> <data>
```

**如果看到工具调用：**
- 应该看到 `tool-call`、`tool-result` 或 `tool` 类型的消息部分
- 工具卡片应该显示在 UI 中

**如果没有看到工具调用：**
- 检查 System Prompt 是否足够强制
- 检查模型是否支持工具调用
- 检查工具描述是否清晰

### 4. 常见问题排查

#### 问题：工具没有被调用

**可能原因：**
1. System Prompt 不够强制
2. 模型不支持工具调用
3. 工具描述不够清晰

**解决方案：**
- 检查后端日志中的 `Available tools`
- 尝试更明确的问题（如"请使用 weather 工具查询北京天气"）
- 检查模型适配器是否正确配置

#### 问题：工具调用了但没有显示

**可能原因：**
1. 消息格式不匹配
2. UI 组件没有正确处理工具消息

**解决方案：**
- 查看浏览器控制台的调试日志
- 检查 `message.parts` 的实际格式
- 更新 `message-renderer.tsx` 中的类型匹配

#### 问题：只执行了一步就结束了

**可能原因：**
1. `stopWhen` 条件太早触发
2. 模型认为不需要工具

**解决方案：**
- 检查 `stopWhen: stepCountIs(10)` 配置
- 使用更明确的问题强制工具使用
- 检查 System Prompt 是否强调必须使用工具

### 5. 强制触发工具调用的测试提示

如果工具调用没有自动触发，可以使用这些测试提示：

```
请使用 weather 工具查询北京的天气

请使用 webSearch 工具搜索"人工智能最新进展"

我需要知道上海的天气，请调用相应的工具
```

### 6. 验证步骤

1. ✅ 发送测试消息
2. ✅ 检查后端日志（工具列表、步骤数、工具调用数）
3. ✅ 检查浏览器控制台（消息格式、工具调用）
4. ✅ 检查 UI（工具卡片是否显示）
5. ✅ 验证最终回答是否基于工具结果

### 7. 调试代码

如果需要更详细的调试，可以在 `app/api/chat/route.ts` 中添加：

```typescript
onFinish: async (result) => {
  console.log('📊 完整结果:', JSON.stringify(result, null, 2));
  console.log('🔧 工具调用:', (result as any).toolCalls);
  console.log('📝 步骤:', (result as any).steps);
  // ...
}
```

### 8. 期望的日志输出

**成功的 ReAct 执行：**
```
🔧 Available tools: weather
📝 Tools count: 1
✅ ReAct 执行完成: {
  steps: 3,
  toolCalls: 1,
  finishReason: 'stop'
}
```

**如果工具没有被调用：**
```
🔧 Available tools: weather
📝 Tools count: 1
✅ ReAct 执行完成: {
  steps: 1,
  toolCalls: 0,
  finishReason: 'stop'
}
```

如果看到 `toolCalls: 0` 和 `steps: 1`，说明模型没有使用工具，需要：
1. 检查 System Prompt
2. 使用更明确的问题
3. 检查模型是否支持工具调用

