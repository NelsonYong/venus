import { billingService } from '@/lib/billing';
import { UIMessage } from 'ai';

interface BillingCheckOptions {
  userId: string;
  messages: UIMessage[];
  provider: string;
  modelName: string;
}

/**
 * Check if user can proceed with the request based on billing limits
 */
export async function checkBillingLimit(options: BillingCheckOptions) {
  const { userId, messages, provider, modelName } = options;

  const estimatedInputTokens = messages.reduce((acc, msg) => {
    const content = JSON.stringify(msg);
    return acc + (content.length / 4);
  }, 0);
  const estimatedOutputTokens = 1000;

  const estimatedCost = await billingService.calculateCost(
    provider,
    modelName,
    {
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      totalTokens: estimatedInputTokens + estimatedOutputTokens
    }
  );

  const usageCheck = await billingService.checkUsageLimit(userId, estimatedCost.totalCost);

  return usageCheck;
}

interface RecordUsageOptions {
  userId: string;
  conversationId?: string;
  provider: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  startTime: number;
  messageCount: number;
  finishReason?: string;
  usage?: any;
}

/**
 * Record billing usage after completion
 */
export async function recordBillingUsage(options: RecordUsageOptions) {
  const {
    userId,
    conversationId,
    provider,
    modelName,
    promptTokens,
    completionTokens,
    startTime,
    messageCount,
    finishReason,
    usage
  } = options;

  const actualUsage = {
    inputTokens: promptTokens,
    outputTokens: completionTokens,
    totalTokens: promptTokens + completionTokens
  };

  const actualCost = await billingService.calculateCost(
    provider,
    modelName,
    actualUsage
  );

  await billingService.recordUsage({
    userId,
    conversationId,
    modelName,
    provider,
    usage: actualUsage,
    cost: actualCost,
    endpoint: '/api/chat',
    requestDuration: Date.now() - startTime,
    requestMetadata: {
      messageCount,
      hasTools: true,
      system: 'You are a helpful assistant. output in markdown format.'
    },
    responseMetadata: {
      finishReason,
      usage
    }
  });
}
