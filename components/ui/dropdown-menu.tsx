"use client";

import * as React from "react";
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

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref && "current" in ref && ref.current && !ref.current.contains(event.target as Node)) {
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
}>({
  open: false,
  setOpen: () => {},
});

const DropdownMenuTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ className, children, asChild = false, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DropdownMenuContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      ...props,
      ref,
      onClick: (e: React.MouseEvent) => {
        setOpen(!open);
        children.props.onClick?.(e);
      },
      "aria-expanded": open,
    });
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
  const { open } = React.useContext(DropdownMenuContext);

  if (!open) return null;

  const alignmentClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        alignmentClasses[align],
        className
      )}
      style={{ top: `calc(100% + ${sideOffset}px)` }}
      {...props}
    >
      {children}
    </div>
  );
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