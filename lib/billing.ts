import { prisma } from './prisma';
import { BillingPlan, BillingType, PaymentStatus } from './generated/prisma';
import { Decimal } from './generated/prisma/runtime/library';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface UsageCalculation {
  inputCost: Decimal;
  outputCost: Decimal;
  totalCost: Decimal;
}

export class BillingService {
  async initializeUserBilling(userId: string) {
    const existingBilling = await prisma.userBilling.findUnique({
      where: { userId }
    });

    if (!existingBilling) {
      return await prisma.userBilling.create({
        data: {
          userId,
          plan: BillingPlan.FREE,
          credits: new Decimal(10.0),
          monthlyLimit: new Decimal(100.0),
          dailyLimit: new Decimal(10.0),
        }
      });
    }

    return existingBilling;
  }

  async getPricingRule(provider: string, modelName: string) {
    return await prisma.pricingRule.findFirst({
      where: {
        provider,
        modelName,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
  }

  async calculateCost(
    provider: string,
    modelName: string,
    usage: TokenUsage
  ): Promise<UsageCalculation> {
    const pricingRule = await this.getPricingRule(provider, modelName);
    
    if (!pricingRule) {
      return {
        inputCost: new Decimal(0),
        outputCost: new Decimal(0),
        totalCost: new Decimal(0)
      };
    }

    const inputCost = pricingRule.inputTokenPrice.mul(usage.inputTokens).div(1000);
    const outputCost = pricingRule.outputTokenPrice.mul(usage.outputTokens).div(1000);
    const totalCost = inputCost.add(outputCost);

    return { inputCost, outputCost, totalCost };
  }

  async checkUsageLimit(userId: string, requiredCost: Decimal): Promise<{
    canProceed: boolean;
    reason?: string;
    userBilling: any;
  }> {
    const userBilling = await prisma.userBilling.findUnique({
      where: { userId }
    });

    if (!userBilling) {
      await this.initializeUserBilling(userId);
      return this.checkUsageLimit(userId, requiredCost);
    }

    if (userBilling.credits.lt(requiredCost)) {
      return {
        canProceed: false,
        reason: 'Insufficient credits',
        userBilling
      };
    }

    if (userBilling.monthlyLimit && 
        userBilling.currentMonthSpent.add(requiredCost).gt(userBilling.monthlyLimit)) {
      return {
        canProceed: false,
        reason: 'Monthly limit exceeded',
        userBilling
      };
    }

    if (userBilling.dailyLimit && 
        userBilling.currentDaySpent.add(requiredCost).gt(userBilling.dailyLimit)) {
      return {
        canProceed: false,
        reason: 'Daily limit exceeded',
        userBilling
      };
    }

    return { canProceed: true, userBilling };
  }

  async recordUsage(data: {
    userId: string;
    conversationId?: string;
    messageId?: string;
    modelName: string;
    provider: string;
    usage: TokenUsage;
    cost: UsageCalculation;
    endpoint: string;
    requestMetadata?: any;
    responseMetadata?: any;
    requestDuration?: number;
  }) {
    const { userId, usage, cost, ...recordData } = data;

    await prisma.$transaction(async (tx) => {
      await tx.usageRecord.create({
        data: {
          ...recordData,
          userId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          inputCost: cost.inputCost,
          outputCost: cost.outputCost,
          totalCost: cost.totalCost,
        }
      });

      await tx.userBilling.update({
        where: { userId },
        data: {
          credits: { decrement: cost.totalCost },
          totalSpent: { increment: cost.totalCost },
          currentMonthSpent: { increment: cost.totalCost },
          currentDaySpent: { increment: cost.totalCost },
          updatedAt: new Date(),
        }
      });

      await tx.billingRecord.create({
        data: {
          userId,
          type: BillingType.CHARGE,
          amount: cost.totalCost,
          description: `Model usage: ${recordData.modelName}`,
          status: PaymentStatus.COMPLETED,
          metadata: {
            modelName: recordData.modelName,
            provider: recordData.provider,
            tokens: usage as any,
            conversationId: recordData.conversationId,
            messageId: recordData.messageId,
          }
        }
      });
    });
  }

  async resetDailyUsage() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.userBilling.updateMany({
      where: {
        lastResetDate: {
          lt: today
        }
      },
      data: {
        currentDaySpent: new Decimal(0),
        lastResetDate: new Date(),
      }
    });
  }

  async resetMonthlyUsage() {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    await prisma.userBilling.updateMany({
      where: {
        OR: [
          { billingCycle: null },
          { billingCycle: { lt: firstOfMonth } }
        ]
      },
      data: {
        currentMonthSpent: new Decimal(0),
        billingCycle: new Date(),
      }
    });
  }

  async addCredits(userId: string, amount: Decimal, description: string) {
    await prisma.$transaction(async (tx) => {
      await tx.userBilling.update({
        where: { userId },
        data: {
          credits: { increment: amount }
        }
      });

      await tx.billingRecord.create({
        data: {
          userId,
          type: BillingType.CREDIT,
          amount,
          description,
          status: PaymentStatus.COMPLETED,
        }
      });
    });
  }

  async getUserBillingInfo(userId: string) {
    const userBilling = await prisma.userBilling.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!userBilling) {
      return await this.initializeUserBilling(userId);
    }

    return userBilling;
  }

  async getUserUsageStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await prisma.usageRecord.groupBy({
      by: ['modelName', 'provider'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        totalCost: true,
      },
      _count: {
        id: true
      }
    });
  }
}

export const billingService = new BillingService();