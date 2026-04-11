/**
 * 登录状态检查 API
 */

import { Router } from 'express';
import { BrowserManager } from '../core/browser.js';
import { cookieManager } from '../core/cookie-manager.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/login/status
 * 检查当前登录状态
 */
router.get('/status', async (req, res) => {
  // 1. 首先从 SQLite 加载 Cookie
  const cookies = await cookieManager.load();
  const hasCookies = cookies.length > 0;

  if (hasCookies) {
    // 2. Cookie 存在，验证有效性
    const isValid = await cookieManager.validate(cookies);

    if (isValid) {
      logger.info('Cookie 存在且有效');
      res.json({
        success: true,
        data: {
          isLoggedIn: true,
          url: 'https://creator.xiaohongshu.com/new/home',
          message: '已登录（Cookie 有效）',
          cookieExists: true,
          cookieValid: true,
        },
      });
      return;
    } else {
      logger.info('Cookie 存在但已失效，需要重新登录');
    }
  }

  // 3. Cookie 不存在或无效，启动浏览器检查登录状态
  const browserManager = new BrowserManager();

  try {
    logger.info('Cookie 不存在或无效，启动浏览器检查登录状态...');

    // 启动浏览器（无头模式）
    const page = await browserManager.launch(true);

    // 访问首页检查登录状态
    await page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/login');

    // 如果已登录，保存 Cookie
    if (isLoggedIn) {
      const cookies = await page.context().cookies();
      await cookieManager.save(cookies);
      logger.info('已自动保存 Cookie', { count: cookies.length });

      res.json({
        success: true,
        data: {
          isLoggedIn: true,
          url: currentUrl,
          message: '已登录（已自动保存 Cookie）',
          cookieExists: true,
          cookieValid: true,
        },
      });
    } else {
      logger.info('浏览器未登录，等待用户登录...');

      // 等待用户登录（最多 60 秒）
      try {
        await page.waitForURL(url => !url.href.includes('/login'), {
          timeout: 60000,
        });

        // 登录成功后等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000));

        const cookies = await page.context().cookies();
        await cookieManager.save(cookies);
        logger.info('用户登录成功，已保存 Cookie', { count: cookies.length });

        res.json({
          success: true,
          data: {
            isLoggedIn: true,
            url: page.url(),
            message: '登录成功，已保存 Cookie',
            cookieExists: true,
            cookieValid: true,
          },
        });
      } catch (error) {
        logger.warn('等待登录超时');
        res.json({
          success: true,
          data: {
            isLoggedIn: false,
            url: currentUrl,
            message: '未登录，请刷新页面重试或访问 /api/login/initiate 进行登录',
            cookieExists: false,
            cookieValid: false,
          },
        });
      }
    }
  } catch (error) {
    logger.error('检查登录状态失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      data: {
        isLoggedIn: false,
        url: '',
        message: '检查登录状态失败：' + (error as Error).message,
        cookieExists: false,
        cookieValid: false,
      },
    });
  } finally {
    await browserManager.close();
  }
});

/**
 * POST /api/login/initiate
 * 启动登录流程 - 打开浏览器让用户登录
 */
router.post('/initiate', async (req, res) => {
  logger.info('启动登录流程...');

  // 注意：这个接口会启动浏览器，但不会等待登录完成
  // 前端应该轮询 /api/login/status 来检查登录状态

  const browserManager = new BrowserManager();

  try {
    // 启动浏览器（有头模式，用户可以看到并操作）
    const page = await browserManager.launch(false); // false = 有头模式

    await page.goto('https://creator.xiaohongshu.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    logger.info('已打开登录页面，请扫码或完成登录');

    // 返回成功，前端轮询状态
    res.json({
      success: true,
      message: '已打开登录页面，请在浏览器中完成登录',
      data: {
        browserOpen: true,
      },
    });

    // 在后台等待登录完成
    (async () => {
      try {
        await page.waitForURL(url => !url.href.includes('/login'), {
          timeout: 120000, // 2 分钟
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const cookies = await page.context().cookies();
        await cookieManager.save(cookies);
        logger.info('用户登录成功，已保存 Cookie', { count: cookies.length });

        await browserManager.close();
      } catch (error) {
        logger.warn('等待登录超时或失败', { error: (error as Error).message });
        await browserManager.close();
      }
    })();
  } catch (error) {
    logger.error('启动登录流程失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      message: '启动登录流程失败：' + (error as Error).message,
    });
  }
});

/**
 * POST /api/login/save
 * 保存 Cookie 到 SQLite
 */
router.post('/save', async (req, res) => {
  try {
    const { cookies } = req.body;

    if (!cookies || !Array.isArray(cookies)) {
      return res.status(400).json({
        success: false,
        message: 'Cookie 数据格式错误',
      });
    }

    await cookieManager.save(cookies);

    logger.info('Cookie 保存成功', { count: cookies.length });
    res.json({
      success: true,
      message: 'Cookie 保存成功',
      count: cookies.length,
    });
  } catch (error) {
    logger.error('保存 Cookie 失败', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      message: '保存 Cookie 失败：' + (error as Error).message,
    });
  }
});

/**
 * GET /api/login/status
 * 检查 Cookie 状态
 */
router.get('/status', async (req, res) => {
  try {
    const cookies = await cookieManager.load();
    res.json({
      success: true,
      exists: cookies.length > 0,
      count: cookies.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      exists: false,
      count: 0,
    });
  }
});

export default router;
