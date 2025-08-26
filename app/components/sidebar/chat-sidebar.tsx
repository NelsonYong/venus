"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusIcon,
  MessageSquareIcon,
  ClockIcon,
  TrashIcon,
  StarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/app/hooks/use-chat-history";
import { useEffect } from "react";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatSession[];
  currentChatId: string | null;
  isLoading?: boolean;
  onNewChat: () => void;
  onLoadChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onOpen?: () => void;
}

interface ChatItemProps {
  chat: ChatSession;
  currentChatId: string | null;
  onSelect: (chatId: string) => void;
  onDelete: (e: React.MouseEvent, chatId: string) => void;
  formatTimestamp: (timestamp: Date) => string;
  showStar: boolean;
}

function ChatItem({
  chat,
  currentChatId,
  onSelect,
  onDelete,
  formatTimestamp,
  showStar,
}: ChatItemProps) {
  return (
    <div
      onClick={() => onSelect(chat.id)}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-colors group relative w-full",
        currentChatId === chat.id
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent"
      )}
    >
      <div className="flex items-start gap-2 w-full">
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          <MessageSquareIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
          {showStar && chat.isStarred && (
            <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden pr-2">
          <h3 className="font-medium text-sm line-clamp-1 text-foreground group-hover:text-accent-foreground leading-tight">
            {chat.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words leading-relaxed">
            {chat.preview}
          </p>
          <span className="text-xs text-muted-foreground mt-1 block truncate">
            {formatTimestamp(chat.timestamp)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
          onClick={(e) => onDelete(e, chat.id)}
        >
          <TrashIcon className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function ChatSidebar({
  isOpen,
  onClose,
  chatHistory,
  currentChatId,
  isLoading = false,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  onOpen,
}: ChatSidebarProps) {
  // Load history when sidebar is first opened
  useEffect(() => {
    if (isOpen && onOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const handleChatSelect = (chatId: string) => {
    onLoadChat(chatId);
    // onClose();
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm("确定要删除这个聊天记录吗？")) {
      onDeleteChat(chatId);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    if (diff < 1000 * 60 * 60) {
      return `${Math.floor(diff / (1000 * 60))}分钟前`;
    } else if (diff < 1000 * 60 * 60 * 24) {
      return `${Math.floor(diff / (1000 * 60 * 60))}小时前`;
    } else {
      return `${Math.floor(diff / (1000 * 60 * 60 * 24))}天前`;
    }
  };

  return (
    <div
      className={cn(
        "h-full bg-background border-r border-border transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-80" : "w-0"
      )}
    >
      <div className="flex flex-col h-full w-80">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start"
            size="sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            新建聊天
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 w-full">
              {isLoading ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  加载中...
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  还没有聊天记录
                </div>
              ) : (
                <>
                  {/* Starred Conversations */}
                  {chatHistory.filter((chat) => chat.isStarred).length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                        <StarIcon className="w-4 h-4" />
                        已收藏
                      </div>
                      <div className="space-y-2">
                        {chatHistory
                          .filter((chat) => chat.isStarred)
                          .map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              currentChatId={currentChatId}
                              onSelect={handleChatSelect}
                              onDelete={handleDeleteChat}
                              formatTimestamp={formatTimestamp}
                              showStar={true}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Conversations */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                      <ClockIcon className="w-4 h-4" />
                      聊天记录
                    </div>
                    <div className="space-y-2">
                      {chatHistory
                        .filter((chat) => !chat.isStarred)
                        .map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            currentChatId={currentChatId}
                            onSelect={handleChatSelect}
                            onDelete={handleDeleteChat}
                            formatTimestamp={formatTimestamp}
                            showStar={false}
                          />
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
