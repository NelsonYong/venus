"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatHistory } from "./use-conversations";
import { useConversationActions } from "./use-conversation-actions";
import { defaultModel } from "@/app/constants/models";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useAuth } from "./use-auth";

export function useChatBot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(defaultModel);
  const [webSearch, setWebSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);



  const {
    chatHistory,
    currentChatId,
    isLoading,
    saveChatSession,
    loadChatSession,
    deleteChatSession,
    startNewChat,
    getCurrentChat,
  } = useChatHistory();

  const { messages, sendMessage, status, setMessages, error, stop } = useChat({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat stream error:", error);
      // You can add a toast notification here if needed
    },
    // ReAct 模式需要更多步骤来完成思考 -> 行动 -> 观察 -> 回答的循环
    maxSteps: 10,
  });

  const { toggleStar, updateTitle: updateTitleMutation } =
    useConversationActions();

  const searchParams = useSearchParams();
  const router = useRouter();
  const isMounted = useRef(false);
  const isNewChat = useRef(false);
  const lastSavedMessagesLength = useRef(0);
  const lastLoadedChatId = useRef<string | null>(null);

  const handleSubmit = (message: any, attachments: any[]) => {
    // 阻止在流式输出时发送新消息
    if (status === "streaming") {
      return;
    }

    const messageText = message.text?.trim() || "";

    if (messageText || attachments.length > 0) {
      setInput("");

      // 如果没有 chatId，则生成一个
      if (!searchParams.get("chatId")) {
        saveChatSession([], undefined, model).then((chatId) => {
          if (chatId) {
            // Mark this chat as loaded to prevent useEffect from reloading it
            lastLoadedChatId.current = chatId;
            router.push(`/chat?chatId=${chatId}`, { scroll: false });

            sendMessage(
              { text: messageText },
              {
                body: {
                  modelId: model,
                  webSearch: webSearch,
                  userId: user?.id,
                  conversationId: chatId,
                  uploadedAttachments: attachments,
                },
              }
            );

            // 使用 setTimeout 在消息添加后立即更新它
            setTimeout(() => {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                const lastUserMessage = newMessages[newMessages.length - 1];
                if (lastUserMessage && lastUserMessage.role === 'user') {
                  (lastUserMessage as any).data = {
                    uploadedAttachments: attachments,
                  };
                }
                return newMessages;
              });
            }, 100);
          }
        });
      } else {
        sendMessage(
          { text: messageText },
          {
            body: {
              modelId: model,
              webSearch: webSearch,
              userId: user?.id,
              conversationId: currentChatId,
              uploadedAttachments: attachments,
            },
          }
        );

        // 使用 setTimeout 在消息添加后立即更新它
        setTimeout(() => {
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const lastUserMessage = newMessages[newMessages.length - 1];
            if (lastUserMessage && lastUserMessage.role === 'user') {
              (lastUserMessage as any).data = {
                uploadedAttachments: attachments,
              };
            }
            return newMessages;
          });
        }, 100);
      }
    }
  };

  const handleNewChat = () => {
    isNewChat.current = true;
    lastSavedMessagesLength.current = 0;
    lastLoadedChatId.current = null;
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
        lastLoadedChatId.current = chatId;
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

  const handleRegenerate = async () => {
    if (messages.length === 0) return;

    // Find the last assistant message
    let lastAssistantMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantMessageIndex = i;
        break;
      }
    }

    // If there's no assistant message, nothing to regenerate
    if (lastAssistantMessageIndex === -1) return;

    // Find the last user message (should be before the assistant message)
    let lastUserMessageIndex = -1;
    for (let i = lastAssistantMessageIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];

    // Calculate how many messages to delete from backend
    const messagesToDeleteCount = messages.length - lastUserMessageIndex;

    // Delete old messages from backend first
    if (currentChatId) {
      try {
        await fetch(`/api/conversations/${currentChatId}/messages?count=${messagesToDeleteCount}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete old messages:', error);
        // Continue anyway, frontend state will be updated
      }
    }

    // Remove the last user message and all messages after it from frontend
    // sendMessage will automatically add the user message back
    setMessages(messages.slice(0, lastUserMessageIndex));

    // Re-send the last user message
    const messageText = lastUserMessage.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n");

    // Extract attachments from data or metadata
    let attachments = [];
    if ((lastUserMessage as any).data?.uploadedAttachments) {
      attachments = (lastUserMessage as any).data.uploadedAttachments;
    } else if ((lastUserMessage as any).metadata?.uploadedAttachments) {
      attachments = (lastUserMessage as any).metadata.uploadedAttachments;
    }

    if (messageText || attachments.length > 0) {
      sendMessage(
        { text: messageText },
        {
          body: {
            modelId: model,
            webSearch: webSearch,
            userId: user?.id,
            conversationId: currentChatId,
            uploadedAttachments: attachments,
          },
        }
      );

      // Update message with attachments after sending
      setTimeout(() => {
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastUserMessage = newMessages[newMessages.length - 1];
          if (lastUserMessage && lastUserMessage.role === 'user') {
            (lastUserMessage as any).data = {
              uploadedAttachments: attachments,
            };
          }
          return newMessages;
        });
      }, 100);
    }
  };

  useEffect(() => {
    isMounted.current = true;
  }, []);

  // Effect for refreshing cache after backend saves messages
  // NOTE: Backend handles real-time saving in /api/chat onFinish callback
  // This effect refreshes the React Query cache so switching conversations works correctly
  useEffect(() => {
    if (!isMounted.current) return;

    // When stream completes and we have new messages, invalidate cache
    if (status === "ready" && currentChatId && messages.length > 0) {
      if (messages.length !== lastSavedMessagesLength.current) {
        console.log("🔄 Stream completed, refreshing conversation cache");

        // Update our tracking
        lastSavedMessagesLength.current = messages.length;

        // Invalidate the conversations cache to force refetch on next load
        // This ensures when switching back to this conversation, we see all messages
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.list()
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(currentChatId)
        });
        // handleLoadChat(currentChatId);
      }
    }
  }, [status, messages, currentChatId, queryClient]);

  // 判读是刷新进入页面也是跳转路由进入
  useEffect(() => {
    const chatId = searchParams.get("chatId");
    if (chatId && !isLoading) {
      // Only load chat if:
      // 1. The chat ID has actually changed from the last loaded one
      // 2. AND we're not currently streaming (avoid overwriting messages being sent)
      const isChatIdChanged = lastLoadedChatId.current !== chatId;
      const shouldLoadChat = isChatIdChanged && status !== "streaming";

      if (shouldLoadChat) {
        handleLoadChat(chatId);
        lastLoadedChatId.current = chatId;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, status]);

  // Check if we have a chatId in URL but messages haven't loaded yet
  const chatId = searchParams.get("chatId");
  const isLoadingChat = Boolean(chatId && messages.length === 0 && isLoading);

  // Get usage from the last message's metadata
  const lastMessage = messages[messages.length - 1];
  const messageUsage = lastMessage?.metadata as any;


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
    isLoadingChat,
    error,
    usage: messageUsage, // Use message metadata first, fallback to useChat usage

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
  };
}