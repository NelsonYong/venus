"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/app/components/ui/navbar"
import { ChatSidebar } from "@/app/components/sidebar/chat-sidebar"
import { ChatLayout } from "./chat-layout"
import { useChatSession } from "@/app/hooks/use-chat"
import { useTranslation } from "@/app/contexts/i18n-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ChatBot() {
  const { t } = useTranslation()
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  const {
    messages,
    status,
    error,
    modelId,
    webSearch,
    sidebarOpen,
    chatHistory,
    conversationId,
    isLoading,
    isLoadingChat,
    usage,
    setModelId,
    setWebSearch,
    setSidebarOpen,
    handleSubmit,
    handleNewChat,
    handleLoadChat,
    handleDeleteChat,
    handleTitleUpdate,
    handleStarToggle,
    handleRegenerate,
    stop,
    getCurrentChat,
  } = useChatSession()

  // Prevent page unload during streaming
  useEffect(() => {
    if (status === "streaming") {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        return ""
      }
      window.addEventListener("beforeunload", handleBeforeUnload)
      return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [status])

  const handleNavigationAttempt = (navigation: () => void) => {
    if (status === "streaming") {
      setPendingNavigation(() => navigation)
      setShowLeaveWarning(true)
      return
    }
    navigation()
  }

  const handleConfirmLeave = () => {
    stop()
    setShowLeaveWarning(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }

  return (
    <>
      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.streamingWarning.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("chat.streamingWarning.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowLeaveWarning(false); setPendingNavigation(null) }}>
              {t("chat.streamingWarning.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>
              {t("chat.streamingWarning.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex h-screen">
        <ChatSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          chatHistory={chatHistory}
          currentChatId={conversationId || null}
          isLoading={isLoading}
          onNewChat={() => handleNavigationAttempt(handleNewChat)}
          onLoadChat={(chatId) => handleNavigationAttempt(() => handleLoadChat(chatId))}
          onDeleteChat={handleDeleteChat}
        />

        <div className="flex-1 flex flex-col transition-all duration-300">
          <Navbar
            onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
            conversationTitle={getCurrentChat()?.title}
            isStarred={getCurrentChat()?.isStarred}
            onTitleUpdate={handleTitleUpdate}
            onStarToggle={handleStarToggle}
          />

          <div className="flex-1 w-full overflow-hidden">
            <div className="w-full h-full">
              <ChatLayout
                messages={messages}
                status={status}
                input=""
                onInputChange={() => {}}
                onSubmit={handleSubmit}
                model={modelId}
                onModelChange={setModelId}
                webSearch={webSearch}
                onWebSearchToggle={() => setWebSearch(!webSearch)}
                error={error}
                isLoadingChat={isLoadingChat}
                hasChatId={Boolean(conversationId)}
                onRegenerate={handleRegenerate}
                onStop={stop}
                usage={usage}
                sidebarOpen={sidebarOpen}
                onSidebarOpenChange={setSidebarOpen}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
