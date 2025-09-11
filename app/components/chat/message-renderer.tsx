"use client";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Weather, WeatherProps } from "../../tools/Weather";
import { Loader } from "@/components/ai-elements/loader";
import type { ChatRequestOptions } from "@ai-sdk/react";

interface MessageRendererProps {
  messages: any[];
  status: string;
}

export function MessageRenderer({ messages, status }: MessageRendererProps) {
  return (
    <>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "assistant" && (
            <Sources>
              {message.parts.map((part: any, i: number) => {
                switch (part.type) {
                  case "source-url":
                    return (
                      <>
                        <SourcesTrigger
                          count={
                            message.parts.filter(
                              (part: any) => part.type === "source-url"
                            ).length
                          }
                        />
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            key={`${message.id}-${i}`}
                            href={part.url}
                            title={part.url}
                          />
                        </SourcesContent>
                      </>
                    );
                }
              })}
            </Sources>
          )}
          <Message from={message.role} key={message.id}>
            <MessageContent>
              {message.parts.map((part: any, i: number) => {
                switch (part.type) {
                  case "text":
                    return (
                      <Response
                        key={`${message.id}-${i}`}
                        shikiTheme="github-dark"
                        className="markdown"
                      >
                        {part.text}
                      </Response>
                    );
                  case "tool-weather":
                    return (
                      <Weather
                        key={`${message.id}-${i}`}
                        {...(part.output as WeatherProps)}
                      />
                    );
                  case "reasoning":
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={status === "streaming"}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>
                          {part.text}
                        </ReasoningContent>
                      </Reasoning>
                    );
                  default:
                    return null;
                }
              })}
            </MessageContent>
          </Message>
        </div>
      ))}
      {status === "submitted" && <Loader />}
    </>
  );
}