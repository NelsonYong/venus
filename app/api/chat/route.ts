import { z } from 'zod';
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from 'ai';
import { billingService } from '@/lib/billing';
import { NextResponse } from 'next/server';
import { performWebSearch, formatSearchResults } from '@/lib/search-tool';
import { prisma } from '@/lib/prisma';
import { createModelAdapter, getDefaultModelConfig } from '@/lib/model-adapter';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

/**
 * 清理文本中的 ReAct 步骤标记（仅移除标记，保留标记后的实际内容）
 * 只过滤行首的固定步骤标记，不影响标记后面的文本内容
 * 流式输出时不调用此函数，只在保存到数据库时使用
 */
function cleanReActStepMarkers(text: string): string {
  if (!text) return text;

  // 按行处理，移除行首的步骤标记，保留标记后的内容
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    let cleanedLine = line;

    // 移除行首的步骤标记模式（保留标记后的内容）
    // 匹配 **Step N: XXX (YYY)** 格式（移除标记，保留后面的内容）
    cleanedLine = cleanedLine.replace(/^\s*\*\*Step\s+\d+:\s*[A-Z]+(?:\s*\([^)]+\))?\*\*\s*/i, '');
    // 匹配 Step N: XXX (YYY) 格式（移除标记，保留后面的内容）
    cleanedLine = cleanedLine.replace(/^\s*Step\s+\d+:\s*[A-Z]+(?:\s*\([^)]+\))?\s*/i, '');
    // 匹配 **Step N: XXX** 格式（移除标记，保留后面的内容）
    cleanedLine = cleanedLine.replace(/^\s*\*\*Step\s+\d+:\s*[A-Z]+\*\*\s*/i, '');
    // 匹配 Step N: XXX 格式（移除标记，保留后面的内容）
    cleanedLine = cleanedLine.replace(/^\s*Step\s+\d+:\s*[A-Z]+\s*/i, '');
    // 匹配单独成行的步骤名称（整行删除）
    if (/^\s*(THINK|ACT|OBSERVE|RESPOND)\s*$/i.test(cleanedLine.trim())) {
      continue; // 跳过这一行
    }
    // 匹配 **THINK** 等加粗格式（整行删除）
    if (/^\s*\*\*(THINK|ACT|OBSERVE|RESPOND)\*\*\s*$/i.test(cleanedLine.trim())) {
      continue; // 跳过这一行
    }
    // 匹配 **Step N:** 格式（移除标记，保留后面的内容）
    cleanedLine = cleanedLine.replace(/^\s*\*\*Step\s+\d+:\*\*\s*/i, '');
    // 匹配 Step N: 格式（移除标记，保留后面的内容）
    cleanedLine = cleanedLine.replace(/^\s*Step\s+\d+:\s*/i, '');
    // 匹配行首的 "Think:", "Act:", "Observe:", "Respond:" 等（移除标记，保留后面的内容）
    cleanedLine = cleanedLine.replace(/^\s*(Think|Act|Observe|Respond):\s*/i, '');

    // 如果清理后的行不为空，或者原行就是空行，保留它
    if (cleanedLine.trim().length > 0 || line.trim().length === 0) {
      cleanedLines.push(cleanedLine);
    }
  }

  let cleanedText = cleanedLines.join('\n');

  // 清理多余的空行（连续3个或更多换行符变成2个）
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');

  // 清理行首行尾空白
  cleanedText = cleanedText.trim();

  return cleanedText;
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { messages, userId, conversationId, webSearch, modelId }: {
      messages: UIMessage[];
      userId?: string;
      conversationId?: string;
      webSearch?: boolean;
      modelId?: string;
    } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required for billing tracking' },
        { status: 401 }
      );
    }

    // Get model configuration
    let modelConfig;
    if (modelId) {
      // User selected a specific model
      const dbModel = await prisma.aiModel.findFirst({
        where: {
          id: modelId,
          OR: [
            { isPreset: true },
            { createdBy: userId },
          ],
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          provider: true,
          apiKey: true,
          apiEndpoint: true,
          isPreset: true,
        }
      });

      if (!dbModel) {
        return NextResponse.json(
          { error: 'Model not found or not accessible' },
          { status: 404 }
        );
      }

      modelConfig = {
        provider: dbModel.provider,
        name: dbModel.name,
        apiKey: dbModel.apiKey,
        apiEndpoint: dbModel.apiEndpoint,
        isPreset: dbModel.isPreset,
      };
    } else {
      // Use default model
      modelConfig = getDefaultModelConfig();
    }

    const provider = modelConfig.provider;
    const modelName = modelConfig.name;
    const isPresetModel = modelConfig.isPreset;

    // Only check billing for non-preset models
    if (!isPresetModel) {
      const estimatedInputTokens = messages.reduce((acc, msg) => {
        const content = JSON.stringify(msg);
        return acc + (content.length / 4);
      }, 0);
      const estimatedOutputTokens = 1000;

      const estimatedCost = await billingService.calculateCost(
        provider,
        modelName,
        {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          totalTokens: estimatedInputTokens + estimatedOutputTokens
        }
      );

      const usageCheck = await billingService.checkUsageLimit(userId, estimatedCost.totalCost);
      if (!usageCheck.canProceed) {
        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            reason: usageCheck.reason,
            billing: usageCheck.userBilling
          },
          { status: 429 }
        );
      }
    }

    let actualInputTokens = 0;
    let actualOutputTokens = 0;

    // 构建工具集合 - 为 ReAct 模式优化工具描述
    const tools: any = {
      weather: tool({
        description: 'Get the current weather information for a specific location. Use this tool when the user asks about weather conditions, temperature, or weather forecasts. Think about what location information you have or need before calling this tool.',
        inputSchema: z.object({
          location: z.string().describe('The city or location name to get weather for (e.g., "Beijing", "New York", "London")'),
        }),
        execute: async ({ location }) => {
          // 模拟天气数据，实际应用中应该调用真实的天气 API
          return {
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
            condition: 'sunny',
            humidity: 60 + Math.floor(Math.random() * 20),
          };
        },
      }),
    };

    // 如果启用了联网搜索，添加搜索工具
    if (webSearch) {
      tools.webSearch = tool({
        description: 'Search the web for current information, news, facts, or any information that requires up-to-date knowledge. Use this tool when: 1) The user asks about recent events or current information, 2) You need to verify facts or get the latest data, 3) The question requires information beyond your training data. Think carefully about what search query would best help answer the user\'s question.',
        inputSchema: z.object({
          query: z.string().describe('A clear and specific search query that will help find the information needed to answer the user\'s question. Use concise keywords and relevant terms.'),
        }),
        execute: async ({ query }) => {
          try {
            const searchResults = await performWebSearch(query, 5);
            return formatSearchResults(searchResults);
          } catch (error) {
            return `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`;
          }
        },
      });
    }

    // Create model adapter based on configuration
    const model = createModelAdapter(modelConfig);

    // ReAct 模式的 System Prompt
    // ReAct (Reasoning + Acting) 是一种决策模式，让模型在推理和行动之间循环
    const availableTools = Object.keys(tools).join(', ');
    const reactSystemPrompt = `You are a helpful AI assistant that uses ReAct (Reasoning and Acting) decision-making pattern to solve problems systematically.

**CRITICAL: You MUST use tools when needed. Do not skip tool usage when information is required.**

**Available Tools:** ${availableTools}

**ReAct Pattern - Follow these steps:**

**Step 1: THINK (Reasoning)**
Before taking any action, always reason about the problem:
- What is the user asking for?
- What information do I need to answer this?
- Do I have the required information in my knowledge, or do I need to use tools?
- Which tool(s) should I use to get the needed information?

**Step 2: ACT (Tool Usage)**
If you need information that requires tools, you MUST call the appropriate tool:
- Use weather tool when asked about weather conditions
${webSearch ? '- Use webSearch tool when asked about current events, recent information, or facts that need verification' : ''}
- Call tools with clear, specific parameters
- Do NOT try to answer without using tools when tools are needed

**Step 3: OBSERVE (Analyze Results)**
After tool execution:
- Carefully analyze the tool results
- Determine if you have enough information to answer the question
- If information is insufficient, think about what else you need and call additional tools
- Continue the Think-Act-Observe cycle until you have sufficient information

**Step 4: RESPOND (Final Answer)**
Once you have sufficient information:
- Synthesize all findings from tools
- Provide a clear, comprehensive answer
- Cite sources when using web search results
- Output your final answer in markdown format

**IMPORTANT RULES:**
1. ALWAYS use tools when the question requires information you don't have
2. NEVER skip tool usage when tools are available and needed
3. Show your reasoning process explicitly
4. Call tools immediately when you identify you need them - don't hesitate
5. Use multiple tools if needed to gather complete information

**Example Flow:**
User: "What's the weather in Beijing?"
Think: "User wants weather information. I need to use the weather tool with location 'Beijing'."
Act: Call weather tool with location="Beijing"
Observe: "Got weather data: temperature 22°C, sunny"
Respond: "According to the latest data, Beijing's weather is sunny with a temperature of 22°C..."

${webSearch ? 'REMEMBER: When users ask about current events, news, or recent information, you MUST use the webSearch tool. Do not rely solely on your training data.' : ''}`;

    // 添加调试日志
    console.log('🔧 Available tools:', Object.keys(tools));
    console.log('📝 Tools count:', Object.keys(tools).length);

    const result = streamText({
      model,
      system: reactSystemPrompt,
      messages: convertToModelMessages(messages),
      abortSignal: AbortSignal.timeout(60000),
      tools,
      // 确保工具调用被启用 - 设置为 'auto' 让模型自动决定何时使用工具
      toolChoice: 'auto',
      // ReAct 模式通常需要多个步骤：思考 -> 行动 -> 观察 -> 思考 -> 回答
      // 使用 stopWhen 控制最大步骤数，支持完整的 ReAct 循环
      stopWhen: stepCountIs(10),
      onFinish: async (result) => {
        // 调试：记录实际执行的步骤数
        const stepCount = (result as any).steps?.length || 0;
        const toolCalls = (result as any).toolCalls || [];
        console.log('✅ ReAct 执行完成:', {
          steps: stepCount,
          toolCalls: toolCalls.length,
          finishReason: result.finishReason,
        });
        // Record billing usage (skip for preset models)
        if (!isPresetModel) {
          try {
            actualInputTokens = (result.usage as any)?.promptTokens || 0;
            actualOutputTokens = (result.usage as any)?.completionTokens || 0;

            const actualUsage = {
              inputTokens: actualInputTokens,
              outputTokens: actualOutputTokens,
              totalTokens: actualInputTokens + actualOutputTokens
            };

            const actualCost = await billingService.calculateCost(
              provider,
              modelName,
              actualUsage
            );

            await billingService.recordUsage({
              userId,
              conversationId,
              modelName,
              provider,
              usage: actualUsage,
              cost: actualCost,
              endpoint: '/api/chat',
              requestDuration: Date.now() - startTime,
              requestMetadata: {
                messageCount: messages.length,
                hasTools: true,
                system: 'You are a helpful assistant. output in markdown format.'
              },
              responseMetadata: {
                finishReason: result.finishReason,
                usage: result.usage
              }
            });
          } catch (error) {
            console.error('Error recording usage:', error);
          }
        }

        // Save messages to database (real-time save)
        if (conversationId && userId) {
          try {
            // The last message in the array is the user's question
            const lastUserMessage = messages[messages.length - 1];
            // 清理 ReAct 步骤标记，只保存纯净的文本内容
            const assistantResponse = cleanReActStepMarkers(result.text);

            // Get existing messages to check for duplicates
            // 获取最后一条消息，用于判断是否是连续的消息对
            const lastMessage = await prisma.message.findFirst({
              where: {
                conversationId,
                isDeleted: false
              },
              orderBy: { createdAt: 'desc' },
              select: { id: true, role: true, createdAt: true, content: true },
            });

            // Prepare messages to save
            const now = Date.now();
            const messagesToCreate = [];

            // 准备用户消息内容
            const userMessageContent = JSON.stringify(lastUserMessage.parts);
            const assistantMessageContent = JSON.stringify([{ type: 'text', text: assistantResponse }]);

            // 判断是否应该保存用户消息
            // 策略：如果最后一条消息不是用户消息，或者内容不同，则保存
            // 这样可以允许用户重复提问相同的问题（可能是想要重新获得答案）
            const shouldSaveUserMessage = lastUserMessage && (
              !lastMessage || // 没有历史消息，保存
              lastMessage.role !== 'user' || // 最后一条不是用户消息，保存
              lastMessage.content !== userMessageContent // 内容不同，保存
            );

            if (shouldSaveUserMessage) {
              messagesToCreate.push({
                conversationId,
                userId,
                role: lastUserMessage.role,
                content: userMessageContent,
                createdAt: new Date(now),
              });
            }

            // 判断是否应该保存助手回复
            // 策略：如果用户消息已保存（或即将保存），或者最后一条消息不是助手消息，或者内容不同，则保存
            const shouldSaveAssistantMessage = assistantResponse && (
              shouldSaveUserMessage || // 用户消息是新保存的，助手回复也保存
              !lastMessage || // 没有历史消息，保存
              lastMessage.role !== 'assistant' || // 最后一条不是助手消息，保存
              lastMessage.content !== assistantMessageContent // 内容不同，保存
            );

            if (shouldSaveAssistantMessage) {
              messagesToCreate.push({
                conversationId,
                userId,
                role: 'assistant',
                content: assistantMessageContent,
                createdAt: new Date(now + 100), // Ensure assistant message comes after user message
              });
            }

            // Save to database incrementally using transaction
            if (messagesToCreate.length > 0) {
              await prisma.$transaction([
                ...messagesToCreate.map(msg => prisma.message.create({ data: msg })),
                prisma.conversation.update({
                  where: { id: conversationId },
                  data: { updatedAt: new Date() },
                }),
              ]);

              console.log(`✅ Saved ${messagesToCreate.length} new message(s) to conversation ${conversationId}`);
            } else {
              console.log(`ℹ️  No new messages to save (already exists in conversation ${conversationId})`);
            }
          } catch (error) {
            console.error('❌ Error saving conversation messages:', error);
          }
        }
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}