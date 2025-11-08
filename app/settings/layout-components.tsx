"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function SettingsLayout({ sidebar, children }: SettingsLayoutProps) {
  return (
    <div className="flex h-full w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/30 shrink-0">
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
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
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
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
