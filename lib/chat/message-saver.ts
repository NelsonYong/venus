import { UIMessage } from 'ai';
import { prisma } from '@/lib/prisma';
import { cleanReActStepMarkers } from './text-cleaner';
import { type Citation } from '@/lib/search-tool';
import { generateConversationTitle, shouldGenerateTitle } from './title-generator';

interface UploadedAttachment {
  url: string;
  filename: string;
  size: number;
  type: string;
  contentType: string;
}

interface SaveMessagesOptions {
  conversationId: string;
  userId: string;
  lastUserMessage: UIMessage;
  assistantResponse: string;
  citations?: Citation[];
  uploadedAttachments?: UploadedAttachment[];
}

/**
 * Save conversation messages to database
 */
export async function saveMessages(options: SaveMessagesOptions) {
  const { conversationId, userId, lastUserMessage, assistantResponse, citations, uploadedAttachments } = options;

  try {
    // Clean ReAct step markers from assistant response
    const cleanedResponse = cleanReActStepMarkers(assistantResponse);

    // Get last message to check for duplicates
    const lastMessage = await prisma.message.findFirst({
      where: {
        conversationId,
        isDeleted: false
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, role: true, createdAt: true, content: true },
    });

    const now = Date.now();
    const messagesToCreate: Array<{
      conversationId: string;
      userId: string;
      role: string;
      content: string;
      createdAt: Date;
      uploadedAttachments?: any;
    }> = [];

    const userMessageContent = JSON.stringify(lastUserMessage.parts);
    const assistantMessageContent = JSON.stringify([{ type: 'text', text: cleanedResponse }]);

    // Determine if we should save the user message
    const shouldSaveUserMessage = lastUserMessage && (
      !lastMessage ||
      lastMessage.role !== 'user' ||
      lastMessage.content !== userMessageContent
    );

    if (shouldSaveUserMessage) {
      messagesToCreate.push({
        conversationId,
        userId,
        role: lastUserMessage.role,
        content: userMessageContent,
        createdAt: new Date(now),
        uploadedAttachments: uploadedAttachments && uploadedAttachments.length > 0 ? JSON.parse(JSON.stringify(uploadedAttachments)) : undefined,
      });
    }

    // Only save assistant message if we saved the user message
    const shouldSaveAssistantMessage = cleanedResponse && shouldSaveUserMessage;

    if (shouldSaveAssistantMessage) {
      messagesToCreate.push({
        conversationId,
        userId,
        role: 'assistant',
        content: assistantMessageContent,
        createdAt: new Date(now + 100), // Ensure assistant message comes after user message
      });
    }

    // Save to database using transaction
    if (messagesToCreate.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Create messages
        const createdMessages = await Promise.all(
          messagesToCreate.map(msg => tx.message.create({ data: msg }))
        );

        // Save citations for assistant message if any
        if (citations && citations.length > 0 && createdMessages.length === 2) {
          const assistantMessage = createdMessages[1]; // Assistant message is the second one
          await Promise.all(
            citations.map(citation =>
              tx.messageCitation.create({
                data: {
                  messageId: assistantMessage.id,
                  citationId: citation.id,
                  url: citation.url,
                  title: citation.title,
                  snippet: citation.snippet,
                  thumbnail: citation.thumbnail,
                }
              })
            )
          );
        }

        // Update conversation timestamp
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        return createdMessages;
      });

      console.log(`✅ Saved ${messagesToCreate.length} new message(s) to conversation ${conversationId}${citations && citations.length > 0 ? ` with ${citations.length} citation(s)` : ''}`);

      // 自动生成标题（首次对话后）
      try {
        // 获取当前会话的消息数量
        const messageCount = await prisma.message.count({
          where: {
            conversationId,
            isDeleted: false
          }
        });

        // 只在首次对话完成后（消息数 = 2）生成标题
        if (shouldGenerateTitle(messageCount)) {
          console.log(`🎯 Auto-generating title for conversation ${conversationId} (${messageCount} messages)`);

          // 获取所有消息用于生成标题
          const allMessages = await prisma.message.findMany({
            where: {
              conversationId,
              isDeleted: false
            },
            orderBy: { createdAt: 'asc' },
            select: {
              role: true,
              content: true
            }
          });

          // 准备消息用于标题生成
          const messagesForTitle = allMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          const generatedTitle = await generateConversationTitle(messagesForTitle);

          // 更新会话标题
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: generatedTitle }
          });

          console.log(`✨ Generated title: "${generatedTitle}"`);
        }
      } catch (error) {
        console.error('❌ Failed to auto-generate title:', error);
        // 标题生成失败不影响消息保存
      }
    } else {
      console.log(`ℹ️  No new messages to save (already exists in conversation ${conversationId})`);
    }
  } catch (error) {
    console.error('❌ Error saving conversation messages:', error);
    throw error;
  }
}
