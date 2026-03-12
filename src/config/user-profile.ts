/**
 * 用户配置加载器
 * 加载和管理用户背景信息、偏好设置
 */

import { readFileSync, existsSync, writeFileSync, watch } from 'fs';
import { resolve } from 'path';
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
 * 用户配置管理器
 */
export class UserProfileManager {
  private profile: UserProfile | null = null;
  private configPath: string;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 分钟缓存

  constructor(configPath?: string) {
    this.configPath = configPath || resolve(process.cwd(), 'config/user-profile.json');
    this.setupFileWatcher();
  }

  /**
   * 设置文件监听器，文件变化时清空缓存
   */
  private setupFileWatcher(): void {
    try {
      watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          logger.debug('用户配置文件变化，清空缓存');
          this.profile = null;
          configCache.delete('user_profile');
        }
      });
    } catch (error) {
      // 文件可能不存在，忽略
    }
  }

  /**
   * 加载用户配置（带缓存）
   */
  load(): UserProfile {
    // 检查内存缓存
    const cached = configCache.get<UserProfile>('user_profile');
    if (cached) {
      this.profile = cached;
      return cached;
    }

    try {
      if (!existsSync(this.configPath)) {
        logger.warn('用户配置文件不存在，使用默认配置', { path: this.configPath });
        const defaultProfile = this.getDefaultProfile();
        configCache.set('user_profile', defaultProfile);
        return defaultProfile;
      }

      const content = readFileSync(this.configPath, 'utf-8');
      this.profile = JSON.parse(content);

      // 存入缓存
      configCache.set('user_profile', this.profile);

      logger.info('用户配置加载成功', {
        user: this.profile?.user.name,
        brand: this.profile?.user.brand,
        stylesCount: this.profile?.user.preferences.styles.length,
      });

      return this.profile!;
    } catch (error) {
      logger.error('用户配置加载失败', { error: (error as Error).message });
      return this.getDefaultProfile();
    }
  }

  /**
   * 保存用户配置
   */
  save(profile: UserProfile): boolean {
    try {
      const data = {
        ...profile,
        metadata: {
          ...profile.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf-8');
      this.profile = data;
      
      logger.info('用户配置保存成功', { path: this.configPath });
      return true;
    } catch (error) {
      logger.error('用户配置保存失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 获取用户配置
   */
  getProfile(): UserProfile {
    if (!this.profile) {
      this.load();
    }
    return this.profile!;
  }

  /**
   * 获取用户偏好风格
   */
  getPreferredStyles(): string[] {
    const profile = this.getProfile();
    return profile.user.preferences.styles;
  }

  /**
   * 获取禁用风格
   */
  getAvoidStyles(): string[] {
    const profile = this.getProfile();
    return profile.user.preferences.avoidStyles || [];
  }

  /**
   * 获取常用话题
   */
  getCommonTopics(): string[] {
    const profile = this.getProfile();
    return profile.content.commonTopics;
  }

  /**
   * 获取推荐关键词
   */
  getKeywords(): string[] {
    const profile = this.getProfile();
    return profile.content.keywords || [];
  }

  /**
   * 获取禁用词
   */
  getBannedWords(): string[] {
    const profile = this.getProfile();
    return profile.content.bannedWords || [];
  }

  /**
   * 获取默认配置
   */
  private getDefaultProfile(): UserProfile {
    return {
      version: '1.0.0',
      user: {
        name: '用户',
        brand: '生活博主',
        description: '热爱生活，分享日常',
        targetAudience: '年轻人',
        tone: '亲切自然',
        preferences: {
          styles: ['生活分享'],
          avoidStyles: [],
          emojiUsage: '适量',
          contentLength: '300-500 字',
          imageCount: 3,
        },
      },
      content: {
        commonTopics: ['日常生活', '好物推荐'],
        keywords: ['真实', '实用'],
        bannedWords: [],
        recommendedPhrases: [],
      },
      publishing: {
        preferredTime: ['09:00', '12:00', '18:00'],
        frequency: '每天 1-2 篇',
        autoPublish: false,
        requireReview: true,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: '用户',
      },
    };
  }

  /**
   * 重新加载配置
   */
  reload(): UserProfile {
    this.profile = null;
    return this.load();
  }
}

// 创建单例实例
export const userProfileManager = new UserProfileManager();

// 导出便捷函数
export function getUserProfile(): UserProfile {
  return userProfileManager.getProfile();
}

export function getUserPreferences() {
  const profile = getUserProfile();
  return profile.user.preferences;
}

export function getUserKeywords(): string[] {
  return getUserProfile().content.keywords || [];
}

export function getBannedWords(): string[] {
  return getUserProfile().content.bannedWords || [];
}