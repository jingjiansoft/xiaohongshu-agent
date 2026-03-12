/**
 * 小红书自动发文 Agent - 核心主类
 * 
 * 提供给 Web API 和 CLI 共同使用
 */

import { Orchestrator, OrchestratorConfig, PublishTask, PublishResult } from './core/orchestrator.js';
import { XiaohongshuPublisher, PublishContent } from './core/publisher.js';
import { ModelAdapterFactory, TextModelAdapter, ImageModelAdapter } from './adapters/index.js';
import { loadConfig } from './config.js';
import { logger } from './utils/logger.js';

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** 文本模型提供商 */
  textProvider?: string;
  /** 文本模型 API Key */
  textApiKey?: string;
  /** 图片模型提供商 */
  imageProvider?: string;
  /** 图片模型 API Key */
  imageApiKey?: string;
  /** 是否自动发布 */
  autoPublish?: boolean;
}

/**
 * 内容生成请求
 */
export interface GenerateContentRequest {
  topic: string;
  style?: string;
  keywords?: string[];
  imageCount?: number;
}

/**
 * 小红书自动发文 Agent
 */
export class XiaohongshuAgent {
  private orchestrator: Orchestrator | null = null;
  private config: AgentConfig;

  constructor(config?: AgentConfig) {
    this.config = config || {};
  }

  /**
   * 初始化 Agent
   */
  async initialize(): Promise<void> {
    const defaultConfig = loadConfig();

    // 创建文本模型适配器
    const textProvider = this.config.textProvider || 'qwen';
    const textApiKey = this.config.textApiKey || process.env.TEXT_API_KEY || '';
    
    if (!textApiKey) {
      throw new Error('未配置文本模型 API Key');
    }

    const textAdapter = ModelAdapterFactory.createTextAdapter(textProvider, {
      name: textProvider,
      apiKey: textApiKey,
    });

    await textAdapter.initialize();

    // 创建图片模型适配器
    const imageProvider = this.config.imageProvider || 'qwen';
    const imageApiKey = this.config.imageApiKey || process.env.IMAGE_API_KEY || textApiKey;
    
    const imageAdapter = ModelAdapterFactory.createImageAdapter(imageProvider, {
      name: imageProvider,
      apiKey: imageApiKey,
    });

    await imageAdapter.initialize();

    // 创建发布器（如果启用自动发布）
    let publisher: XiaohongshuPublisher | undefined;
    if (this.config.autoPublish) {
      publisher = new XiaohongshuPublisher();
    }

    // 创建统筹者
    this.orchestrator = new Orchestrator({
      textAdapter,
      imageAdapter,
      publisher,
    });

    logger.info('Agent 初始化完成', { textProvider, imageProvider });
  }

  /**
   * 执行发布任务
   */
  async publish(task: PublishTask): Promise<PublishResult> {
    if (!this.orchestrator) {
      await this.initialize();
    }

    return await this.orchestrator!.execute(task);
  }

  /**
   * 快速发布
   */
  async quickPublish(topic: string, style?: string): Promise<PublishResult> {
    return this.publish({
      topic,
      style,
      imageCount: 3,
      autoPublish: this.config.autoPublish || false,
    });
  }

  /**
   * 生成内容（不发布）
   */
  async generateContent(request: GenerateContentRequest): Promise<PublishResult> {
    if (!this.orchestrator) {
      await this.initialize();
    }

    return await this.orchestrator!.generateContent({
      topic: request.topic,
      style: request.style,
      imageCount: request.imageCount || 3,
    });
  }

  /**
   * 发布已有内容
   */
  async publishContent(content: PublishContent): Promise<PublishResult> {
    if (!this.orchestrator) {
      await this.initialize();
    }

    const publisher = new XiaohongshuPublisher();
    try {
      await publisher.init(false);
      const result = await publisher.publishImageNote(content);
      return result;
    } finally {
      await publisher.close();
    }
  }

  /**
   * 获取统筹者（供高级用户使用）
   */
  getOrchestrator(): Orchestrator | null {
    return this.orchestrator;
  }
}

// 创建默认实例的工厂函数
export function createAgent(config?: AgentConfig): XiaohongshuAgent {
  return new XiaohongshuAgent(config);
}

// 默认导出
export default XiaohongshuAgent;