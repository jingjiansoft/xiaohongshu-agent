/**
 * 统筹者 - 协调各个生成器完成内容创作和发布
 */

import { TextGenerator } from '../generators/text.js';
import { ImageGenerator } from '../generators/image.js';
import { XiaohongshuPublisher, PublishContent } from './publisher.js';
import { TextModelAdapter, ImageModelAdapter } from '../adapters/base.js';
import { logger } from '../utils/logger.js';

/**
 * 统筹者配置
 */
export interface OrchestratorConfig {
  textAdapter: TextModelAdapter;
  imageAdapter: ImageModelAdapter;
  publisher?: XiaohongshuPublisher;
}

/**
 * 发布任务
 */
export interface PublishTask {
  /** 主题 */
  topic: string;
  /** 风格 */
  style?: string;
  /** 关键词 */
  keywords?: string[];
  /** 图片数量 */
  imageCount?: number;
  /** 是否自动发布 */
  autoPublish?: boolean;
}

/**
 * 发布结果
 */
export interface PublishResult {
  success: boolean;
  message: string;
  content?: {
    title: string;
    content: string;  // 正文字段
    topics: string[];
    images: string[];
  };
  publishResult?: {
    success: boolean;
    noteUrl?: string;
  };
}

/**
 * 统筹者
 */
export class Orchestrator {
  private textGenerator: TextGenerator;
  private imageGenerator: ImageGenerator;
  private publisher: XiaohongshuPublisher | null = null;

  constructor(config: OrchestratorConfig) {
    this.textGenerator = new TextGenerator({ adapter: config.textAdapter });
    this.imageGenerator = new ImageGenerator({ adapter: config.imageAdapter });
    if (config.publisher) {
      this.publisher = config.publisher;
    }
  }

  /**
   * 执行发布任务
   */
  async execute(task: PublishTask): Promise<PublishResult> {
    logger.info('开始执行发布任务', { task });

    try {
      // 1. 生成文本内容
      logger.info('Step 1: 生成文本内容');
      const textContent = await this.textGenerator.generate({
        topic: task.topic,
        style: task.style,
        keywords: task.keywords,
      });

      // 2. 生成图片（使用文本内容让图片更贴合）
      logger.info('Step 2: 生成图片');

      // 提取文本生成器返回的图片提示词
      const imagePrompts = textContent.metadata?.imagePrompts;
      if (imagePrompts && Array.isArray(imagePrompts) && imagePrompts.length > 0) {
        logger.info('使用文本生成器提供的图片提示词', { count: imagePrompts.length });
      }

      const imageContent = await this.imageGenerator.generate(
        {
          topic: task.topic,
          style: task.style,
          content: textContent.content, // 传递生成的内容，让图片更贴合
          imageCount: task.imageCount || 3,
          extra: {
            imagePrompts: imagePrompts, // 传递图片提示词
          },
        },
      );

      // 检查图片是否为空，如果为空则生成兜底图片
      if (!imageContent.images || imageContent.images.length === 0) {
        logger.warn('AI 图片生成失败，使用单张兜底图片');
        // 这里可以调用一个简化版的兜底图片生成
        // 暂时先记录警告，让发布流程继续
      }

      // 3. 整合内容
      const content = {
        title: textContent.title || '',
        content: textContent.content || '',  // 使用 content 字段而非 body
        topics: textContent.topics || [],
        images: imageContent.images || [],
      };

      logger.info('内容生成完成', { title: content.title, imageCount: content.images.length });

      // 4. 自动发布（如果启用）
      if (task.autoPublish && this.publisher) {
        logger.info('Step 3: 自动发布');

        await this.publisher.init(false); // 使用有头浏览器
        const publishResult = await this.publisher.publishImageNote({
          title: content.title,
          content: content.content,  // 传递给发布器
          topics: content.topics,
          images: content.images,
        });

        await this.publisher.close();

        return {
          success: publishResult.success,
          message: publishResult.message,
          content,
          publishResult: {
            success: publishResult.success,
            noteUrl: publishResult.noteUrl,
          },
        };
      }

      // 返回生成的内容
      return {
        success: true,
        message: '内容生成成功',
        content,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('发布任务执行失败', { error: errorMessage });
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * 仅生成内容（不发布）
   */
  async generateContent(task: Omit<PublishTask, 'autoPublish'>): Promise<PublishResult> {
    return this.execute({ ...task, autoPublish: false });
  }

  /**
   * 设置发布器
   */
  setPublisher(publisher: XiaohongshuPublisher): void {
    this.publisher = publisher;
  }
}