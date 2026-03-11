/**
 * 模型适配器工厂
 * 统一创建和管理各种模型适配器
 */

import { TextModelAdapter, ImageModelAdapter, VideoModelAdapter, ModelConfig } from './base.js';
import { OpenAITextAdapter, OpenAIImageAdapter } from './openai.js';
import { DeepSeekAdapter } from './deepseek.js';
import { ClaudeAdapter } from './anthropic.js';
import { QwenTextAdapter, QwenImageAdapter } from './qwen.js';
import { GLMTextAdapter, CogViewImageAdapter } from './glm.js';
import { MiniMaxTextAdapter, MiniMaxImageAdapter, MiniMaxVideoAdapter } from './minimax.js';
import { logger } from '../utils/logger.js';

/**
 * 支持的模型提供商
 */
export enum ModelProvider {
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
  ANTHROPIC = 'anthropic',
  QWEN = 'qwen',
  GLM = 'glm',
  MINIMAX = 'minimax',
}

/**
 * 模型适配器工厂
 */
export class ModelAdapterFactory {
  // 文本模型适配器注册表
  private static textAdapters: Record<string, new (config: ModelConfig) => TextModelAdapter> = {
    [ModelProvider.OPENAI]: OpenAITextAdapter,
    [ModelProvider.DEEPSEEK]: DeepSeekAdapter,
    [ModelProvider.ANTHROPIC]: ClaudeAdapter,
    [ModelProvider.QWEN]: QwenTextAdapter,
    [ModelProvider.GLM]: GLMTextAdapter,
    [ModelProvider.MINIMAX]: MiniMaxTextAdapter,
  };

  // 图片模型适配器注册表
  private static imageAdapters: Record<string, new (config: ModelConfig) => ImageModelAdapter> = {
    [ModelProvider.OPENAI]: OpenAIImageAdapter,
    [ModelProvider.QWEN]: QwenImageAdapter,
    [ModelProvider.GLM]: CogViewImageAdapter,
    [ModelProvider.MINIMAX]: MiniMaxImageAdapter,
  };

  // 视频模型适配器注册表
  private static videoAdapters: Record<string, new (config: ModelConfig) => VideoModelAdapter> = {
    [ModelProvider.MINIMAX]: MiniMaxVideoAdapter,
  };

  /**
   * 创建文本模型适配器
   */
  static createTextAdapter(provider: string, config: ModelConfig): TextModelAdapter {
    const AdapterClass = this.textAdapters[provider];
    if (!AdapterClass) {
      throw new Error(`不支持的文本模型提供商: ${provider}，支持的提供商: ${Object.keys(this.textAdapters).join(', ')}`);
    }
    return new AdapterClass(config);
  }

  /**
   * 创建图片模型适配器
   */
  static createImageAdapter(provider: string, config: ModelConfig): ImageModelAdapter {
    const AdapterClass = this.imageAdapters[provider];
    if (!AdapterClass) {
      throw new Error(`不支持的图片模型提供商: ${provider}，支持的提供商: ${Object.keys(this.imageAdapters).join(', ')}`);
    }
    return new AdapterClass(config);
  }

  /**
   * 创建视频模型适配器
   */
  static createVideoAdapter(provider: string, config: ModelConfig): VideoModelAdapter {
    const AdapterClass = this.videoAdapters[provider];
    if (!AdapterClass) {
      throw new Error(`不支持的视频模型提供商: ${provider}，支持的提供商: ${Object.keys(this.videoAdapters).join(', ')}`);
    }
    return new AdapterClass(config);
  }

  /**
   * 注册自定义适配器
   */
  static registerTextAdapter(provider: string, AdapterClass: new (config: ModelConfig) => TextModelAdapter): void {
    this.textAdapters[provider] = AdapterClass;
    logger.info(`注册文本模型适配器: ${provider}`);
  }

  static registerImageAdapter(provider: string, AdapterClass: new (config: ModelConfig) => ImageModelAdapter): void {
    this.imageAdapters[provider] = AdapterClass;
    logger.info(`注册图片模型适配器: ${provider}`);
  }

  static registerVideoAdapter(provider: string, AdapterClass: new (config: ModelConfig) => VideoModelAdapter): void {
    this.videoAdapters[provider] = AdapterClass;
    logger.info(`注册视频模型适配器: ${provider}`);
  }

  /**
   * 获取支持的模型列表
   */
  static getSupportedModels(): { text: string[]; image: string[]; video: string[] } {
    return {
      text: Object.keys(this.textAdapters),
      image: Object.keys(this.imageAdapters),
      video: Object.keys(this.videoAdapters),
    };
  }
}

// 导出所有适配器
export * from './base.js';
export * from './openai.js';
export * from './deepseek.js';
export * from './anthropic.js';
export * from './qwen.js';
export * from './glm.js';
export * from './minimax.js';