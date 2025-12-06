import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "@/components/ai-elements/task";
import { ThinkingGroup } from "./utils";

interface ThinkingRendererProps {
  group: ThinkingGroup;
  messageId: string;
  groupKey: string;
  shouldOpen: boolean;
}

export function ThinkingRenderer({
  group,
  messageId,
  groupKey,
  shouldOpen,
}: ThinkingRendererProps) {
  if (group.type === "chain-of-thought") {
    return (
      <ChainOfThought key={`${messageId}-${groupKey}`} defaultOpen={shouldOpen}>
        <ChainOfThoughtHeader>{group.title}</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          {group.steps.map((step) => (
            <ChainOfThoughtStep
              key={`${messageId}-${step.id}`}
              label={step.label}
              description={step.description}
              status={step.status}
            >
              {step.searchResults && step.searchResults.length > 0 && (
                <ChainOfThoughtSearchResults>
                  {step.searchResults.map((result, idx) => (
                    <ChainOfThoughtSearchResult
                      key={`${step.id}-result-${idx}`}
                      onClick={
                        result.url
                          ? () => window.open(result.url, "_blank")
                          : undefined
                      }
                    >
                      {result.title}
                    </ChainOfThoughtSearchResult>
                  ))}
                </ChainOfThoughtSearchResults>
              )}
            </ChainOfThoughtStep>
          ))}
        </ChainOfThoughtContent>
      </ChainOfThought>
    );
  }

  if (group.type === "task") {
    return (
      <Task key={`${messageId}-${groupKey}`} defaultOpen={shouldOpen}>
        <TaskTrigger title={group.title} />
        <TaskContent>
          {group.steps.map((step) => (
            <TaskItem key={`${messageId}-${step.id}`}>
              {step.label}
              {step.files && step.files.length > 0 && (
                <div className="mt-1 flex gap-2">
                  {step.files.map((file, idx) => (
                    <TaskItemFile key={`${step.id}-file-${idx}`}>
                      {file}
                    </TaskItemFile>
                  ))}
                </div>
              )}
            </TaskItem>
          ))}
        </TaskContent>
      </Task>
    );
  }

  return null;
}
