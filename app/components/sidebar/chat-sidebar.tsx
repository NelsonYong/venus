"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusIcon, MessageSquareIcon, ClockIcon, TrashIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/app/hooks/use-chat-history";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatSession[];
  currentChatId: string | null;
  onNewChat: () => void;
  onLoadChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatSidebar({ 
  isOpen, 
  onClose, 
  chatHistory, 
  currentChatId,
  onNewChat, 
  onLoadChat, 
  onDeleteChat 
}: ChatSidebarProps) {
  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const handleChatSelect = (chatId: string) => {
    onLoadChat(chatId);
    onClose();
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
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                <ClockIcon className="w-4 h-4" />
                聊天记录
              </div>

              <div className="space-y-2">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    还没有聊天记录
                  </div>
                ) : (
                  chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors group relative",
                        currentChatId === chat.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <MessageSquareIcon className="w-4 h-4 mt-1 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate text-foreground group-hover:text-accent-foreground">
                            {chat.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {chat.preview}
                          </p>
                          <span className="text-xs text-muted-foreground mt-2 block">
                            {formatTimestamp(chat.timestamp)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                        >
                          <TrashIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
