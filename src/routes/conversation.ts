/**
 * 对话 API 路由
 */

import { Router, Request, Response } from 'express';
import { ConversationManager } from '../conversation/conversation-manager.js';
import { RequirementExtractor } from '../conversation/requirement-extractor.js';
import { readinessChecker, sessionStore } from '../conversation/index.js';
import { Message } from '../conversation/types.js';
import { ModelAdapterFactory } from '../adapters/index.js';
import { modelConfigManager } from '../config/model-config.js';
import { Orchestrator } from '../core/orchestrator.js';
import { logger } from '../utils/logger.js';

const router = Router();

// 创建对话管理器实例
let conversationManager: ConversationManager | null = null;
let orchestrator: Orchestrator | null = null;

async function getConversationManager(): Promise<ConversationManager> {
  if (!conversationManager) {
    const modelConfig = await modelConfigManager.getOrDefault();
    const textAdapter = ModelAdapterFactory.createTextAdapter(modelConfig.textProvider, {
      name: modelConfig.textProvider,
      apiKey: modelConfig.textApiKey,
    });
    const extractor = new RequirementExtractor(textAdapter);
    conversationManager = new ConversationManager(
      sessionStore,
      extractor,
      readinessChecker,
      textAdapter
    );
  }
  return conversationManager;
}

async function getOrchestrator(): Promise<Orchestrator> {
  if (!orchestrator) {
    const modelConfig = await modelConfigManager.getOrDefault();

    // 创建适配器
    const textAdapter = ModelAdapterFactory.createTextAdapter(modelConfig.textProvider, {
      name: modelConfig.textProvider,
      apiKey: modelConfig.textApiKey,
    });

    const imageAdapter = ModelAdapterFactory.createImageAdapter(modelConfig.imageProvider, {
      name: modelConfig.imageProvider,
      apiKey: modelConfig.imageApiKey,
    });

    orchestrator = new Orchestrator({
      textAdapter,
      imageAdapter,
    });
  }
  return orchestrator;
}

/**
 * POST /api/conversation/start
 * 开始新对话
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const manager = await getConversationManager();
    const result = manager.startConversation(userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('开始对话失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/conversation/message
 * 发送消息
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数：sessionId 或 message',
      });
    }

    const manager = await getConversationManager();
    const result = await manager.sendMessage(sessionId, message);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('发送消息失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/conversation/:sessionId/requirements
 * 获取当前提取的需求
 */
router.get('/:sessionId/requirements', async (req: Request, res: Response) => {
  try {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

    const manager = await getConversationManager();
    const requirements = manager.getExtractedRequirements(sessionId);

    res.json({
      success: true,
      data: requirements,
    });
  } catch (error) {
    logger.error('获取需求失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/conversation/:sessionId/generate
 * 基于对话历史生成小红书内容
 */
router.post('/:sessionId/generate', async (req: Request, res: Response) => {
  try {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

    logger.info('收到生成请求', { sessionId });

    const manager = await getConversationManager();
    const session = manager['sessionStore'].get(sessionId);

    if (!session) {
      logger.warn('会话不存在或已过期', { sessionId });

      // 获取当前所有会话的统计信息
      const stats = manager['sessionStore'].getStats();
      logger.info('当前会话统计', stats);

      return res.status(404).json({
        success: false,
        error: '会话不存在或已过期。可能原因：1) 服务器重启导致会话丢失 2) 会话超时（30分钟）。请刷新页面重新开始对话。',
      });
    }

    // 使用 ConversationManager 生成内容请求
    const generationRequest = await manager.generateContentFromConversation(sessionId);

    // 使用 Orchestrator 生成完整内容（包括图片）
    const modelConfig = await modelConfigManager.getOrDefault();
    const orchestrator = await getOrchestrator();

    const result = await orchestrator.generateContent(generationRequest);

    if (!result.success || !result.content) {
      throw new Error('生成失败');
    }

    // 从 generationRequest 获取风格
    const style = generationRequest.style || '对话生成';

    // 将生成的内容作为消息保存到会话中
    const generatedMessage: Message = {
      role: 'generated',
      content: JSON.stringify({
        title: result.content.title,
        content: result.content.content,
        topics: result.content.topics,
        images: result.content.images,
        style,
      }),
      timestamp: new Date(),
    };
    manager['sessionStore'].addMessage(sessionId, generatedMessage);

    logger.info('内容生成成功并已保存到会话', { sessionId, style });

    res.json({
      success: true,
      data: {
        content: {
          title: result.content.title,
          content: result.content.content,
          topics: result.content.topics || [],
          images: result.content.images || [],
          style,
        },
        message: '内容生成成功！',
      },
    });
  } catch (error) {
    logger.error('基于对话生成内容失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/conversation/stats
 * 获取会话统计信息
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = sessionStore.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('获取统计信息失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
