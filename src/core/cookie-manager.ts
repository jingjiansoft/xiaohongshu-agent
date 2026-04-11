/**
 * Cookie 管理器（SQLite 版本）
 * 负责 Cookie 的保存、加载和验证
 */

import { saveCookies, getCookies } from '../data/unified-storage.js';
import { logger } from '../utils/logger.js';
import type { Cookie as PlaywrightCookie } from 'playwright';

export interface SavedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  expires: number;
  sameSite?: 'Lax' | 'None' | 'Strict';
}

export interface CookieData {
  cookies: SavedCookie[];
  savedAt: string;
  userAgent: string;
}

export class CookieManager {
  private cookies: PlaywrightCookie[] | null = null;

  /**
   * 保存 Cookie 到 SQLite
   */
  async save(cookies: PlaywrightCookie[]): Promise<void> {
    try {
      logger.info('准备保存 Cookie', { count: cookies.length });

      const cookieData: CookieData = {
        cookies: cookies.map(cookie => {
          const value = cookie.value;
          let stringValue: string;

          if (typeof value === 'string') {
            stringValue = value;
          } else if (value === null || value === undefined) {
            stringValue = '';
          } else {
            stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            logger.warn('Cookie value 不是字符串，已转换', {
              name: cookie.name,
              originalType: typeof value,
            });
          }

          return {
            name: String(cookie.name),
            value: stringValue,
            domain: String(cookie.domain || '.xiaohongshu.com'),
            path: String(cookie.path || '/'),
            httpOnly: Boolean(cookie.httpOnly),
            secure: Boolean(cookie.secure),
            expires: typeof cookie.expires === 'number' ? cookie.expires : -1,
            sameSite: cookie.sameSite || 'Lax',
          };
        }),
        savedAt: new Date().toISOString(),
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };

      saveCookies(cookieData);
      this.cookies = cookies;
      logger.info('Cookie 保存成功（SQLite）', { count: cookies.length });
    } catch (error) {
      logger.error('保存 Cookie 失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 从 SQLite 加载 Cookie
   */
  async load(): Promise<PlaywrightCookie[]> {
    try {
      const cookieData = getCookies<CookieData>();

      if (!cookieData || !cookieData.cookies || cookieData.cookies.length === 0) {
        logger.warn('Cookie 数据不存在');
        return [];
      }

      logger.info('从 SQLite 加载 Cookie', { count: cookieData.cookies.length });

      this.cookies = cookieData.cookies.map(cookie => {
        const stringValue = typeof cookie.value === 'string' ? cookie.value : String(cookie.value);

        let expiresValue: number;
        if (typeof cookie.expires === 'number' && cookie.expires !== -1) {
          expiresValue = Math.ceil(cookie.expires);
        } else {
          expiresValue = -1;
        }

        let sameSiteValue: 'Lax' | 'None' | 'Strict' = 'Lax';
        if (cookie.sameSite === 'Lax' || cookie.sameSite === 'None' || cookie.sameSite === 'Strict') {
          sameSiteValue = cookie.sameSite;
        }

        return {
          name: String(cookie.name),
          value: stringValue,
          domain: String(cookie.domain),
          path: String(cookie.path),
          httpOnly: Boolean(cookie.httpOnly),
          secure: Boolean(cookie.secure),
          expires: expiresValue,
          sameSite: sameSiteValue,
        };
      });

      return this.cookies;
    } catch (error) {
      logger.error('加载 Cookie 失败', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * 验证 Cookie 是否有效
   * @param pageOrCookies - Page 对象或 Cookie 数组（用于兼容旧 API）
   */
  async validate(pageOrCookies: import('playwright').Page | PlaywrightCookie[]): Promise<boolean> {
    try {
      // 如果传入的是 Page，直接验证
      if (typeof (pageOrCookies as any).goto === 'function') {
        const page = pageOrCookies as import('playwright').Page;
        logger.info('开始验证 Cookie...');

        await page.goto('https://creator.xiaohongshu.com/new/home', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });

        await page.waitForTimeout(2000);

        const url = page.url();

        logger.info('当前 URL:', { url });

        if (url.includes('/login')) {
          logger.warn('Cookie 已过期，需要重新登录');
          return false;
        }

        if (url.includes('/new/home')) {
          logger.info('Cookie 验证成功，已到达首页');
          return true;
        }

        logger.info('Cookie 验证成功');
        return true;
      }

      // 如果传入的是 Cookie 数组，只检查基本有效性（不访问页面）
      const cookies = pageOrCookies as PlaywrightCookie[];
      logger.info('检查 Cookie 有效性...');

      const requiredCookies = ['a1', 'webId', 'xsecappid'];
      const cookieNames = cookies.map(c => c.name);

      const hasRequired = requiredCookies.some(name => cookieNames.includes(name));

      if (!hasRequired) {
        logger.warn('缺少必要的 Cookie');
        return false;
      }

      const now = Date.now() / 1000;
      const expired = cookies.some(c => c.expires && c.expires !== -1 && c.expires < now);

      if (expired) {
        logger.warn('Cookie 已过期');
        return false;
      }

      logger.info('Cookie 基本验证通过');
      return true;
    } catch (error) {
      logger.error('Cookie 验证失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 获取当前 Cookie
   */
  getCookies(): PlaywrightCookie[] | null {
    return this.cookies;
  }

  /**
   * 获取 Cookie 存储路径（用于兼容性）
   */
  getPath(): string {
    return 'SQLite (data/agent.db)';
  }

  /**
   * 清除 Cookie（用于测试）
   */
  async clear(): Promise<void> {
    this.cookies = null;
    logger.info('Cookie 已清除（内存）');
  }
}

export const cookieManager = new CookieManager();
