"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PlusIcon,
  MessageSquareIcon,
  TrashIcon,
  StarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { ChatSession } from "@/app/hooks/use-conversations";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/contexts/i18n-context";

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
  onDelete: (chatId: string) => void;
  formatTimestamp: (timestamp: Date) => string;
}

function ChatItem({
  chat,
  currentChatId,
  onSelect,
  onDelete,
  formatTimestamp,
}: ChatItemProps) {
  const { t } = useTranslation();
  const isActive = currentChatId === chat.id;

  const handleClick = (e: React.MouseEvent) => {
    // Only select if clicking on the item itself, not on the delete button
    if ((e.target as HTMLElement).closest('[data-delete-button]')) {
      return;
    }
    onSelect(chat.id);
  };

  return (
    <div className="group relative">
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
          isActive ? "bg-accent/50" : "hover:bg-accent/30"
        )}
      >
        {/* Icon */}
        <div className="shrink-0">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-muted/80"
            )}
          >
            <MessageSquareIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-medium text-sm line-clamp-1 transition-colors",
                isActive ? "text-foreground" : "text-foreground/80"
              )}
            >
              {chat.title}
            </h3>
            {chat.isStarred && (
              <StarIcon className="w-3 h-3 shrink-0 fill-amber-500 text-amber-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {formatTimestamp(chat.timestamp)}
          </p>
        </div>

        {/* Actions */}
        <div data-delete-button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 shrink-0 transition-opacity hover:bg-destructive/10 hover:text-destructive",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("sidebar.confirmDeleteTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("sidebar.confirmDeleteDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(chat.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("sidebar.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function groupChatsByDate(
  chats: ChatSession[],
  t: (key: string) => string
): { label: string; chats: ChatSession[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const groups: { label: string; chats: ChatSession[] }[] = [
    { label: t("sidebar.today"), chats: [] },
    { label: t("sidebar.yesterday"), chats: [] },
    { label: t("sidebar.lastWeek"), chats: [] },
    { label: t("sidebar.lastMonth"), chats: [] },
    { label: t("sidebar.older"), chats: [] },
  ];

  chats.forEach((chat) => {
    const chatDate = new Date(chat.timestamp);
    if (chatDate >= today) {
      groups[0].chats.push(chat);
    } else if (chatDate >= yesterday) {
      groups[1].chats.push(chat);
    } else if (chatDate >= lastWeek) {
      groups[2].chats.push(chat);
    } else if (chatDate >= lastMonth) {
      groups[3].chats.push(chat);
    } else {
      groups[4].chats.push(chat);
    }
  });

  return groups.filter((group) => group.chats.length > 0);
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
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen && onOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  const handleNewChat = () => {
    router.push(`/`, { scroll: false });
    onNewChat();
    onClose();
  };

  const handleChatSelect = (chatId: string) => {
    router.push(`/?chatId=${chatId}`, { scroll: false });
    onLoadChat(chatId);
  };

  const handleDeleteChat = (chatId: string) => {
    onDeleteChat(chatId);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const chatDate = new Date(timestamp);

    if (chatDate >= today) {
      // Today - show time
      return chatDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diff < 1000 * 60 * 60 * 24 * 2) {
      // Yesterday
      return t("time.yesterday");
    } else if (diff < 1000 * 60 * 60 * 24 * 7) {
      // This week - show day name
      return chatDate.toLocaleDateString([], { weekday: "short" });
    } else {
      // Older - show date
      return chatDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  const starredChats = chatHistory.filter((chat) => chat.isStarred);
  const regularChats = chatHistory.filter((chat) => !chat.isStarred);
  const groupedChats = groupChatsByDate(regularChats, t);

  return (
    <div
      className={cn(
        "h-full bg-background transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-80" : "w-0",
        isOpen ? "border-r border-border" : ""
      )}
    >
      <div className="flex flex-col h-full w-80">
        {/* Header */}
        <div className="p-3 border-b border-border/50">
          <Button
            onClick={handleNewChat}
            className="w-full h-10 justify-start font-medium"
            size="sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {t("sidebar.newChat")}
          </Button>
        </div>

        {/* Chat History */}
        <ScrollArea className="flex-1">
          <div className="px-2 py-3 space-y-6">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {t("common.loading")}
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8 px-4">
                <MessageSquareIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>{t("sidebar.noMessages")}</p>
              </div>
            ) : (
              <>
                {/* Starred Conversations */}
                {starredChats.length > 0 && (
                  <div>
                    <div className="px-3 mb-2">
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("sidebar.starred")}
                      </h2>
                    </div>
                    <div className="space-y-1">
                      {starredChats.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          currentChatId={currentChatId}
                          onSelect={handleChatSelect}
                          onDelete={handleDeleteChat}
                          formatTimestamp={formatTimestamp}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Grouped Regular Conversations */}
                {groupedChats.map((group) => (
                  <div key={group.label}>
                    <div className="px-3 mb-2">
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </h2>
                    </div>
                    <div className="space-y-1">
                      {group.chats.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          currentChatId={currentChatId}
                          onSelect={handleChatSelect}
                          onDelete={handleDeleteChat}
                          formatTimestamp={formatTimestamp}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
