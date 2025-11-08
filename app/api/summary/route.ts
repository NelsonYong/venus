import { NextRequest, NextResponse } from "next/server";
import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';
import { getCurrentUser } from "@/lib/auth";

const deepSeek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

const languageModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication using NextAuth session
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    // Extract the conversation content for summarization
    const conversationText = messages.map((msg: { role: string; parts?: Array<{ type: string; text: string }>; content?: string }) => {
      if (msg.role === 'user') {
        // Handle different message formats
        if (msg.parts && Array.isArray(msg.parts)) {
          const textParts = msg.parts.filter((part: { type: string; text: string }) => part.type === 'text');
          return `User: ${textParts.map((part: { type: string; text: string }) => part.text).join(' ')}`;
        } else if (msg.content) {
          return `User: ${msg.content}`;
        }
      } else if (msg.role === 'assistant') {
        // Handle assistant responses
        if (msg.parts && Array.isArray(msg.parts)) {
          const textParts = msg.parts.filter((part: { type: string; text: string }) => part.type === 'text');
          return `Assistant: ${textParts.map((part: { type: string; text: string }) => part.text).join(' ')}`;
        } else if (msg.content) {
          return `Assistant: ${msg.content}`;
        }
      }
      return '';
    }).filter(Boolean).join('\n\n');

    // Generate a concise title using the LLM
    const result = await generateText({
      model: deepSeek(languageModel),
      system: `你是一个专业的对话标题生成器。请根据用户和助手的对话内容，生成一个简洁、准确、有意义的中文标题。

要求：
1. 标题长度在5-15个字之间
2. 准确概括对话的主要内容或问题
3. 使用简洁明了的中文表达
4. 不要包含"关于"、"讨论"等冗余词汇
5. 直接输出标题，不要额外的解释或标点符号

例如：
- 用户询问React hooks使用方法 → "React Hooks使用指南"
- 用户咨询JavaScript异步编程 → "JavaScript异步编程"
- 用户寻求项目部署帮助 → "项目部署问题"`,
      prompt: `请为以下对话生成一个简洁的标题：\n\n${conversationText.slice(0, 2000)}` // Limit to 2000 chars to avoid token limits
    });

    const title = result.text.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present

    return NextResponse.json({ 
      title: title || "新的对话",
      success: true 
    });

  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}