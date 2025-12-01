"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { EmptyChatState } from "./empty-chat-state";
import { ChatInput } from "./chat-input";
import { MessageRenderer } from "./message-renderer";
import type { LanguageModelUsage } from "ai";

interface ChatLayoutProps {
  messages: any[];
  status: string;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
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

export function ChatLayout({
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
}: ChatLayoutProps) {
  const hasMessages = messages.length > 0;

  // Don't show empty state if we're loading a chat from URL or if there's a chatId in URL
  if (!hasMessages && !isLoadingChat && !hasChatId) {
    // Empty state with centered layout
    return (
      <div className="flex flex-col h-full">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mx-auto max-w-3xl mb-4 mt-4">
            <p className="font-semibold">流式输出错误</p>
            <p className="text-sm mt-1">
              {error.message || "发生未知错误，请重试"}
            </p>
          </div>
        )}
        <EmptyChatState />
        <div className="shrink-0 w-full max-w-3xl mx-auto px-4 pb-8">
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
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  // Normal chat layout with messages
  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mx-auto max-w-4xl mb-4 mt-4">
          <p className="font-semibold">流式输出错误</p>
          <p className="text-sm mt-1">
            {error.message || "发生未知错误，请重试"}
          </p>
        </div>
      )}
      <Conversation className="flex-1">
        <ConversationContent className="max-w-4xl mx-auto prose">
          <MessageRenderer
            messages={messages}
            status={status}
            onRegenerate={onRegenerate}
          />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 w-full max-w-4xl mx-auto px-4 pb-4">
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
