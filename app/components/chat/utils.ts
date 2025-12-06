/**
 * Utility functions for message rendering
 */

// Parse HTML/SVG/Markdown code blocks from markdown text
export function parseHtmlCodeBlocks(text: string): Array<{
  type: "text" | "html" | "svg" | "markdown";
  content: string;
  id?: string;
  filename?: string;
}> {
  const blocks: Array<{
    type: "text" | "html" | "svg" | "markdown";
    content: string;
    id?: string;
    filename?: string;
  }> = [];

  // Regex to match ```html:filename.html, ```svg:icon.svg, or ```markdown:guide.md code blocks
  // Also supports ```html, ```svg, ```markdown without filename
  const regex = /```(html|svg|markdown|md)(?::([^\n]+))?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim();
      if (textContent) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    // Add the HTML/SVG/Markdown code block
    let blockType = match[1] as "html" | "svg" | "markdown" | "md";
    // Normalize 'md' to 'markdown'
    if (blockType === "md") {
      blockType = "markdown";
    }
    const filename = match[2]?.trim(); // Extract filename if present
    const blockContent = match[3].trim();
    blocks.push({
      type: blockType as "html" | "svg" | "markdown",
      content: blockContent,
      filename: filename,
      id: `${blockType}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text after the last code block
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex).trim();
    if (textContent) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  // If no code blocks found, return the entire text
  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: "text", content: text });
  }

  return blocks;
}

export interface ThinkingGroup {
  type: "chain-of-thought" | "task";
  title: string;
  steps: Array<{
    id: string;
    label: string;
    description?: string;
    status: string;
    searchResults?: Array<{ title: string; url?: string }>;
    files?: string[];
  }>;
  firstIndex: number;
  partIndices: number[];
}

// Aggregate thinking step tool calls
export function aggregateThinkingSteps(
  parts: any[]
): Map<string, ThinkingGroup> {
  const thinkingGroups = new Map<string, ThinkingGroup>();

  parts.forEach((part, index) => {
    // Identify thinkingStep tool calls
    if (
      part.type === "tool-thinkingStep" ||
      (part.type === "tool-call" && part.toolName === "thinkingStep")
    ) {
      const input = part.input || part.args;
      if (input && input.title) {
        const key = `${input.stepType}-${input.title}`;

        if (!thinkingGroups.has(key)) {
          thinkingGroups.set(key, {
            type: input.stepType,
            title: input.title,
            steps: [],
            firstIndex: index,
            partIndices: [],
          });
        }

        const group = thinkingGroups.get(key)!;

        // Check if step with same stepId already exists
        const existingStepIndex = group.steps.findIndex(
          (step: any) => step.id === input.stepId
        );

        const stepData = {
          id: input.stepId,
          label: input.label,
          description: input.description,
          status: input.status,
          searchResults: input.searchResults,
          files: input.files,
        };

        if (existingStepIndex >= 0) {
          // Update existing step (status might have changed)
          group.steps[existingStepIndex] = stepData;
        } else {
          // Add new step
          group.steps.push(stepData);
        }

        group.partIndices.push(index);
      }
    }
  });

  return thinkingGroups;
}

// Check if thinking group is complete
export function isThinkingGroupComplete(group: ThinkingGroup): boolean {
  return group.steps.every((step: any) => step.status === "complete");
}
