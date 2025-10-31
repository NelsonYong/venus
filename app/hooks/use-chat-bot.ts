"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/auth-context";
import { useChatHistory } from "./use-conversations";
import { useAutoSummary } from "./use-auto-summary";
import { useConversationActions } from "./use-conversation-actions";
import { defaultModel } from "@/app/constants/models";

export function useChatBot() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(defaultModel);
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
        saveChatSession([], undefined, model).then((chatId) => {
          router.push(`/?chatId=${chatId}`, { scroll: false });
          if (chatId)
            sendMessage(
              { text: input },
              {
                body: {
                  modelId: model,
                  webSearch: webSearch,
                  userId: user?.id,
                  conversationId: chatId,
                },
              }
            );
        });
      } else
        sendMessage(
          { text: input },
          {
            body: {
              modelId: model,
              webSearch: webSearch,
              userId: user?.id,
              conversationId: currentChatId,
            },
          }
        );
      setInput("");
    }
  };

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

  const handleTitleUpdate = (newTitle: string) => {
    if (currentChatId) {
      updateTitleMutation.mutate({
        id: currentChatId,
        title: newTitle,
      });
    }
  };

  const handleStarToggle = () => {
    const currentChat = getCurrentChat();
    console.log("currentChat", currentChat, currentChatId);

    if (currentChatId && currentChat) {
      toggleStar.mutate({
        id: currentChatId,
        isStarred: !currentChat.isStarred,
      });
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
        console.log("保存 messages", messages);

        saveChatSession(messages, currentChatId, model);
        lastSavedMessagesLength.current = messages.length;
      }
    }
  }, [status, messages, currentChatId, model, saveChatSession]);

  // 判读是刷新进入页面也是跳转路由进入
  useEffect(() => {
    const chatId = searchParams.get("chatId");
    if (chatId && !isLoading) {
      handleLoadChat(chatId);
    }
  }, [searchParams, isLoading]);

  return {
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
  };
}