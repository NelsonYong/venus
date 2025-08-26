"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { GlobeIcon } from "lucide-react";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";

import { Loader } from "@/components/ai-elements/loader";
import { Weather, WeatherProps } from "./tools/Weather";
import { ProtectedRoute } from "./components/auth/protected-route";
import { Navbar } from "./components/ui/navbar";
import { ChatSidebar } from "./components/sidebar/chat-sidebar";
import { useChatHistory } from "./hooks/use-conversations";
import { useAutoSummary } from "./hooks/use-auto-summary";
import { useConversationActions } from "./hooks/use-conversation-actions";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/app/contexts/i18n-context";

const models = [
  {
    name: "Deepseek V3",
    value: "deepseek/deepseek-v3",
  },
];

const ChatBotDemo = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { messages, sendMessage, status, setMessages } = useChat();
  const {
    chatHistory,
    currentChatId,
    isLoading,
    saveChatSession,
    loadChatSession,
    updateChatTitle,
    deleteChatSession,
    startNewChat,
    getCurrentChat,
  } = useChatHistory();

  const { toggleStar, updateTitle: updateTitleMutation } =
    useConversationActions();

  const searchParams = useSearchParams();
  const router = useRouter();
  const isMounted = useRef(false);
  const isNewChat = useRef(false);
  const lastSavedMessagesLength = useRef(0);

  // Auto-summary hook for generating titles
  const { resetSummaryStatus } = useAutoSummary({
    messages,
    currentChatId,
    status,
    isNewChat: isNewChat.current,
    updateChatTitle,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      // 如果没有 chatId，则生成一个
      if (!searchParams.get("chatId")) {
        saveChatSession([]).then((chatId) => {
          router.push(`/?chatId=${chatId}`, { scroll: false });
          if (chatId)
            sendMessage(
              { text: input },
              {
                body: {
                  model: model,
                  webSearch: webSearch,
                },
              }
            );
        });
      } else
        sendMessage(
          { text: input },
          {
            body: {
              model: model,
              webSearch: webSearch,
            },
          }
        );
      setInput("");
    }
  };

  useEffect(() => {
    isMounted.current = true;
  }, []);

  // Effect for saving chat sessions
  useEffect(() => {
    if (!isMounted.current) return;
    if (status === "ready" && currentChatId && messages.length > 0) {
      // Only save if messages have actually changed
      if (messages.length !== lastSavedMessagesLength.current) {
        saveChatSession(messages, currentChatId);
        lastSavedMessagesLength.current = messages.length;
      }
    }
  }, [status, messages, currentChatId, saveChatSession]);

  // 判读是刷新进入页面也是跳转路由进入
  useEffect(() => {
    const chatId = searchParams.get("chatId");
    if (chatId && !isLoading) {
      handleLoadChat(chatId);
    }
  }, [searchParams, isLoading]);

  const handleNewChat = () => {
    isNewChat.current = true;
    lastSavedMessagesLength.current = 0;
    resetSummaryStatus();
    startNewChat();
    setMessages([]);
    setInput("");
  };

  const handleLoadChat = async (chatId: string) => {
    try {
      const chatMessages = await loadChatSession(chatId);
      if (chatMessages) {
        // Reset tracking refs for loaded chat
        isNewChat.current = false;
        lastSavedMessagesLength.current = chatMessages.length;
        // Don't reset summary status for loaded chats (they likely already have titles)
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChatSession(chatId);
      // If we're deleting the current chat, start a new one
      if (currentChatId === chatId) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

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
          onTitleUpdate={(newTitle) => {
            if (currentChatId) {
              updateTitleMutation.mutate({
                id: currentChatId,
                title: newTitle,
              });
            }
          }}
          onStarToggle={() => {
            const currentChat = getCurrentChat();
            if (currentChatId && currentChat) {
              toggleStar.mutate({
                id: currentChatId,
                isStarred: !currentChat.isStarred,
              });
            }
          }}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto h-full p-6">
            <div className="flex flex-col h-full">
              <Conversation className="flex-1">
                <ConversationContent>
                  {messages.map((message) => (
                    <div key={message.id}>
                      {message.role === "assistant" && (
                        <Sources>
                          {message.parts.map((part, i) => {
                            switch (part.type) {
                              case "source-url":
                                return (
                                  <>
                                    <SourcesTrigger
                                      count={
                                        message.parts.filter(
                                          (part) => part.type === "source-url"
                                        ).length
                                      }
                                    />
                                    <SourcesContent key={`${message.id}-${i}`}>
                                      <Source
                                        key={`${message.id}-${i}`}
                                        href={part.url}
                                        title={part.url}
                                      />
                                    </SourcesContent>
                                  </>
                                );
                            }
                          })}
                        </Sources>
                      )}
                      <Message from={message.role} key={message.id}>
                        <MessageContent>
                          {message.parts.map((part, i) => {
                            switch (part.type) {
                              case "text":
                                return (
                                  <Response key={`${message.id}-${i}`}>
                                    {part.text}
                                  </Response>
                                );
                              case "tool-weather":
                                return (
                                  <Weather
                                    key={`${message.id}-${i}`}
                                    {...(part.output as WeatherProps)}
                                  />
                                );
                              case "reasoning":
                                return (
                                  <Reasoning
                                    key={`${message.id}-${i}`}
                                    className="w-full"
                                    isStreaming={status === "streaming"}
                                  >
                                    <ReasoningTrigger />
                                    <ReasoningContent>
                                      {part.text}
                                    </ReasoningContent>
                                  </Reasoning>
                                );
                              default:
                                return null;
                            }
                          })}
                        </MessageContent>
                      </Message>
                    </div>
                  ))}
                  {status === "submitted" && <Loader />}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

              <PromptInput
                onSubmit={handleSubmit}
                className="mt-4 flex-shrink-0 w-full"
              >
                <PromptInputTextarea
                  placeholder={t("chat.placeholder")}
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                />
                <PromptInputToolbar>
                  <PromptInputTools>
                    <PromptInputButton
                      variant={webSearch ? "default" : "ghost"}
                      onClick={() => setWebSearch(!webSearch)}
                    >
                      <GlobeIcon size={16} />
                      <span>{t("chat.search")}</span>
                    </PromptInputButton>
                    <PromptInputModelSelect
                      onValueChange={(value) => {
                        setModel(value);
                      }}
                      value={model}
                    >
                      <PromptInputModelSelectTrigger>
                        <PromptInputModelSelectValue />
                      </PromptInputModelSelectTrigger>
                      <PromptInputModelSelectContent>
                        {models.map((model) => (
                          <PromptInputModelSelectItem
                            key={model.value}
                            value={model.value}
                          >
                            {model.name}
                          </PromptInputModelSelectItem>
                        ))}
                      </PromptInputModelSelectContent>
                    </PromptInputModelSelect>
                  </PromptInputTools>
                  <PromptInputSubmit disabled={!input} status={status} />
                </PromptInputToolbar>
              </PromptInput>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function ProtectedChatPage() {
  return (
    <ProtectedRoute>
      <ChatBotDemo />
    </ProtectedRoute>
  );
}

export default ProtectedChatPage;
