import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';


const languageModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

interface Message {
  role: string;
  content: string;
}

/**
 * 根据对话消息自动生成标题
 * @param messages 对话消息列表
 * @returns 生成的标题
 */
export async function generateConversationTitle(messages: Message[]): Promise<string> {
  try {
    // 提取对话内容
    const conversationText = messages.map((msg) => {
      try {
        // 尝试解析 JSON 内容
        const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;

        if (Array.isArray(content)) {
          // 如果是数组，提取 text 类型的内容
          const textParts = content.filter((part: any) => part.type === 'text');
          const text = textParts.map((part: any) => part.text).join(' ');
          return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${text}`;
        } else if (typeof content === 'string') {
          return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${content}`;
        }
      } catch {
        // 如果解析失败，直接使用原始内容
        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      }
      return '';
    }).filter(Boolean).join('\n\n');

    if (!conversationText) {
      return '新对话';
    }

    // 使用 AI 生成标题
    const result = await generateText({
      model: createDeepSeek({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL,
      })(languageModel),
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
      prompt: `请为以下对话生成一个简洁的标题：\n\n${conversationText.slice(0, 2000)}` // 限制长度避免超过 token 限制
    });

    const title = result.text.trim().replace(/^["']|["']$/g, ''); // 移除引号
    return title || '新对话';

  } catch (error) {
    console.error('Error generating conversation title:', error);
    return '新对话'; // 失败时返回默认标题
  }
}

/**
 * 检查是否需要生成标题
 * @param messageCount 消息数量
 * @returns 是否需要生成标题
 */
export function shouldGenerateTitle(messageCount: number): boolean {
  // 只在首次对话完成后（恰好2条消息：1个用户消息 + 1个助手消息）生成标题
  return messageCount === 2;
}

