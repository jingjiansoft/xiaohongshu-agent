/**
 * 模型配置管理
 * 管理 AI 模型的 API Key 和提供商配置
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { logger } from '../utils/logger.js';

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
 * 模型配置管理器
 */
export class ModelConfigManager {
  private configPath: string;
  private cache: ModelConfig | null = null;

  constructor() {
    this.configPath = resolve(process.cwd(), 'config/model-config.json');
  }

  /**
   * 加载配置
   */
  async load(): Promise<ModelConfig | null> {
    try {
      // 如果已有缓存，直接返回
      if (this.cache) {
        return this.cache;
      }

      const data = await readFile(this.configPath, 'utf-8');
      this.cache = JSON.parse(data);
      logger.info('模型配置加载成功');
      return this.cache;
    } catch (error) {
      // 文件不存在或解析失败
      logger.debug('模型配置文件不存在，将使用默认配置');
      return null;
    }
  }

  /**
   * 保存配置
   */
  async save(config: ModelConfig): Promise<void> {
    try {
      // 确保目录存在
      await mkdir(dirname(this.configPath), { recursive: true });

      // 添加更新时间
      config.updatedAt = new Date().toISOString();

      // 写入文件
      await writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      
      // 更新缓存
      this.cache = config;
      
      logger.info('模型配置保存成功', { 
        textProvider: config.textProvider,
        imageProvider: config.imageProvider 
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
    return {
      textProvider: 'qwen',
      textApiKey: '',
      imageProvider: 'qwen',
      imageApiKey: '',
      videoProvider: 'minimax',
      videoApiKey: '',
    };
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
    this.cache = null;
  }
}

// 导出单例
export const modelConfigManager = new ModelConfigManager();
