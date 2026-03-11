/**
 * Cookie 管理器
 * 负责 Cookie 的保存、加载和验证
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { logger } from '../utils/logger.js';
import type { Cookie } from 'playwright';

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

export interface CookieFile {
  cookies: SavedCookie[];
  savedAt: string;
  userAgent: string;
}

export class CookieManager {
  private cookiePath: string;

  constructor() {
    this.cookiePath = resolve(process.cwd(), 'config', 'cookies.json');
  }

  /**
   * 保存 Cookie 到文件
   */
  async save(cookies: any[]): Promise<void> {
    try {
      await mkdir(dirname(this.cookiePath), { recursive: true });

      logger.info('准备保存 Cookie', { count: cookies.length });
      
      // 调试：打印第一个 Cookie 的详细信息
      if (cookies.length > 0) {
        const firstCookie = cookies[0];
        logger.info('Cookie 示例', {
          name: firstCookie.name,
          value: firstCookie.value,
          valueType: typeof firstCookie.value,
          valueConstructor: firstCookie.value?.constructor?.name,
          allKeys: Object.keys(firstCookie),
        });
      }

      const cookieData: CookieFile = {
        cookies: cookies.map(cookie => {
          // 详细类型检查和转换
          const value = cookie.value;
          let stringValue: string;
          
          if (typeof value === 'string') {
            stringValue = value;
          } else if (value === null || value === undefined) {
            stringValue = '';
          } else {
            // 如果是对象，尝试 JSON 序列化
            stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            logger.warn('Cookie value 不是字符串，已转换', { 
              name: cookie.name, 
              originalType: typeof value,
              convertedValue: stringValue.substring(0, 50) + '...' 
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

      await writeFile(this.cookiePath, JSON.stringify(cookieData, null, 2), 'utf-8');
      logger.info('Cookie 保存成功', { path: this.cookiePath, count: cookies.length });
    } catch (error) {
      logger.error('保存 Cookie 失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 从文件加载 Cookie
   */
  async load(): Promise<Cookie[]> {
    try {
      const data = await readFile(this.cookiePath, 'utf-8');
      const cookieData: CookieFile = JSON.parse(data);

      logger.info('从文件加载 Cookie', { path: this.cookiePath, count: cookieData.cookies.length });

      return cookieData.cookies.map(cookie => {
        // 确保 value 是字符串
        const stringValue = typeof cookie.value === 'string' ? cookie.value : String(cookie.value);

        // 处理 expires：Playwright 要求整数，-1 表示会话 Cookie
        let expiresValue: number;
        if (typeof cookie.expires === 'number' && cookie.expires !== -1) {
          // 如果是小数，向上取整
          expiresValue = Math.ceil(cookie.expires);
        } else {
          // -1 表示会话 Cookie（浏览器关闭时过期）
          expiresValue = -1;
        }

        // sameSite 映射到 Playwright 的类型（必须是 'Lax', 'None', 或 'Strict'）
        let sameSiteValue: 'Lax' | 'None' | 'Strict' = 'Lax'; // 默认值
        if (cookie.sameSite === 'Lax' || cookie.sameSite === 'None' || cookie.sameSite === 'Strict') {
          sameSiteValue = cookie.sameSite;
        }

        const result: Cookie = {
          name: String(cookie.name),
          value: stringValue,
          domain: String(cookie.domain),
          path: String(cookie.path),
          httpOnly: Boolean(cookie.httpOnly),
          secure: Boolean(cookie.secure),
          expires: expiresValue,
          sameSite: sameSiteValue,
        };

        return result;
      });
    } catch (error) {
      logger.debug('Cookie 文件不存在或读取失败', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * 验证 Cookie 是否有效
   */
  async validate(cookies: Cookie[]): Promise<boolean> {
    // 检查是否有必要的 Cookie
    const requiredCookies = ['a1', 'webId', 'xsecappid'];
    const cookieNames = cookies.map(c => c.name);
    
    const hasRequired = requiredCookies.some(name => cookieNames.includes(name));
    
    if (!hasRequired) {
      logger.warn('缺少必要的 Cookie');
      return false;
    }

    // 检查是否过期
    const now = Date.now() / 1000;
    const expired = cookies.some(c => c.expires && c.expires < now);
    
    if (expired) {
      logger.warn('Cookie 已过期');
      return false;
    }

    return true;
  }

  /**
   * 获取 Cookie 文件路径
   */
  getPath(): string {
    return this.cookiePath;
  }

  /**
   * 清除 Cookie 文件
   */
  async clear(): Promise<void> {
    try {
      const { unlink } = await import('fs/promises');
      await unlink(this.cookiePath);
      logger.info('Cookie 文件已清除');
    } catch (error) {
      logger.debug('清除 Cookie 文件失败', { error: (error as Error).message });
    }
  }
}

export const cookieManager = new CookieManager();
