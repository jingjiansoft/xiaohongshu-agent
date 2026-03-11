/**
 * 后端 API 服务器
 * 提供 REST API 供 Web 界面调用
 */

import express from 'express';
import cors from 'cors';
import { XiaohongshuAgent } from './agent.js';
import { modelConfigManager } from './config/model-config.js';
import modelConfigRouter from './routes/model-config.js';
import loginRouter from './routes/login.js';
import conversationRouter from './routes/conversation.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
// CORS 配置：仅允许本地开发环境
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost:3000', 'http://127.0.0.1:3000']
    : true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// 模型配置路由
app.use('/api/model-config', modelConfigRouter);

// 登录状态路由
app.use('/api/login', loginRouter);

// 对话路由
app.use('/api/conversation', conversationRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取模型配置（兼容旧版）
app.get('/api/config', async (req, res) => {
  try {
    const config = await modelConfigManager.getOrDefault();
    res.json({ success: true, data: config });
  } catch (error) {
    logger.error('获取配置失败', { error: (error as Error).message });
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

// 生成内容
app.post('/api/generate', async (req, res) => {
  try {
    logger.info('收到生成请求', { topic: req.body.topic });

    const { topic, style, keywords, imageCount } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: '主题不能为空' });
    }

    // 从配置管理器加载模型配置
    const modelConfig = await modelConfigManager.getOrDefault();

    if (!modelConfig.textApiKey) {
      return res.status(400).json({ 
        success: false, 
        error: '请先配置模型 API Key',
        needConfig: true 
      });
    }

    // 创建 Agent 实例
    const agent = new XiaohongshuAgent({
      textProvider: modelConfig.textProvider,
      textApiKey: modelConfig.textApiKey,
      imageProvider: modelConfig.imageProvider,
      imageApiKey: modelConfig.imageApiKey || modelConfig.textApiKey,
      autoPublish: false,
    });

    // 初始化并生成内容
    await agent.initialize();
    const result = await agent.generateContent({
      topic,
      style,
      keywords,
      imageCount: imageCount || 3,
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    logger.info('内容生成成功', { title: result.content?.title });
    res.json(result);
  } catch (error) {
    logger.error('生成失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// 发布内容
app.post('/api/publish', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: '内容不能为空' });
    }

    logger.info('收到发布请求', {
      title: content?.title,
      contentLength: content?.content?.length,
      topicsCount: content?.topics?.length,
      imagesCount: content?.images?.length,
    });

    // 从配置管理器加载模型配置
    const modelConfig = await modelConfigManager.getOrDefault();

    if (!modelConfig.textApiKey) {
      return res.status(400).json({
        success: false,
        error: '请先配置模型 API Key',
        needConfig: true
      });
    }

    // 创建 Agent 实例（启用自动发布）
    const agent = new XiaohongshuAgent({
      textProvider: modelConfig.textProvider,
      textApiKey: modelConfig.textApiKey,
      imageProvider: modelConfig.imageProvider,
      imageApiKey: modelConfig.imageApiKey || modelConfig.textApiKey,
      autoPublish: true,
    });

    // 初始化并发布
    await agent.initialize();
    const result = await agent.publishContent({
      title: content.title,
      content: content.content,
      topics: content.topics,
      images: content.images,
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    logger.info('发布成功', { noteUrl: (result as any).noteUrl });
    res.json(result);
  } catch (error) {
    logger.error('发布失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`🚀 API 服务器已启动`, { port: PORT });
  console.log(`📡 API 服务运行在 http://localhost:${PORT}`);
});