#!/usr/bin/env node
/**
 * CLI 工具 - 命令行发布小红书笔记
 */

import { Command } from 'commander';
import { XiaohongshuAgent } from './agent.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('xiaohongshu-agent')
  .description('小红书自动发文 CLI 工具')
  .version('1.0.0');

// 发布内容命令
program
  .command('publish')
  .description('生成并发布小红书笔记')
  .requiredOption('-t, --topic <string>', '主题')
  .option('-s, --style <string>', '风格', '生活分享')
  .option('-k, --keywords <string>', '关键词（逗号分隔）')
  .option('-i, --images <number>', '图片数量', '3')
  .option('--no-publish', '只生成不发布')
  .action(async (options) => {
    try {
      console.log(`🚀 开始生成内容：${options.topic}\n`);

      // 从配置文件读取模型配置
      const { modelConfigManager } = await import('./config/model-config.js');
      const modelConfig = await modelConfigManager.getOrDefault();

      if (!modelConfig.textApiKey) {
        console.error('❌ 错误：未配置模型 API Key');
        console.error('\n请先配置模型：');
        console.error('  方式 1: 访问 http://localhost:3000/settings 配置');
        console.error('  方式 2: 编辑 config/model-config.json 文件');
        console.error('  方式 3: 复制 config/model-config.example.json 并填写 API Key\n');
        process.exit(1);
      }

      // 创建 Agent 实例
      const agent = new XiaohongshuAgent({
        textProvider: modelConfig.textProvider,
        textApiKey: modelConfig.textApiKey,
        imageProvider: modelConfig.imageProvider,
        imageApiKey: modelConfig.imageApiKey || modelConfig.textApiKey,
        autoPublish: !options.noPublish,
      });

      // 生成内容
      console.log('📝 生成内容中...');
      const result = await agent.generateContent({
        topic: options.topic,
        style: options.style,
        keywords: options.keywords ? options.keywords.split(',') : [],
        imageCount: parseInt(options.images),
      });

      if (!result.success) {
        console.error('❌ 生成失败:', result.message);
        process.exit(1);
      }

      const content = result.content;
      console.log('\n✅ 生成成功！\n');
      console.log('📍 标题:', content?.title);
      console.log('📄 正文:', content?.content?.substring(0, 200) + '...');
      console.log('🏷️  话题:', content?.topics?.join(' '));
      console.log('🖼️  图片:', content?.images?.length || 0, '张\n');

      // 如果启用发布
      if (!options.noPublish && content) {
        console.log('🚀 开始发布到小红书...');

        const publishResult = await agent.publishContent({
          title: content.title,
          content: content.content,
          topics: content.topics || [],
          images: content.images || [],
        });

        if (publishResult.success) {
          console.log('\n✅ 发布成功！');
          if ((publishResult as any).noteUrl) {
            console.log('🔗 笔记链接:', (publishResult as any).noteUrl);
          }
        } else {
          console.error('\n❌ 发布失败:', publishResult.message);
          process.exit(1);
        }
      } else {
        console.log('ℹ️  跳过发布（使用了 --no-publish 选项）');
      }

      process.exit(0);
    } catch (error) {
      console.error('❌ 执行失败:', (error as Error).message);
      logger.error('CLI 执行失败', { error: (error as Error).message });
      process.exit(1);
    }
  });

// 测试登录命令
program
  .command('login')
  .description('测试小红书登录')
  .action(async () => {
    console.log('🚀 启动登录测试...\n');
    console.log('ℹ️  请使用以下命令：');
    console.log('   npm run test:login\n');
    process.exit(0);
  });

// 健康检查命令
program
  .command('health')
  .description('系统健康检查')
  .action(async () => {
    console.log('🚀 启动健康检查...\n');
    console.log('ℹ️  请使用以下命令：');
    console.log('   npm run health\n');
    process.exit(0);
  });

program.parse();