/* eslint-disable @typescript-eslint/ban-ts-comment */
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
import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { useChatHistory } from "../../hooks/use-conversations";
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
import { Weather, WeatherProps } from "../../tools/Weather";
import { ProtectedRoute } from "../../components/auth/protected-route";
import { Navbar } from "../../components/ui/navbar";
import { ChatSidebar } from "../../components/sidebar/chat-sidebar";
import { useParams, useRouter } from "next/navigation";

const models = [
  {
    name: "GPT 4o",
    value: "openai/gpt-4o",
  },
  {
    name: "Deepseek R1",
    value: "deepseek/deepseek-r1",
  },
];

const ChatPage = () => {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string>("new");

  const params = useParams();
  const router = useRouter();
  const urlChatId = params.id as string;

  // 用ref来跟踪是否正在保存，避免重复保存
  const isSavingRef = useRef(false);
  const lastSavedMessagesRef = useRef<string>("");

  // 同步URL参数到本地状态
  useEffect(() => {
    setCurrentChatId(urlChatId);
  }, [urlChatId]);

  const { messages, sendMessage, status, setMessages } = useChat();
  const {
    chatHistory,
    isLoading,
    saveChatSession,
    deleteChatSession,
    startNewChat,
    fetchChatDetails,
  } = useChatHistory();

  const loadChatById = useCallback(
    async (id: string) => {
      try {
        setIsLoadingChat(true);
        const chatMessages = await fetchChatDetails(id);
        if (chatMessages) {
          setMessages(chatMessages);
        } else {
          // Chat not found, switch to new chat
          setCurrentChatId("new");
          setMessages([]);
          router.push("/chat/new", { scroll: false });
        }
      } catch (error) {
        console.error("Failed to load chat:", error);
        setCurrentChatId("new");
        setMessages([]);
        router.push("/chat/new", { scroll: false });
      } finally {
        setIsLoadingChat(false);
      }
    },
    [fetchChatDetails, setMessages, router]
  );

  // Load chat details when currentChatId changes
  useEffect(() => {
    if (currentChatId && currentChatId !== "new") {
      loadChatById(currentChatId);
    } else if (currentChatId === "new") {
      setMessages([]);
    }
  }, [currentChatId, setMessages, loadChatById]);

  // Save chat session when messages change with debouncing and deduplication
  useEffect(() => {
    if (messages.length === 0) return;

    // 创建消息的唯一标识符
    const messagesSignature = JSON.stringify(
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        // @ts-ignore
        timestamp: m?.createdAt || new Date(),
      }))
    );

    // 如果消息没有变化，或者正在保存中，跳过
    if (
      messagesSignature === lastSavedMessagesRef.current ||
      isSavingRef.current
    ) {
      return;
    }

    // 延迟保存，避免频繁调用 (只对新聊天进行此优化)
    if (currentChatId === "new") {
      const timeoutId = setTimeout(async () => {
        if (isSavingRef.current) return;

        try {
          isSavingRef.current = true;
          lastSavedMessagesRef.current = messagesSignature;

          const newChatId = await saveChatSession(messages);
          if (newChatId) {
            // Update URL and local state to reflect the new chat ID
            setCurrentChatId(newChatId);
            router.replace(`/chat/${newChatId}`);
          }
        } catch (error) {
          console.error("Failed to save chat session:", error);
          // 重置标识符，允许重试
          lastSavedMessagesRef.current = "";
        } finally {
          isSavingRef.current = false;
        }
      }, 1000); // 1秒延迟

      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentChatId, saveChatSession, router]);

  // 为现有聊天单独处理保存（基于聊天状态变化）
  useEffect(() => {
    if (messages.length === 0 || currentChatId === "new") return;

    // 只在聊天状态完成时保存
    if (status === "ready") {
      const messagesSignature = JSON.stringify(
        messages.map((m) => ({
          id: m.id,
          role: m.role,
          timestamp: m.createdAt || new Date(),
        }))
      );

      // 避免重复保存相同的消息
      if (
        messagesSignature === lastSavedMessagesRef.current ||
        isSavingRef.current
      ) {
        return;
      }

      const saveExistingChat = async () => {
        if (isSavingRef.current) return;

        try {
          isSavingRef.current = true;
          lastSavedMessagesRef.current = messagesSignature;
          await saveChatSession(messages, currentChatId);
        } catch (error) {
          console.error("Failed to update chat session:", error);
          lastSavedMessagesRef.current = "";
        } finally {
          isSavingRef.current = false;
        }
      };

      saveExistingChat();
    }
  }, [status, messages, currentChatId, saveChatSession]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
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

  const handleNewChat = () => {
    startNewChat();
    setMessages([]);
    setInput("");
    setCurrentChatId("new");
    router.push("/chat/new", { scroll: false });
  };

  const handleLoadChat = async (selectedChatId: string) => {
    // 不使用路由导航，直接更新本地状态
    setCurrentChatId(selectedChatId);

    // 同时更新URL但不刷新页面
    router.push(`/chat/${selectedChatId}`, { scroll: false });
  };

  const handleDeleteChat = async (selectedChatId: string) => {
    try {
      await deleteChatSession(selectedChatId);
      // If we're deleting the current chat, switch to new chat
      if (currentChatId === selectedChatId) {
        setCurrentChatId("new");
        router.push("/chat/new", { scroll: false });
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
        currentChatId={currentChatId === "new" ? null : currentChatId}
        isLoading={isLoading}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Right side content area */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        {/* Navbar */}
        <Navbar onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto h-full p-6">
            <div className="flex flex-col h-full">
              {isLoadingChat ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader />
                  <span className="ml-2">加载聊天记录中...</span>
                </div>
              ) : (
                <>
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
                                              (part) =>
                                                part.type === "source-url"
                                            ).length
                                          }
                                        />
                                        <SourcesContent
                                          key={`${message.id}-${i}`}
                                        >
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
                          <span>Search</span>
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
                </>
              )}
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
      <ChatPage />
    </ProtectedRoute>
  );
}

export default ProtectedChatPage;
