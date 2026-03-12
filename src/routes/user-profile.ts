/**
 * 用户配置 API 路由
 */

import { Router } from 'express';
import { userProfileManager } from '../config/user-profile.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/user-profile
 * 获取当前用户配置
 */
router.get('/', async (req, res) => {
  try {
    const profile = userProfileManager.load();

    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('获取用户配置失败', { error: (error as Error).message });
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * PUT /api/user-profile
 * 更新用户配置
 */
router.put('/', async (req, res) => {
  try {
    const profile = req.body;

    // 保存配置
    const success = userProfileManager.save(profile);

    if (!success) {
      return res.status(500).json({
        success: false,
        message: '保存配置失败'
      });
    }

    logger.info('用户配置已更新');
    res.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    logger.error('更新用户配置失败', { error: (error as Error).message });
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

/**
 * GET /api/user-profile/keywords
 * 获取用户关键词
 */
router.get('/keywords', async (req, res) => {
  try {
    const keywords = userProfileManager.getKeywords();
    res.json({ success: true, data: keywords });
  } catch (error) {
    logger.error('获取关键词失败', { error: (error as Error).message });
    res.status(500).json({ success: false, message: '获取关键词失败' });
  }
});

/**
 * GET /api/user-profile/banned-words
 * 获取禁用词
 */
router.get('/banned-words', async (req, res) => {
  try {
    const bannedWords = userProfileManager.getBannedWords();
    res.json({ success: true, data: bannedWords });
  } catch (error) {
    logger.error('获取禁用词失败', { error: (error as Error).message });
    res.status(500).json({ success: false, message: '获取禁用词失败' });
  }
});

export default router;
