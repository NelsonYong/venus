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
}: ChatLayoutProps) {
  const hasMessages = messages.length > 0;

  if (!hasMessages) {
    // Empty state with centered layout
    return (
      <div className="flex flex-col h-full">
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

  // Normal chat layout with messages
  return (
    <div className="flex flex-col h-full">
      <Conversation className="flex-1">
        <ConversationContent className="max-w-4xl mx-auto prose">
          <MessageRenderer messages={messages} status={status} />
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