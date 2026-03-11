#!/usr/bin/env node
/**
 * 系统健康检查脚本
 * 验证所有关键组件是否正常工作
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { XiaohongshuAgent } from './agent.js';
import { logger } from './utils/logger.js';

async function healthCheck() {
  console.log('🔍 开始系统健康检查...\n');

  const checks = {
    '配置文件': false,
    'Cookie 文件': false,
    '环境变量': false,
    'Agent 初始化': false,
  };

  // 1. 检查配置文件
  console.log('1️⃣  检查配置文件...');
  if (existsSync(resolve(process.cwd(), '.env'))) {
    console.log('   ✅ .env 文件存在');
    checks['配置文件'] = true;
  } else {
    console.log('   ❌ .env 文件不存在，请复制 .env.example 并填写 API Key');
  }

  // 2. 检查 Cookie 文件
  console.log('\n2️⃣  检查 Cookie 文件...');
  const cookiePath = resolve(process.cwd(), 'config/cookies.json');
  if (existsSync(cookiePath)) {
    console.log('   ✅ Cookie 文件存在');
    checks['Cookie 文件'] = true;
  } else {
    console.log('   ❌ Cookie 文件不存在，请运行 npm run test:login');
  }

  // 3. 检查环境变量
  console.log('\n3️⃣  检查环境变量...');
  const textApiKey = process.env.TEXT_API_KEY;
  const imageApiKey = process.env.IMAGE_API_KEY || textApiKey;
  
  if (textApiKey && textApiKey !== 'your_qwen_api_key_here') {
    console.log('   ✅ TEXT_API_KEY 已配置');
    checks['环境变量'] = true;
  } else {
    console.log('   ❌ TEXT_API_KEY 未配置或为默认值');
  }

  // 4. 测试 Agent 初始化
  console.log('\n4️⃣  测试 Agent 初始化...');
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
    console.log('   2. 启动 Web 界面：cd web && npm run dev');
  } else {
    console.log('\n⚠️  部分检查未通过，请先修复以上问题');
    console.log('\n📖 详细文档请查看：CHECKLIST.md');
  }

  process.exit(allPassed ? 0 : 1);
}

// 运行检查
healthCheck().catch(error => {
  console.error('❌ 检查过程出错:', error.message);
  logger.error('健康检查失败', { error: error.message });
  process.exit(1);
});