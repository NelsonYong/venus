import { prisma } from '../lib/prisma';

async function checkBillingData() {
  try {
    console.log('🔍 检查计费相关数据...\n');

    // 检查用户计费信息
    const userBillingCount = await prisma.userBilling.count();
    console.log(`👤 UserBilling 记录数: ${userBillingCount}`);

    if (userBillingCount > 0) {
      const userBilling = await prisma.userBilling.findMany({
        take: 3
      });
      console.log('📋 UserBilling 示例数据:');
      userBilling.forEach(billing => {
        console.log(`  - 用户 ${billing.userId}: 余额 $${billing.credits}, 套餐 ${billing.plan}`);
      });
    }

    // 检查定价规则
    const pricingRuleCount = await prisma.pricingRule.count();
    console.log(`\n💰 PricingRule 记录数: ${pricingRuleCount}`);

    if (pricingRuleCount > 0) {
      const pricingRules = await prisma.pricingRule.findMany({
        take: 5
      });
      console.log('📋 PricingRule 示例数据:');
      pricingRules.forEach(rule => {
        console.log(`  - ${rule.provider}/${rule.modelName}: 输入 $${rule.inputTokenPrice}/1k, 输出 $${rule.outputTokenPrice}/1k`);
      });
    }

    // 检查使用记录
    const usageRecordCount = await prisma.usageRecord.count();
    console.log(`\n📊 UsageRecord 记录数: ${usageRecordCount}`);

    if (usageRecordCount > 0) {
      const usageRecords = await prisma.usageRecord.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
      });
      console.log('📋 最新的 UsageRecord:');
      usageRecords.forEach(record => {
        console.log(`  - ${record.modelName}: ${record.totalTokens} tokens, 成本 $${record.totalCost}`);
      });
    }

    // 检查计费记录
    const billingRecordCount = await prisma.billingRecord.count();
    console.log(`\n💳 BillingRecord 记录数: ${billingRecordCount}`);

    if (billingRecordCount > 0) {
      const billingRecords = await prisma.billingRecord.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
      });
      console.log('📋 最新的 BillingRecord:');
      billingRecords.forEach(record => {
        console.log(`  - ${record.type}: $${record.amount}, 状态: ${record.status}`);
      });
    }

    // 检查现有用户
    const userCount = await prisma.user.count();
    console.log(`\n👥 总用户数: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          email: true
        }
      });
      console.log('📋 用户示例:');
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email})`);
      });
    }

  } catch (error) {
    console.error('❌ 检查数据时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBillingData();