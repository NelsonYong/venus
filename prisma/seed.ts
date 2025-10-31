import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('开始种子数据...');

  // 添加 DeepSeek V3 预设模型
  const deepseekV3 = await prisma.aiModel.upsert({
    where: {
      provider_name: {
        provider: 'deepseek',
        name: 'deepseek-chat',
      },
    },
    update: {
      isPreset: true,
      isActive: true,
      displayName: 'DeepSeek V3',
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      description: 'DeepSeek V3 - 高性能的中文大语言模型',
      priority: 100,
    },
    create: {
      name: 'deepseek-chat',
      displayName: 'DeepSeek V3',
      provider: 'deepseek',
      modelType: 'TEXT',
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      apiKey: 'preset-model',
      apiKeyName: 'Authorization',
      isActive: true,
      isPreset: true,
      isDefault: true,
      description: 'DeepSeek V3 - 高性能的中文大语言模型',
      priority: 100,
      maxTokens: 8192,
      cost: {
        inputTokenPrice: 0.0,
        outputTokenPrice: 0.0,
      },
      tags: ['chat', 'chinese', 'preset'],
    },
  });

  console.log('✅ DeepSeek V3 预设模型已创建/更新:', deepseekV3.id);

  console.log('种子数据完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
