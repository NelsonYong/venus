"use client"

import { useRef, useEffect } from "react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { EmptyChatState } from "./empty-chat-state"
import { ChatInput } from "./chat-input"
import { MessageRenderer } from "./message-renderer"
import { ArtifactPreviewSidebar } from "./artifact-preview-sidebar"
import { useMobile } from "@/app/hooks/use-mobile"
import { useChatContext } from "@/app/contexts/chat-context"
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from "react-resizable-panels"
import { ErrorBanner } from "./error-banner"

interface ChatLayoutProps {
  isLoadingChat?: boolean
  hasChatId?: boolean
  sidebarOpen?: boolean
  onSidebarOpenChange?: (open: boolean) => void
}

export function ChatLayout({
  isLoadingChat = false,
  hasChatId = false,
  sidebarOpen,
  onSidebarOpenChange,
}: ChatLayoutProps) {
  const { messages, status, error, ui } = useChatContext()
  const isMobile = useMobile()
  const hasMessages = messages.length > 0

  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)
  const mainPanelRef = useRef<ImperativePanelHandle>(null)

  const artifactOpen = ui.artifactPanel?.isOpen ?? false

  // Reset panel sizes when opening new artifact
  useEffect(() => {
    if (artifactOpen) {
      setTimeout(() => {
        mainPanelRef.current?.resize(50)
        sidebarPanelRef.current?.resize(50)
      }, 0)
    }
  }, [ui.artifactPanel?.artifact?.id, artifactOpen])

  // Auto-close history sidebar when artifact opens
  useEffect(() => {
    if (artifactOpen && sidebarOpen && onSidebarOpenChange) {
      onSidebarOpenChange(false)
    }
  }, [artifactOpen]) // intentionally minimal deps

  // Empty state
  if (!hasMessages && !isLoadingChat && !hasChatId) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <ErrorBanner error={error} />
        <EmptyChatState />
        <div className={`shrink-0 flex-none w-full max-w-3xl mx-auto px-4 ${isMobile ? "pb-4" : "pb-8"}`}>
          <ChatInput />
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoadingChat) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="mobile-chat-layout">
        <ErrorBanner error={error} mobile />
        <div className="mobile-scroll-area">
          <Conversation className="h-full">
            <ConversationContent className="w-full px-2 prose prose-sm">
              <MessageRenderer />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>
        <div className="mobile-input-area">
          <ChatInput />
        </div>
      </div>
    )
  }

  // Desktop layout with optional artifact panel
  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel
        ref={mainPanelRef}
        defaultSize={artifactOpen ? 50 : 100}
        minSize={30}
      >
        <div className="flex flex-col h-full">
          <ErrorBanner error={error} />
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="max-w-4xl mx-auto prose">
              <MessageRenderer />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="shrink-0 flex-none w-full max-w-4xl mx-auto px-4 pb-4">
            <ChatInput />
          </div>
        </div>
      </Panel>

      {artifactOpen && ui.artifactPanel && (
        <>
          <PanelResizeHandle className="relative w-1 flex-shrink-0 group cursor-col-resize bg-border hover:bg-blue-400 data-[resize-handle-state=drag]:bg-blue-500 transition-colors">
            <div className="absolute inset-y-0 -left-2 -right-2 w-5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full opacity-0 group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100 bg-blue-500 transition-opacity" />
          </PanelResizeHandle>
          <Panel
            ref={sidebarPanelRef}
            defaultSize={50}
            minSize={20}
            maxSize={70}
          >
            <ArtifactPreviewSidebar
              artifact={ui.artifactPanel.artifact}
              isOpen={true}
              previewUrl={ui.artifactPanel.previewUrl}
              onClose={ui.closeArtifact}
            />
          </Panel>
        </>
      )}
    </PanelGroup>
  )
}
