/**
 * 模型适配器基类
 * 定义所有模型适配器的统一接口
 */

import { logger } from '../utils/logger.js';

/**
 * 模型配置接口
 */
export interface ModelConfig {
  /** 模型名称 */
  name: string;
  /** API Key */
  apiKey: string;
  /** API Base URL（可选） */
  baseUrl?: string;
  /** 模型参数 */
  params?: Record<string, any>;
}

/**
 * 生成结果接口
 */
export interface GenerateResult<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 生成内容 */
  content?: T;
  /** 错误信息 */
  error?: string;
  /** 使用量统计 */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 模型适配器基类
 */
export abstract class BaseModelAdapter {
  protected config: ModelConfig;
  protected name: string;

  constructor(config: ModelConfig) {
    this.config = config;
    this.name = config.name;
  }

  /**
   * 初始化模型
   */
  abstract initialize(): Promise<void>;

  /**
   * 测试连接
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * 获取模型名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取模型配置
   */
  getConfig(): ModelConfig {
    return this.config;
  }

  /**
   * 记录日志
   */
  protected log(message: string, meta?: any): void {
    logger.info(`[${this.name}] ${message}`, meta);
  }

  /**
   * 记录错误
   */
  protected logError(message: string, error?: any): void {
    logger.error(`[${this.name}] ${message}`, { error: error?.message || error });
  }
}

/**
 * 文本模型适配器接口
 */
export abstract class TextModelAdapter extends BaseModelAdapter {
  /**
   * 生成文本
   */
  abstract generateText(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>>;

  /**
   * 聊天补全
   */
  abstract chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: Record<string, any>
  ): Promise<GenerateResult<string>>;
}

/**
 * 图片模型适配器接口
 */
export abstract class ImageModelAdapter extends BaseModelAdapter {
  /**
   * 生成图片（原生支持一次生成多张）
   * @param prompt 提示词
   * @param options 选项，支持 n 参数指定生成数量，取第一个结果
   * @returns 图片URL
   */
  abstract generateImage(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>>;

  /**
   * 批量生成图片
   * @param prompts 提示词列表
   * @param options 选项
   * @returns 图片URL列表
   */
  async generateImages(prompts: string[], options?: Record<string, any>): Promise<GenerateResult<string[]>> {
    const results: string[] = [];
    
    for (const prompt of prompts) {
      const result = await this.generateImage(prompt, options);
      if (result.success && result.content) {
        results.push(result.content);
      }
    }

    return {
      success: results.length > 0,
      content: results,
    };
  }
}

/**
 * 视频模型适配器接口
 */
export abstract class VideoModelAdapter extends BaseModelAdapter {
  /**
   * 生成视频
   */
  abstract generateVideo(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>>;

  /**
   * 获取视频生成状态
   */
  abstract getVideoStatus(taskId: string): Promise<GenerateResult<{ status: string; progress: number; url?: string }>>;
}