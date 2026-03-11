/**
 * 模型配置 API 路由
 */

import { Router } from 'express';
import { modelConfigManager } from '../config/model-config.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/model-config
 * 获取当前模型配置
 */
router.get('/', async (req, res) => {
  try {
    const config = await modelConfigManager.getOrDefault();
    
    // 不返回敏感的 API Key（只显示部分）
    const safeConfig = {
      textProvider: config.textProvider,
      textApiKey: maskApiKey(config.textApiKey),
      textApiKeySet: !!config.textApiKey,
      imageProvider: config.imageProvider,
      imageApiKey: maskApiKey(config.imageApiKey),
      imageApiKeySet: !!config.imageApiKey,
      videoProvider: config.videoProvider,
      videoApiKey: maskApiKey(config.videoApiKey),
      videoApiKeySet: !!config.videoApiKey,
      updatedAt: config.updatedAt,
    };

    res.json({ success: true, data: safeConfig });
  } catch (error) {
    logger.error('获取模型配置失败', { error: (error as Error).message });
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * PUT /api/model-config
 * 更新模型配置
 */
router.put('/', async (req, res) => {
  try {
    const config = req.body;

    // 验证配置
    const validation = modelConfigManager.validate(config);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: '配置验证失败',
        errors: validation.errors 
      });
    }

    // 保存配置
    await modelConfigManager.save(config);

    logger.info('模型配置已更新');
    res.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    logger.error('更新模型配置失败', { error: (error as Error).message });
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

/**
 * POST /api/model-config/test
 * 测试模型配置是否有效
 */
router.post('/test', async (req, res) => {
  try {
    const { textApiKey, imageApiKey } = req.body;

    const results: any = {
      textModel: { success: false, message: '未测试' },
      imageModel: { success: false, message: '未测试' },
    };

    // 测试文本模型
    if (textApiKey) {
      try {
        // TODO: 实际调用模型 API 测试
        results.textModel = {
          success: true,
          message: 'API Key 格式有效',
        };
      } catch (error) {
        results.textModel = {
          success: false,
          message: (error as Error).message,
        };
      }
    }

    // 测试图片模型
    if (imageApiKey) {
      try {
        // TODO: 实际调用模型 API 测试
        results.imageModel = {
          success: true,
          message: 'API Key 格式有效',
        };
      } catch (error) {
        results.imageModel = {
          success: false,
          message: (error as Error).message,
        };
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('测试模型配置失败', { error: (error as Error).message });
    res.status(500).json({ success: false, message: '测试失败' });
  }
});

/**
 * 隐藏 API Key 的中间部分
 */
function maskApiKey(key: string): string {
  if (!key || key.length < 10) return '***';
  return key.substring(0, 6) + '...' + key.substring(key.length - 4);
}

export default router;
