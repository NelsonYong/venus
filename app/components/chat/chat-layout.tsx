"use client";

import { useState, useRef, useEffect } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { EmptyChatState } from "./empty-chat-state";
import { ChatInput, type UploadedAttachment } from "./chat-input";
import { MessageRenderer } from "./message-renderer";
import { ChatLayoutMobile } from "./chat-layout-mobile";
import { ArtifactPreviewSidebar } from "./artifact-preview-sidebar";
import { useMobile } from "@/app/hooks/use-mobile";
import type { LanguageModelUsage } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from "react-resizable-panels";

interface ChatLayoutProps {
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
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
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
  sidebarOpen,
  onSidebarOpenChange,
}: ChatLayoutProps) {
  const isMobile = useMobile();
  const hasMessages = messages.length > 0;
  const [artifactState, setArtifactState] = useState<{
    artifact: any;
    previewUrl: string;
    isOpen: boolean;
  } | null>(null);

  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const mainPanelRef = useRef<ImperativePanelHandle>(null);
  const hasAutoOpenedRef = useRef(false);

  // Reset auto-open flag when messages change (new conversation)
  useEffect(() => {
    // Reset when no messages (new conversation)
    if (messages.length === 0) {
      hasAutoOpenedRef.current = false;
    }
  }, [messages.length]);

  // Reset panel sizes when opening new artifact
  useEffect(() => {
    if (artifactState?.isOpen) {
      // Small delay to ensure panel is mounted
      setTimeout(() => {
        mainPanelRef.current?.resize(50);
        sidebarPanelRef.current?.resize(50);
      }, 0);
    }
  }, [artifactState?.artifact?.id, artifactState?.isOpen]);

  // 移动端使用独立的布局组件
  if (isMobile) {
    return (
      <ChatLayoutMobile
        messages={messages}
        status={status}
        input={input}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        model={model}
        onModelChange={onModelChange}
        webSearch={webSearch}
        onWebSearchToggle={onWebSearchToggle}
        error={error}
        isLoadingChat={isLoadingChat}
        hasChatId={hasChatId}
        onRegenerate={onRegenerate}
        onStop={onStop}
        usage={usage}
      />
    );
  }

  // 桌面端布局
  // Don't show empty state if we're loading a chat from URL or if there's a chatId in URL
  if (!hasMessages && !isLoadingChat && !hasChatId) {
    // Empty state with centered layout
    return (
      <div className="flex flex-col h-full min-h-0">
        {error && (
          <div className="shrink-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mx-auto max-w-3xl mb-4 mt-4">
            <p className="font-semibold">流式输出错误</p>
            <p className="text-sm mt-1">
              {error.message || "发生未知错误，请重试"}
            </p>
          </div>
        )}
        <EmptyChatState />
        <div className="shrink-0 flex-none w-full max-w-3xl mx-auto px-4 pb-8">
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
    <PanelGroup
      direction="horizontal"
      className="h-full"
    >
      {/* Main content area */}
      <Panel
        ref={mainPanelRef}
        defaultSize={artifactState?.isOpen ? 50 : 100}
        minSize={30}
      >
        <div className="flex flex-col h-full">
          {error && (
            <div className="shrink-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mx-auto max-w-4xl mb-4 mt-4">
              <p className="font-semibold">流式输出错误</p>
              <p className="text-sm mt-1">
                {error.message || "发生未知错误，请重试"}
              </p>
            </div>
          )}
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="max-w-4xl mx-auto prose">
              <MessageRenderer
                messages={messages}
                status={status}
                onRegenerate={onRegenerate}
                onArtifactOpen={(artifact, previewUrl) =>
                  setArtifactState({ artifact, previewUrl, isOpen: true })
                }
                onArtifactClose={() => setArtifactState(null)}
                artifactSidebarState={
                  artifactState
                    ? {
                        artifact: artifactState.artifact,
                        isOpen: artifactState.isOpen,
                        previewUrl: artifactState.previewUrl,
                      }
                    : undefined
                }
                hasAutoOpenedArtifact={hasAutoOpenedRef.current}
                onAutoOpenComplete={() => {
                  hasAutoOpenedRef.current = true;
                  // 自动打开时收起历史记录侧边栏
                  if (sidebarOpen && onSidebarOpenChange) {
                    onSidebarOpenChange(false);
                  }
                }}
              />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="shrink-0 flex-none w-full max-w-4xl mx-auto px-4 pb-4">
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
      </Panel>

      {/* Resizable divider */}
      {artifactState?.isOpen && (
        <>
          <PanelResizeHandle className="relative w-1 flex-shrink-0 group cursor-col-resize bg-border hover:bg-blue-400 data-[resize-handle-state=drag]:bg-blue-500 transition-colors">
            <div className="absolute inset-y-0 -left-2 -right-2 w-5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full opacity-0 group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100 bg-blue-500 transition-opacity" />
          </PanelResizeHandle>

          {/* Artifact preview sidebar */}
          <Panel
            ref={sidebarPanelRef}
            defaultSize={50}
            minSize={20}
            maxSize={70}
          >
            <ArtifactPreviewSidebar
              artifact={artifactState?.artifact || null}
              isOpen={artifactState?.isOpen || false}
              previewUrl={artifactState?.previewUrl || ""}
              onClose={() => setArtifactState(null)}
            />
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
