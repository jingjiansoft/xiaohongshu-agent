/**
 * 缓存管理器
 * 优化频繁的文件读取操作，提供内存缓存
 */

import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  ttl?: number; // 缓存有效期（毫秒），默认 5 分钟
  maxEntries?: number; // 最大缓存条目，默认 100
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private ttl: number;
  private maxEntries: number;

  constructor(config: CacheConfig = {}) {
    this.ttl = config.ttl || 5 * 60 * 1000; // 5 分钟
    this.maxEntries = config.maxEntries || 100;

    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 60 * 1000); // 每分钟清理一次
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.debug('清理过期缓存', { count: deletedCount });
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; maxEntries: number; ttl: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttl: this.ttl,
    };
  }
}

// 创建全局缓存实例
export const globalCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 分钟
  maxEntries: 200,
});

// 专用缓存
export const promptsCache = new CacheManager({
  ttl: 30 * 1000, // 30 秒（提示词可能频繁修改）
  maxEntries: 20,
});

export const configCache = new CacheManager({
  ttl: 10 * 60 * 1000, // 10 分钟（配置相对稳定）
  maxEntries: 10,
});
