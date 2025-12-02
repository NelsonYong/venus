"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { EmptyChatState } from "./empty-chat-state";
import { ChatInput, type UploadedAttachment } from "./chat-input";
import { MessageRenderer } from "./message-renderer";
import type { LanguageModelUsage } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

interface ChatLayoutMobileProps {
  messages: any[];
  status: string;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (
    message: PromptInputMessage,
    attachments: UploadedAttachment[]
  ) => void;
  model: string;
  onModelChange: (value: string) => void;
  webSearch: boolean;
  onWebSearchToggle: () => void;
  error?: Error | undefined;
  isLoadingChat?: boolean;
  hasChatId?: boolean;
  onRegenerate?: () => void;
  onStop?: () => void;
  usage?: LanguageModelUsage;
}

export function ChatLayoutMobile({
  messages,
  status,
  input,
  onInputChange,
  onSubmit,
  model,
  onModelChange,
  webSearch,
  onWebSearchToggle,
  error,
  isLoadingChat = false,
  hasChatId = false,
  onRegenerate,
  onStop,
  usage,
}: ChatLayoutMobileProps) {
  const hasMessages = messages.length > 0;

  // Don't show empty state if we're loading a chat from URL or if there's a chatId in URL
  if (!hasMessages && !isLoadingChat && !hasChatId) {
    // Empty state with centered layout - 移动端版本
    return (
      <div className="mobile-chat-layout">
        {error && (
          <div className="mobile-error-banner">
            <p className="font-semibold text-sm">流式输出错误</p>
            <p className="text-xs mt-1">
              {error.message || "发生未知错误，请重试"}
            </p>
          </div>
        )}
        {/* 内容区域 - 绝对定位 */}
        <div className="mobile-scroll-area">
          <EmptyChatState />
        </div>
        {/* 输入框区域 - 固定在底部 */}
        <div className="mobile-input-area">
          <ChatInput
            input={input}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            model={model}
            onModelChange={onModelChange}
            webSearch={webSearch}
            onWebSearchToggle={onWebSearchToggle}
            status={status}
            onStop={onStop}
            usage={usage}
          />
        </div>
      </div>
    );
  }

  // Show loading state while chat is being loaded or when there's a chatId but no messages yet
  if (isLoadingChat || (hasChatId && !hasMessages)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          加载中...
        </div>
      </div>
    );
  }

  // 移动端聊天布局 - 固定高度计算
  return (
    <div className="mobile-chat-layout">
      {error && (
        <div className="mobile-error-banner">
          <p className="font-semibold text-sm">流式输出错误</p>
          <p className="text-xs mt-1">
            {error.message || "发生未知错误，请重试"}
          </p>
        </div>
      )}

      {/* 消息滚动区域 - 绝对定位，可滚动 */}
      <div className="mobile-scroll-area">
        <Conversation className="h-full">
          <ConversationContent className="w-full px-2 prose prose-sm">
            <MessageRenderer
              messages={messages}
              status={status}
              onRegenerate={onRegenerate}
            />
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* 输入框区域 - fixed 固定在底部 */}
      <div className="mobile-input-area">
        <ChatInput
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          model={model}
          onModelChange={onModelChange}
          webSearch={webSearch}
          onWebSearchToggle={onWebSearchToggle}
          status={status}
          onStop={onStop}
          usage={usage}
        />
      </div>
    </div>
  );
}
