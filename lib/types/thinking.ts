/**
 * 思维链和任务的类型定义
 */

/**
 * 思维链步骤状态
 */
export type ChainOfThoughtStepStatus = "pending" | "active" | "complete";

/**
 * 思维链步骤
 */
export interface ChainOfThoughtStep {
  id: string;
  label: string;
  description?: string;
  status: ChainOfThoughtStepStatus;
  searchResults?: Array<{
    title: string;
    url?: string;
  }>;
  images?: Array<{
    url: string;
    caption?: string;
  }>;
}

/**
 * 思维链数据
 */
export interface ChainOfThoughtData {
  type: "chain-of-thought";
  title?: string;
  steps: ChainOfThoughtStep[];
  isOpen?: boolean;
}

/**
 * 任务项
 */
export interface TaskItem {
  id: string;
  content: string;
  files?: string[];
}

/**
 * 任务数据
 */
export interface TaskData {
  type: "task";
  title: string;
  items: TaskItem[];
  isOpen?: boolean;
}

/**
 * 思维模式类型
 */
export type ThinkingMode = "chain-of-thought" | "task" | "none";

/**
 * 思维数据联合类型
 */
export type ThinkingData = ChainOfThoughtData | TaskData;

/**
 * 判断是否为思维链数据
 */
export function isChainOfThoughtData(data: any): data is ChainOfThoughtData {
  return data?.type === "chain-of-thought" && Array.isArray(data.steps);
}

/**
 * 判断是否为任务数据
 */
export function isTaskData(data: any): data is TaskData {
  return data?.type === "task" && Array.isArray(data.items);
}

/**
 * 判断是否为思维数据
 */
export function isThinkingData(data: any): data is ThinkingData {
  return isChainOfThoughtData(data) || isTaskData(data);
}

