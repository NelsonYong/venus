"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { EmptyChatState } from "./empty-chat-state";
import { ChatInput } from "./chat-input";
import { MessageRenderer } from "./message-renderer";

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
  onRegenerate?: () => void;
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
  onRegenerate,
}: ChatLayoutProps) {
  const hasMessages = messages.length > 0;

  // Don't show empty state if we're loading a chat from URL
  if (!hasMessages && !isLoadingChat) {
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
        <ChatInput
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          model={model}
          onModelChange={onModelChange}
          webSearch={webSearch}
          onWebSearchToggle={onWebSearchToggle}
          status={status}
          className="flex-shrink-0 w-full max-w-3xl mx-auto mb-8"
        />
      </div>
    );
  }

  // Show loading state while chat is being loaded
  if (isLoadingChat) {
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
          <p className="text-xs mt-2 opacity-75">
            提示: 检查网络连接或尝试禁用浏览器扩展
          </p>
        </div>
      )}
      <Conversation className="flex-1">
        <ConversationContent className="max-w-4xl mx-auto prose">
          <MessageRenderer messages={messages} status={status} onRegenerate={onRegenerate} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <ChatInput
        input={input}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        model={model}
        onModelChange={onModelChange}
        webSearch={webSearch}
        onWebSearchToggle={onWebSearchToggle}
        status={status}
        className="flex-shrink-0 w-full max-w-4xl mx-auto mb-2"
      />
    </div>
  );
}
