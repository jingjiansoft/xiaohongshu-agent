/**
 * 内容生成器基类
 * 定义所有生成器的统一接口
 */

import { logger } from '../utils/logger.js';

/**
 * 内容生成请求
 */
export interface ContentRequest {
  /** 主题 */
  topic: string;
  /** 风格 */
  style?: string;
  /** 关键词 */
  keywords?: string[];
  /** 图片数量 */
  imageCount?: number;
  /** 目标受众 */
  targetAudience?: string;
  /** 生成的内容（用于图片生成参考） */
  content?: string;
  /** 额外参数 */
  extra?: Record<string, any>;
}

/**
 * 生成的内容
 */
export interface GeneratedContent {
  /** 标题 */
  title?: string;
  /** 正文 */
  content: string;
  /** 话题标签 */
  topics?: string[];
  /** 图片 URL */
  images?: string[];
  /** 视频 URL */
  video?: string;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 生成器基类
 */
export abstract class BaseGenerator {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * 生成内容
   */
  abstract generate(request: ContentRequest): Promise<GeneratedContent>;

  /**
   * 验证请求
   */
  protected validateRequest(request: ContentRequest): void {
    if (!request.topic) {
      throw new Error('主题不能为空');
    }
  }

  /**
   * 记录日志
   */
  protected log(message: string, meta?: any): void {
    logger.info(`[${this.name}] ${message}`, meta);
  }

  /**
   * 记录错误日志
   */
  protected logError(message: string, error?: any): void {
    logger.error(`[${this.name}] ${message}`, { error: error?.message || error });
  }
}