"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, type JSX, memo, useMemo, useRef } from "react";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Citation {
  id: number;
  url: string;
  title: string;
  snippet?: string;
  thumbnail?: string;
}

type ResponseProps = ComponentProps<typeof Streamdown> & {
  citations?: Citation[];
  onCitationClick?: (id: number) => void;
};

export const Response = memo(
  ({
    className,
    citations = [],
    onCitationClick,
    children,
    ...props
  }: ResponseProps) => {
    // 使用 useRef 来跟踪唯一 key 计数器
    const keyCounterRef = useRef(0);

    const processTextWithCitations = (
      text: string,
      baseKey: string = ""
    ): (string | JSX.Element)[] => {
      if (!text) {
        return [text];
      }

      // 检测是否包含引用格式
      if (!text.includes("[citation:")) {
        return [text];
      }

      // 匹配 [citation:2] 格式
      const parts = text.split(/(\[citation:\d+\])/g);

      return parts
        .map((part, index) => {
          const citationMatch = part.match(/\[citation:(\d+)\]/);

          if (citationMatch) {
            const citationId = parseInt(citationMatch[1]);

            if (citationId) {
              keyCounterRef.current++;
              const citation = citations.find((c) => c.id === citationId);

              const badgeElement = (
                <Badge
                  key={`citation-${citationId}-${baseKey}-${index}-${keyCounterRef.current}`}
                  variant="outline"
                  className="mx-1 cursor-pointer hover:bg-accent transition-colors text-xs inline-flex items-center"
                  onClick={() => onCitationClick?.(citationId)}
                >
                  {citationId}
                </Badge>
              );

              // 如果找到引用数据，包裹 Tooltip
              if (citation) {
                return (
                  <Tooltip
                    key={`tooltip-${citationId}-${baseKey}-${index}-${keyCounterRef.current}`}
                  >
                    <TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={8}
                      className="max-w-sm p-3 space-y-2 bg-popover text-popover-foreground border border-border shadow-lg [&>svg]:hidden"
                    >
                      <div className="font-semibold text-sm line-clamp-2">
                        {citation.title}
                      </div>
                      {citation.snippet && (
                        <div className="text-xs text-muted-foreground line-clamp-3">
                          {citation.snippet}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate opacity-70">
                        {new URL(citation.url).hostname}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return badgeElement;
            }

            keyCounterRef.current++;
            return (
              <span
                key={`invalid-citation-${baseKey}-${index}-${keyCounterRef.current}`}
              >
                {part}
              </span>
            );
          }

          return part;
        })
        .filter((part) => part !== "");
    };

    const processChildren = (children: any, baseKey: string = ""): any => {
      if (typeof children === "string") {
        return processTextWithCitations(children, baseKey);
      }

      if (Array.isArray(children)) {
        return children
          .map((child, idx) => {
            if (typeof child === "string") {
              return processTextWithCitations(child, `${baseKey}-${idx}`);
            }
            return child;
          })
          .flat();
      }

      return children;
    };

    const CustomParagraph = ({ children, ...pProps }: any) => {
      const processedContent = processChildren(children, "p");
      return <p {...pProps}>{processedContent}</p>;
    };

    const CustomText = ({ children, ...textProps }: any) => {
      const processedContent = processChildren(children, "span");
      return <span {...textProps}>{processedContent}</span>;
    };

    const CustomStrong = ({ children, ...strongProps }: any) => {
      const processedContent = processChildren(children, "strong");
      return <strong {...strongProps}>{processedContent}</strong>;
    };

    const CustomEm = ({ children, ...emProps }: any) => {
      const processedContent = processChildren(children, "em");
      return <em {...emProps}>{processedContent}</em>;
    };

    const customComponents = useMemo(
      () => ({
        p: CustomParagraph,
        span: CustomText,
        strong: CustomStrong,
        em: CustomEm,
        div: ({ children, ...divProps }: any) => {
          const processedContent = processChildren(children, "div");
          return <div {...divProps}>{processedContent}</div>;
        },
        text: ({ children }: any) => {
          const processedContent = processChildren(children, "text");
          return <>{processedContent}</>;
        },
      }),
      [citations, onCitationClick]
    );

    return (
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
        components={customComponents}
        {...props}
      >
        {children}
      </Streamdown>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    JSON.stringify(prevProps.citations) === JSON.stringify(nextProps.citations)
);

Response.displayName = "Response";
