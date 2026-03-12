/**
 * 用户配置加载器
 * 使用 SQLite 统一存储用户背景信息、偏好设置
 */

import { UnifiedStorage, getSetting, saveSetting } from '../data/unified-storage.js';
import { logger } from '../utils/logger.js';
import { configCache } from '../utils/cache.js';

/**
 * 用户配置接口
 */
export interface UserProfile {
  version: string;
  user: {
    name: string;
    brand?: string;
    description?: string;
    targetAudience?: string;
    tone?: string;
    preferences: {
      styles: string[];
      avoidStyles?: string[];
      emojiUsage?: string;
      contentLength?: string;
      imageCount?: number;
    };
  };
  content: {
    commonTopics: string[];
    keywords?: string[];
    bannedWords?: string[];
    recommendedPhrases?: string[];
  };
  publishing: {
    preferredTime?: string[];
    frequency?: string;
    autoPublish: boolean;
    requireReview?: boolean;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
  };
}

/**
 * 默认用户配置
 */
function getDefaultProfile(): UserProfile {
  return {
    version: '1.0.0',
    user: {
      name: '博主',
      brand: '生活美学博主',
      description: '热爱生活的博主',
      targetAudience: '25-35 岁都市白领',
      tone: '亲切自然',
      preferences: {
        styles: ['生活分享'],
        emojiUsage: '适量',
        contentLength: '300-500 字',
        imageCount: 3,
      },
    },
    content: {
      commonTopics: ['日常生活', '好物推荐'],
      keywords: ['真实', '实用'],
      bannedWords: ['最', '第一', '绝对'],
      recommendedPhrases: ['亲测好用', '真心推荐'],
    },
    publishing: {
      preferredTime: ['09:00', '12:00', '18:00'],
      frequency: '每天 1 篇',
      autoPublish: true,
      requireReview: true,
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'System',
    },
  };
}

/**
 * 用户配置管理器（SQLite 版本）
 */
export class UserProfileManager {
  private storage: UnifiedStorage;
  private readonly CACHE_KEY = 'user_profile';

  constructor() {
    this.storage = UnifiedStorage.getInstance();
  }

  /**
   * 加载用户配置（带缓存）
   */
  load(): UserProfile {
    // 检查内存缓存
    const cached = configCache.get<UserProfile>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    // 从 SQLite 读取
    const profile = getSetting<UserProfile>(this.CACHE_KEY);

    if (profile) {
      logger.info('用户配置加载成功（SQLite）', {
        user: profile.user.name,
        brand: profile.user.brand,
      });
      // 存入缓存
      configCache.set(this.CACHE_KEY, profile);
      return profile;
    }

    // 返回默认配置
    logger.warn('用户配置不存在，使用默认配置');
    const defaultProfile = getDefaultProfile();
    configCache.set(this.CACHE_KEY, defaultProfile);
    return defaultProfile;
  }

  /**
   * 保存用户配置
   */
  save(profile: UserProfile): boolean {
    try {
      // 更新 metadata
      const data = {
        ...profile,
        metadata: {
          ...profile.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      // 保存到 SQLite
      saveSetting(this.CACHE_KEY, data, 'user_profile');

      // 更新缓存
      configCache.set(this.CACHE_KEY, data);

      logger.info('用户配置保存成功（SQLite）');
      return true;
    } catch (error) {
      logger.error('保存用户配置失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 获取用户关键词
   */
  getKeywords(): string[] {
    const profile = this.load();
    return profile.content.keywords || [];
  }

  /**
   * 获取禁用词
   */
  getBannedWords(): string[] {
    const profile = this.load();
    return profile.content.bannedWords || [];
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    configCache.delete(this.CACHE_KEY);
  }
}

// 导出单例
export const userProfileManager = new UserProfileManager();

// 导出便捷函数
export function getUserProfile(): UserProfile {
  return userProfileManager.load();
}

export function getUserKeywords(): string[] {
  return userProfileManager.getKeywords();
}

export function getBannedWords(): string[] {
  return userProfileManager.getBannedWords();
}

export function saveUserProfile(profile: UserProfile): boolean {
  return userProfileManager.save(profile);
}
