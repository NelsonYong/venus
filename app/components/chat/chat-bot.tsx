"use client";

import { Navbar } from "@/app/components/ui/navbar";
import { ChatSidebar } from "@/app/components/sidebar/chat-sidebar";
import { ChatLayout } from "./chat-layout";
import { useChatBot } from "@/app/hooks/use-chat-bot";

export function ChatBot() {
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
    error,
    
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
    
    // Computed
    getCurrentChat,
  } = useChatBot();

  return (
    <div className="flex h-screen">
      {/* Sidebar - Fixed on the left */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        isLoading={isLoading}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}