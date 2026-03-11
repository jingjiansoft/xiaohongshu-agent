/**
 * 浏览器管理模块
 * 使用 Playwright 进行浏览器自动化
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { cookieManager } from './cookie-manager.js';
import { logger } from '../utils/logger.js';
import { defaultConfig } from '../config.js';

/**
 * 浏览器管理器
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor() {
    // 使用 cookie-manager 的 cookieManager 实例
  }

  /**
   * 启动浏览器
   */
  async launch(headless: boolean = false): Promise<Page> {
    try {
      logger.info('启动浏览器...', { headless });

      this.browser = await chromium.launch({
        headless,
        slowMo: defaultConfig.browser.slowMo,
      });

      // 创建浏览器上下文
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      // 创建页面
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(defaultConfig.browser.timeout);

      // 加载并设置 Cookie（使用 cookie-manager）
      const cookies = await cookieManager.load();
      if (cookies.length > 0) {
        await this.context.addCookies(cookies);
        logger.info('Cookie 加载成功', { count: cookies.length });
      } else {
        logger.debug('Cookie 文件为空或未找到');
      }

      logger.info('浏览器启动成功');
      return this.page;
    } catch (error) {
      logger.error('浏览器启动失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 设置 Cookie
   */
  async setCookies(cookies: import('playwright').Cookie[]): Promise<void> {
    if (!this.context) {
      throw new Error('浏览器上下文未初始化');
    }

    await this.context.addCookies(cookies);
    logger.info('Cookie 设置成功', { count: cookies.length });
  }

  /**
   * 获取页面实例
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('页面未初始化，请先调用 launch()');
    }
    return this.page;
  }

  /**
   * 验证登录状态
   */
  async checkLoginStatus(): Promise<boolean> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }

    // 加载 Cookie 并验证
    const cookies = await cookieManager.load();
    if (cookies.length === 0) {
      logger.warn('Cookie 文件为空');
      return false;
    }

    // 验证 Cookie 是否有效
    const isValid = await cookieManager.validate(cookies);
    if (!isValid) {
      logger.warn('Cookie 验证失败');
      return false;
    }

    // 访问页面检查登录状态
    await this.page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    await this.randomDelay(2000, 3000);

    const currentUrl = this.page.url();
    logger.info('登录状态检查', { url: currentUrl });

    if (currentUrl.includes('/login')) {
      logger.warn('Cookie 已过期或无效，需要重新登录');
      return false;
    }

    logger.info('Cookie 验证成功，已登录');
    return true;
  }

  /**
   * 随机延迟（模拟人类行为）
   */
  async randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
    logger.debug(`延迟 ${delay}ms`);
    await this.page?.waitForTimeout(delay);
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      logger.info('浏览器已关闭');
    } catch (error) {
      logger.error('关闭浏览器失败', { error: (error as Error).message });
    }
  }
}