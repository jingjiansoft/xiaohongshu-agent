#!/usr/bin/env node
/**
 * 系统健康检查脚本
 * 验证所有关键组件是否正常工作
 */

import { UnifiedStorage } from './data/unified-storage.js';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { XiaohongshuAgent } from './agent.js';
import { logger } from './utils/logger.js';

async function healthCheck() {
  console.log('🔍 开始系统健康检查...\n');

  const checks = {
    '环境变量': false,
    'SQLite 数据库': false,
    'Agent 初始化': false,
  };

  // 1. 检查环境变量
  console.log('1️⃣  检查环境变量...');
  const textApiKey = process.env.TEXT_API_KEY;
  const imageApiKey = process.env.IMAGE_API_KEY || textApiKey;

  if (textApiKey && textApiKey !== 'your_qwen_api_key_here') {
    console.log('   ✅ TEXT_API_KEY 已配置');
    checks['环境变量'] = true;
  } else {
    console.log('   ❌ TEXT_API_KEY 未配置或为默认值');
  }

  // 2. 检查 SQLite 数据库
  console.log('\n2️⃣  检查 SQLite 数据库...');
  try {
    const storage = UnifiedStorage.getInstance();
    const config = storage.getSetting('model_config');
    const cookies = storage.getCookies();

    console.log('   ✅ SQLite 数据库连接正常');

    if (config) {
      console.log('   ✅ 模型配置已设置（SQLite）');
    } else {
      console.log('   ⚠️  模型配置未设置，请访问 Web 界面配置');
    }

    if (cookies) {
      console.log('   ✅ Cookie 已保存（SQLite）');
      checks['SQLite 数据库'] = true;
    } else {
      console.log('   ⚠️  Cookie 未保存，请运行 npm run test:login');
      checks['SQLite 数据库'] = true; // 数据库正常，只是没有数据
    }
  } catch (error) {
    console.log('   ❌ SQLite 数据库检查失败:', (error as Error).message);
  }

  // 3. 测试 Agent 初始化
  console.log('\n3️⃣  测试 Agent 初始化...');
  if (textApiKey && textApiKey !== 'your_qwen_api_key_here') {
    try {
      const agent = new XiaohongshuAgent({
        textProvider: 'qwen',
        textApiKey,
        imageProvider: 'qwen',
        imageApiKey: imageApiKey || textApiKey,
        autoPublish: false,
      });

      await agent.initialize();
      console.log('   ✅ Agent 初始化成功');
      checks['Agent 初始化'] = true;
    } catch (error) {
      console.log('   ❌ Agent 初始化失败:', (error as Error).message);
    }
  } else {
    console.log('   ⏭️  跳过（需要配置 API Key）');
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 检查结果：');
  Object.entries(checks).forEach(([name, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${name}`);
  });

  const allPassed = Object.values(checks).every(v => v);

  if (allPassed) {
    console.log('\n✅ 所有检查通过！系统可以正常运行');
    console.log('\n📝 下一步：');
    console.log('   1. 启动后端 API: npm run server');
    console.log('   2. 启动 Web 界面：cd packages/web && npm run dev');
    console.log('   3. 访问配置页面：http://localhost:3000/settings');
  } else {
    console.log('\n⚠️  部分检查未通过，请先修复以上问题');
  }

  process.exit(allPassed ? 0 : 1);
}

// 运行检查
healthCheck().catch(error => {
  console.error('❌ 检查过程出错:', error.message);
  logger.error('健康检查失败', { error: error.message });
  process.exit(1);
});
