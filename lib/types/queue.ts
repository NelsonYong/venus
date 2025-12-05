/**
 * Queue message types for AI-generated task lists and todo items
 */

/**
 * Status of a queue item/todo
 */
export type QueueItemStatus = "pending" | "in_progress" | "completed" | "failed";

/**
 * Single todo/task item in a queue
 */
export interface QueueTodoItem {
  /** Unique identifier for the todo item */
  id: string;
  /** Title/main text of the todo item */
  title: string;
  /** Optional detailed description */
  description?: string;
  /** Current status of the todo */
  status: QueueItemStatus;
  /** Optional metadata like timestamps, tags, etc */
  metadata?: {
    createdAt?: number;
    updatedAt?: number;
    priority?: "low" | "medium" | "high";
    [key: string]: any;
  };
}

/**
 * Queue section for grouping related todos
 */
export interface QueueSection {
  /** Unique identifier for the section */
  id: string;
  /** Section title/label */
  label: string;
  /** Icon name or component identifier */
  icon?: string;
  /** Items in this section */
  items: QueueTodoItem[];
  /** Whether the section is open by default */
  defaultOpen?: boolean;
}

/**
 * Complete queue data structure
 */
export interface QueueData {
  /** Unique identifier for the queue */
  id: string;
  /** Queue title */
  title?: string;
  /** Flat list of todos (simpler structure) */
  todos?: QueueTodoItem[];
  /** Or grouped sections (more organized) */
  sections?: QueueSection[];
  /** Metadata for the entire queue */
  metadata?: {
    createdAt?: number;
    updatedAt?: number;
    totalItems?: number;
    completedItems?: number;
    [key: string]: any;
  };
}

/**
 * Message part type for queue data
 * This extends the standard message part types
 */
export interface QueueMessagePart {
  type: "queue";
  /** Queue data payload */
  queue: QueueData;
}

/**
 * Helper type guards
 */
export function isQueueMessagePart(part: any): part is QueueMessagePart {
  return part && part.type === "queue" && part.queue;
}

export function isQueueData(data: any): data is QueueData {
  return (
    data &&
    typeof data === "object" &&
    data.id &&
    (Array.isArray(data.todos) || Array.isArray(data.sections))
  );
}
