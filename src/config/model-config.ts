/**
 * 模型配置管理
 * 使用 SQLite 统一管理 AI 模型的 API Key 和提供商配置
 */

import { UnifiedStorage, getSetting, saveSetting } from '../data/unified-storage.js';
import { logger } from '../utils/logger.js';
import { configCache } from '../utils/cache.js';

/**
 * 模型配置
 */
export interface ModelConfig {
  /** 文本模型提供商 */
  textProvider: string;
  /** 文本模型 API Key */
  textApiKey: string;
  /** 图片模型提供商 */
  imageProvider: string;
  /** 图片模型 API Key */
  imageApiKey: string;
  /** 视频模型提供商 */
  videoProvider: string;
  /** 视频模型 API Key */
  videoApiKey: string;
  /** 最后更新时间 */
  updatedAt?: string;
}

/**
 * 默认模型配置
 */
const DEFAULT_CONFIG: ModelConfig = {
  textProvider: 'qwen',
  textApiKey: '',
  imageProvider: 'qwen',
  imageApiKey: '',
  videoProvider: 'minimax',
  videoApiKey: '',
};

/**
 * 模型配置管理器（SQLite 版本）
 */
export class ModelConfigManager {
  private storage: UnifiedStorage;
  private readonly CACHE_KEY = 'model_config';

  constructor() {
    this.storage = UnifiedStorage.getInstance();
  }

  /**
   * 加载配置（带缓存）
   */
  async load(): Promise<ModelConfig | null> {
    // 检查内存缓存
    const cached = configCache.get<ModelConfig>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    // 从 SQLite 读取
    const config = getSetting<ModelConfig>(this.CACHE_KEY);

    if (config) {
      logger.info('模型配置加载成功（SQLite）', {
        textProvider: config.textProvider,
        imageProvider: config.imageProvider,
      });
      // 存入缓存
      configCache.set(this.CACHE_KEY, config);
      return config;
    }

    logger.debug('模型配置不存在，将使用默认配置');
    return null;
  }

  /**
   * 保存配置
   */
  async save(config: ModelConfig): Promise<void> {
    try {
      // 添加更新时间
      config.updatedAt = new Date().toISOString();

      // 保存到 SQLite
      saveSetting(this.CACHE_KEY, config, 'model_config');

      // 更新缓存
      configCache.set(this.CACHE_KEY, config);

      logger.info('模型配置保存成功（SQLite）', {
        textProvider: config.textProvider,
        imageProvider: config.imageProvider,
      });
    } catch (error) {
      logger.error('保存模型配置失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 获取配置（如果不存在则返回默认值）
   */
  async getOrDefault(): Promise<ModelConfig> {
    const config = await this.load();

    if (config) {
      return config;
    }

    // 返回默认配置
    return DEFAULT_CONFIG;
  }

  /**
   * 验证配置是否有效
   */
  validate(config: ModelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.textProvider) {
      errors.push('文本模型提供商不能为空');
    }

    if (!config.textApiKey) {
      errors.push('文本模型 API Key 不能为空');
    }

    if (!config.imageProvider) {
      errors.push('图片模型提供商不能为空');
    }

    // 图片 API Key 可以为空，会使用文本 API Key
    if (!config.videoProvider) {
      errors.push('视频模型提供商不能为空');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    configCache.delete(this.CACHE_KEY);
  }
}

// 导出单例
export const modelConfigManager = new ModelConfigManager();
