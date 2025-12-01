import { UIMessage } from 'ai';
import { prisma } from '@/lib/prisma';
import { cleanReActStepMarkers } from './text-cleaner';
import { type Citation } from '@/lib/search-tool';

interface SaveMessagesOptions {
  conversationId: string;
  userId: string;
  lastUserMessage: UIMessage;
  assistantResponse: string;
  citations?: Citation[];
}

/**
 * Save conversation messages to database
 */
export async function saveMessages(options: SaveMessagesOptions) {
  const { conversationId, userId, lastUserMessage, assistantResponse, citations } = options;

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
      const result = await prisma.$transaction(async (tx) => {
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
    } else {
      console.log(`ℹ️  No new messages to save (already exists in conversation ${conversationId})`);
    }
  } catch (error) {
    console.error('❌ Error saving conversation messages:', error);
    throw error;
  }
}
