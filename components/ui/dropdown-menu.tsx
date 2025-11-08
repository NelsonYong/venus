"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DropdownMenu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({ className, children, open, onOpenChange, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(open || false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const container = ref && "current" in ref ? ref.current : null;
      const content = contentRef.current;

      // 检查点击是否在容器（trigger）或内容区域中
      const isClickInsideContainer = container && container.contains(target);
      const isClickInsideContent = content && content.contains(target);

      // 如果点击在容器或内容区域外，则关闭下拉框
      if (!isClickInsideContainer && !isClickInsideContent) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onOpenChange, ref]);

  const contextValue = React.useMemo(
    () => ({
      open: isOpen,
      setOpen: (open: boolean) => {
        setIsOpen(open);
        onOpenChange?.(open);
      },
      contentRef,
    }),
    [isOpen, onOpenChange]
  );

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <div ref={ref} className={cn("relative", className)} {...props}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
});
DropdownMenu.displayName = "DropdownMenu";

const DropdownMenuContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}>({
  open: false,
  setOpen: () => {},
  contentRef: undefined,
});

const DropdownMenuTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ className, children, asChild = false, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DropdownMenuContext);

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as React.HTMLAttributes<HTMLElement>;
    return React.cloneElement(children, {
      ...childProps,
      ...props,
      ref,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        setOpen(!open);
        if (childProps.onClick) {
          childProps.onClick(e as React.MouseEvent<HTMLElement>);
        }
      },
      "aria-expanded": open,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={className}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: "start" | "center" | "end";
    sideOffset?: number;
  }
>(({ className, children, align = "start", sideOffset = 4, ...props }, ref) => {
  const { open, contentRef } = React.useContext(DropdownMenuContext);
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  // 合并外部 ref 和内部 contentRef
  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      // 设置 contentRef（用于点击外部检测）
      if (contentRef && "current" in contentRef) {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
      }
      // 处理外部传入的 ref
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && "current" in ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [ref, contentRef]
  );

  React.useLayoutEffect(() => {
    if (open) {
      // 同步查找并设置 trigger 引用，然后立即获取位置
      const trigger = document.querySelector(
        '[aria-expanded="true"]'
      ) as HTMLElement;
      if (trigger) {
        triggerRef.current = trigger;
        // 立即获取位置，避免延迟
        setTriggerRect(trigger.getBoundingClientRect());
      }
    } else {
      setTriggerRect(null);
    }
  }, [open]);

  if (!open || !triggerRect) return null;

  const getPosition = () => {
    let left = triggerRect.left;
    let top = triggerRect.bottom + sideOffset;

    if (align === "center") {
      left = triggerRect.left + triggerRect.width / 2;
    } else if (align === "end") {
      left = triggerRect.right;
    }

    return { left, top };
  };

  const { left, top } = getPosition();

  const dropdownContent = (
    <div
      ref={mergedRef}
      className={cn(
        "fixed z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
      style={{
        left: align === "center" ? left : align === "end" ? left - 192 : left,
        top,
        transform: align === "center" ? "translateX(-50%)" : "none",
      }}
      {...props}
    >
      {children}
    </div>
  );

  return typeof window !== "undefined"
    ? createPortal(dropdownContent, document.body)
    : null;
});
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    disabled?: boolean;
  }
>(({ className, children, disabled, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownMenuContext);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        disabled
          ? "pointer-events-none opacity-50"
          : "hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={(e) => {
        if (!disabled) {
          setOpen(false);
          props.onClick?.(e);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
