import { UIMessage, FileUIPart } from 'ai';
import { truncateMessages } from '@/lib/chat/context-compressor';
import { getCompressedContext } from '@/lib/redis';

export interface UploadedAttachment {
  url: string;
  filename: string;
  size: number;
  type: string;
  contentType: string;
}

/**
 * Process messages by adding uploaded attachments to the last user message
 */
export function attachFilesToLastMessage(
  messages: UIMessage[],
  uploadedAttachments: UploadedAttachment[]
): UIMessage[] {
  if (!uploadedAttachments || uploadedAttachments.length === 0) {
    return messages;
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    return messages;
  }

  // Create file parts for uploaded attachments
  const fileParts: FileUIPart[] = uploadedAttachments.map(att => ({
    type: 'file' as const,
    data: att.url,
    mimeType: att.contentType,
    url: att.url,
    mediaType: att.contentType, // FileUIPart requires both mimeType and mediaType
  }));

  // Create new message with original text and files
  const updatedLastMessage = {
    ...lastMessage,
    parts: [
      ...lastMessage.parts,
      ...fileParts,
    ],
  } as UIMessage;

  console.log('✅ 更新后的消息:', JSON.stringify(updatedLastMessage, null, 2));

  // Replace the last message
  return [
    ...messages.slice(0, -1),
    updatedLastMessage,
  ];
}

/**
 * Process messages with context compression if available
 */
export async function processMessagesWithCompression(
  messages: UIMessage[],
  conversationId?: string
): Promise<UIMessage[]> {
  if (!conversationId) {
    return messages;
  }

  try {
    // Check if we already have compressed context from previous request
    const compressedContext = await getCompressedContext(conversationId);

    if (compressedContext) {
      // Truncate messages to keep only recent ones up to last user message
      return truncateMessages(messages, 10);
    }
  } catch (error) {
    console.error('Error loading compressed context:', error);
    // Fall back to original messages if loading fails
  }

  return messages;
}
