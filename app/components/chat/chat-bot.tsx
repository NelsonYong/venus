"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/app/components/ui/navbar";
import { ChatSidebar } from "@/app/components/sidebar/chat-sidebar";
import { ChatLayout } from "./chat-layout";
import { useChatBot } from "@/app/hooks/use-chat-bot";
import { useTranslation } from "@/app/contexts/i18n-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ChatBot() {
  const { t } = useTranslation();
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);

  const {
    // State
    input,
    model,
    webSearch,
    sidebarOpen,
    messages,
    status,
    chatHistory,
    currentChatId,
    isLoading,
    isLoadingChat,
    error,
    usage,

    // Actions
    setInput,
    setModel,
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

    // Computed
    getCurrentChat,
  } = useChatBot();

  // Prevent page unload during streaming
  useEffect(() => {
    const isStreaming = status === "streaming";

    if (isStreaming) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        return "";
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [status]);

  // Handle navigation during streaming
  const handleNavigationAttempt = (navigation: () => void) => {
    if (status === "streaming") {
      setPendingNavigation(() => navigation);
      setShowLeaveWarning(true);
      return false;
    }
    navigation();
    return true;
  };

  const handleConfirmLeave = () => {
    stop();
    setShowLeaveWarning(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveWarning(false);
    setPendingNavigation(null);
  };

  // Override navigation handlers
  const wrappedHandleNewChat = () => {
    handleNavigationAttempt(handleNewChat);
  };

  const wrappedHandleLoadChat = (chatId: string) => {
    handleNavigationAttempt(() => handleLoadChat(chatId));
  };

  // console.log("messages", messages);

  return (
    <>
      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("chat.streamingWarning.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.streamingWarning.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLeave}>
              {t("chat.streamingWarning.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>
              {t("chat.streamingWarning.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex h-screen">
        {/* Sidebar - Fixed on the left */}
        <ChatSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          chatHistory={chatHistory}
          currentChatId={currentChatId}
          isLoading={isLoading}
          onNewChat={wrappedHandleNewChat}
          onLoadChat={wrappedHandleLoadChat}
          onDeleteChat={handleDeleteChat}
        />

        {/* Right side content area */}
        <div className="flex-1 flex flex-col transition-all duration-300">
          {/* Navbar */}
          <Navbar
            onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
            conversationTitle={getCurrentChat()?.title}
            isStarred={getCurrentChat()?.isStarred}
            onTitleUpdate={handleTitleUpdate}
            onStarToggle={handleStarToggle}
          />

          {/* Main Content */}
          <div className="flex-1 w-full overflow-hidden">
            <div className="w-full h-full">
              <ChatLayout
                messages={messages}
                status={status}
                input={input}
                onInputChange={setInput}
                onSubmit={handleSubmit}
                model={model}
                onModelChange={setModel}
                webSearch={webSearch}
                onWebSearchToggle={() => setWebSearch(!webSearch)}
                error={error}
                isLoadingChat={isLoadingChat}
                onRegenerate={handleRegenerate}
                onStop={stop}
                usage={usage}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
