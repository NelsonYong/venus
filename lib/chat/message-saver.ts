import { UIMessage } from 'ai';
import { prisma } from '@/lib/prisma';
import { cleanReActStepMarkers } from './text-cleaner';

interface SaveMessagesOptions {
  conversationId: string;
  userId: string;
  lastUserMessage: UIMessage;
  assistantResponse: string;
}

/**
 * Save conversation messages to database
 */
export async function saveMessages(options: SaveMessagesOptions) {
  const { conversationId, userId, lastUserMessage, assistantResponse } = options;

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
    const messagesToCreate = [];

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
    throw error;
  }
}
