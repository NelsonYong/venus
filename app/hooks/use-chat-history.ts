"use client";

import { useState, useEffect } from "react";
import { Message } from "@ai-sdk/react";

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
  messages: Message[];
}

const STORAGE_KEY = "rela-ai-chat-history";

export function useChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsed.map((chat: any) => ({
          ...chat,
          timestamp: new Date(chat.timestamp)
        }));
        setChatHistory(historyWithDates);
      } catch (error) {
        console.error("Failed to parse chat history:", error);
      }
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Generate chat title from first message
  const generateChatTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find(msg => msg.role === "user");
    if (firstUserMessage) {
      const text = firstUserMessage.parts?.find(part => part.type === "text")?.text || 
                   firstUserMessage.content ||
                   "新的对话";
      return text.slice(0, 30) + (text.length > 30 ? "..." : "");
    }
    return "新的对话";
  };

  // Generate preview from last few messages
  const generatePreview = (messages: Message[]): string => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      const text = lastMessage.parts?.find(part => part.type === "text")?.text ||
                   lastMessage.content ||
                   "...";
      return text.slice(0, 50) + (text.length > 50 ? "..." : "");
    }
    return "暂无消息";
  };

  // Save current chat session
  const saveChatSession = (messages: Message[], chatId?: string) => {
    if (messages.length === 0) return null;

    const sessionId = chatId || Date.now().toString();
    const title = generateChatTitle(messages);
    const preview = generatePreview(messages);

    const newSession: ChatSession = {
      id: sessionId,
      title,
      timestamp: new Date(),
      preview,
      messages: messages.map(msg => ({ ...msg })) // Deep copy messages
    };

    setChatHistory(prev => {
      const existingIndex = prev.findIndex(chat => chat.id === sessionId);
      if (existingIndex >= 0) {
        // Update existing session
        const updated = [...prev];
        updated[existingIndex] = newSession;
        return updated.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      } else {
        // Add new session
        return [newSession, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      }
    });

    setCurrentChatId(sessionId);
    return sessionId;
  };

  // Load a chat session
  const loadChatSession = (chatId: string): Message[] | null => {
    const session = chatHistory.find(chat => chat.id === chatId);
    if (session) {
      setCurrentChatId(chatId);
      return session.messages;
    }
    return null;
  };

  // Delete a chat session
  const deleteChatSession = (chatId: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  // Start new chat
  const startNewChat = () => {
    setCurrentChatId(null);
  };

  // Get current chat session
  const getCurrentChat = (): ChatSession | null => {
    if (!currentChatId) return null;
    return chatHistory.find(chat => chat.id === currentChatId) || null;
  };

  return {
    chatHistory,
    currentChatId,
    saveChatSession,
    loadChatSession,
    deleteChatSession,
    startNewChat,
    getCurrentChat
  };
}