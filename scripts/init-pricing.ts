import { prisma } from '../lib/prisma';
import { Decimal } from '../lib/generated/prisma/runtime/library';

const defaultPricingRules = [
  {
    provider: 'deepseek',
    modelName: 'deepseek-chat',
    inputTokenPrice: new Decimal('0.0014'),
    outputTokenPrice: new Decimal('0.0028'),
    basePrice: null,
  },
  {
    provider: 'deepseek',
    modelName: 'deepseek-coder',
    inputTokenPrice: new Decimal('0.0014'),
    outputTokenPrice: new Decimal('0.0028'),
    basePrice: null,
  },
  {
    provider: 'openai',
    modelName: 'gpt-4o',
    inputTokenPrice: new Decimal('0.03'),
    outputTokenPrice: new Decimal('0.06'),
    basePrice: null,
  },
  {
    provider: 'openai',
    modelName: 'gpt-4o-mini',
    inputTokenPrice: new Decimal('0.0015'),
    outputTokenPrice: new Decimal('0.006'),
    basePrice: null,
  },
  {
    provider: 'anthropic',
    modelName: 'claude-3-5-sonnet',
    inputTokenPrice: new Decimal('0.015'),
    outputTokenPrice: new Decimal('0.075'),
    basePrice: null,
  },
];

async function initializePricing() {
  try {
    console.log('Initializing pricing rules...');

    for (const rule of defaultPricingRules) {
      const existing = await prisma.pricingRule.findFirst({
        where: {
          provider: rule.provider,
          modelName: rule.modelName,
          isActive: true
        }
      });

      if (!existing) {
        await prisma.pricingRule.create({
          data: rule
        });
        console.log(`Created pricing rule for ${rule.provider}/${rule.modelName}`);
      } else {
        console.log(`Pricing rule already exists for ${rule.provider}/${rule.modelName}`);
      }
    }

    console.log('✅ Pricing initialization completed');
  } catch (error) {
    console.error('❌ Error initializing pricing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initializePricing();