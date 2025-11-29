"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMobile } from "@/app/hooks/use-mobile";

interface SettingsLayoutProps {
  sidebar: ReactNode;
  bottomTabs?: ReactNode;
  children: ReactNode;
}

export function SettingsLayout({ sidebar, bottomTabs, children }: SettingsLayoutProps) {
  const isMobile = useMobile();

  return (
    <div className="flex h-full w-full bg-background relative">
      {/* Desktop Sidebar - 桌面端侧边栏 */}
      {!isMobile && (
        <aside className="w-64 border-r border-border bg-card/30 shrink-0">
          {sidebar}
        </aside>
      )}

      {/* Main content */}
      <main className={cn(
        "flex-1 overflow-auto",
        isMobile && "pb-20" // 移动端底部留出 tab 空间
      )}>
        {children}
      </main>

      {/* Mobile Bottom Tabs - 移动端底部标签 */}
      {isMobile && bottomTabs && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          {bottomTabs}
        </div>
      )}
    </div>
  );
}

interface SettingsSidebarProps {
  items: {
    id: string;
    label: string;
    icon?: ReactNode;
  }[];
  activeItem: string;
  onItemClick: (id: string) => void;
}

export function SettingsSidebar({
  items,
  activeItem,
  onItemClick,
}: SettingsSidebarProps) {
  return (
    <nav className="p-4 space-y-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick(item.id)}
          className={cn(
            "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            activeItem === item.id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

interface SettingsBottomTabsProps {
  items: {
    id: string;
    label: string;
    icon?: ReactNode;
  }[];
  activeItem: string;
  onItemClick: (id: string) => void;
}

export function SettingsBottomTabs({
  items,
  activeItem,
  onItemClick,
}: SettingsBottomTabsProps) {
  return (
    <nav className="bg-background/95 backdrop-blur-lg border-t border-border shadow-lg">
      <div className="flex items-center justify-around px-2 py-3 max-w-screen-sm mx-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={cn(
              "flex flex-col items-center justify-center min-w-0 px-2 py-1 rounded-lg transition-all",
              activeItem === item.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {item.icon && (
              <span className={cn(
                "mb-1 transition-transform",
                activeItem === item.id && "scale-110"
              )}>
                {item.icon}
              </span>
            )}
            <span className={cn(
              "text-[10px] font-medium truncate max-w-[60px]",
              activeItem === item.id && "font-semibold"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

interface SettingsContentProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsContent({
  title,
  description,
  children,
}: SettingsContentProps) {
  const isMobile = useMobile();

  return (
    <div className={cn(
      "max-w-4xl",
      isMobile ? "p-4" : "p-8"
    )}>
      <div className={cn(
        isMobile ? "mb-4" : "mb-6"
      )}>
        <h1 className={cn(
          "font-semibold text-foreground",
          isMobile ? "text-xl" : "text-2xl"
        )}>
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface SettingsSectionProps {
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ children, className }: SettingsSectionProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
