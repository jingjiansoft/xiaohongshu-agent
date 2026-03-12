/**
 * Cookie 管理模块
 * 使用 SQLite 统一存储 Cookie
 */

import { saveCookies, getCookies } from '../data/unified-storage.js';
import { logger } from '../utils/logger.js';

export interface CookieData {
  [key: string]: string | undefined;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Cookie 管理器（SQLite 版本）
 */
export class CookieManager {
  private cookies: CookieData | null = null;
  private readonly CACHE_KEY = 'cookies';

  /**
   * 加载 Cookie
   */
  async load(): Promise<CookieData | null> {
    try {
      // 从 SQLite 读取
      const cookies = getCookies<CookieData>();

      if (cookies) {
        this.cookies = cookies;
        logger.info('Cookie 加载成功（SQLite）', { keys: Object.keys(cookies) });
        return cookies;
      }

      logger.warn('Cookie 数据不存在');
      return null;
    } catch (error) {
      logger.error('Cookie 加载失败', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * 保存 Cookie
   */
  async save(cookies: CookieData): Promise<boolean> {
    try {
      const data = {
        ...cookies,
        updatedAt: new Date().toISOString(),
        createdAt: this.cookies?.createdAt || new Date().toISOString(),
      };

      // 保存到 SQLite
      saveCookies(data);
      this.cookies = data;

      logger.info('Cookie 保存成功（SQLite）');
      return true;
    } catch (error) {
      logger.error('Cookie 保存失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 将 Cookie 转换为 Playwright 格式
   */
  toPlaywrightCookies(cookies: CookieData, domain: string = 'creator.xiaohongshu.com') {
    return Object.entries(cookies)
      .filter(([key]) => !['createdAt', 'updatedAt'].includes(key))
      .map(([name, value]) => ({
        name,
        value,
        domain,
        path: '/',
      }));
  }

  /**
   * 将 Cookie 转换为字符串格式
   */
  toString(cookies: CookieData): string {
    return Object.entries(cookies)
      .filter(([key]) => !['createdAt', 'updatedAt'].includes(key))
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  /**
   * 验证 Cookie 是否有效（通过访问页面检查）
   */
  async validate(page: import('playwright').Page): Promise<boolean> {
    try {
      logger.info('开始验证 Cookie...');

      // 使用 'domcontentloaded' 而不是 'networkidle'，避免超时
      await page.goto('https://creator.xiaohongshu.com/new/home', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // 等待 2 秒让页面稳定
      await page.waitForTimeout(2000);

      const url = page.url();

      logger.info('当前 URL:', { url });

      // 如果跳转到登录页，说明 Cookie 无效
      if (url.includes('/login')) {
        logger.warn('Cookie 已过期，需要重新登录');
        return false;
      }

      // 检查是否到达首页
      if (url.includes('/new/home')) {
        logger.info('Cookie 验证成功，已到达首页');
        return true;
      }

      // 其他情况也认为成功（可能是其他页面）
      logger.info('Cookie 验证成功');
      return true;
    } catch (error) {
      logger.error('Cookie 验证失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 获取当前 Cookie
   */
  getCookies(): CookieData | null {
    return this.cookies;
  }
}
