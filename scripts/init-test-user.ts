import { prisma } from '../lib/prisma';
import { billingService } from '../lib/billing';
import { Decimal } from '../lib/generated/prisma/runtime/library';

async function initTestUser() {
  try {
    console.log('🚀 初始化测试用户计费信息...\n');

    // 查找现有用户
    const existingUser = await prisma.user.findFirst();
    
    if (!existingUser) {
      console.log('❌ 没有找到用户，请先创建用户账户');
      return;
    }

    console.log(`👤 找到用户: ${existingUser.name} (${existingUser.email})`);

    // 初始化计费信息
    const billingInfo = await billingService.initializeUserBilling(existingUser.id);
    console.log(`✅ 初始化计费信息完成`);
    console.log(`   - 计划: ${billingInfo.plan}`);
    console.log(`   - 余额: $${billingInfo.credits}`);
    console.log(`   - 月限额: $${billingInfo.monthlyLimit || 'N/A'}`);
    console.log(`   - 日限额: $${billingInfo.dailyLimit || 'N/A'}`);

    // 添加一些测试积分
    await billingService.addCredits(
      existingUser.id,
      new Decimal(50),
      '测试充值 - 初始化账户'
    );

    console.log(`💰 添加了 $50 测试积分`);

    // 查看最终状态
    const finalBilling = await billingService.getUserBillingInfo(existingUser.id);
    console.log(`\n📊 最终账户状态:`);
    console.log(`   - 当前余额: $${finalBilling.credits}`);
    console.log(`   - 总消费: $${finalBilling.totalSpent}`);
    console.log(`   - 本月消费: $${finalBilling.currentMonthSpent}`);
    console.log(`   - 今日消费: $${finalBilling.currentDaySpent}`);

    console.log(`\n✅ 测试用户初始化完成! 现在可以测试聊天计费功能了。`);

  } catch (error) {
    console.error('❌ 初始化测试用户时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initTestUser();