/**
 * 图片生成提示词加载器
 * 从 image-prompts.json 加载和管理图片生成提示词模板
 */

import { readFileSync, existsSync, watch } from 'fs';
import { resolve } from 'path';
import { logger } from '../utils/logger.js';
import { promptsCache } from '../utils/cache.js';

/**
 * 图片风格配置接口
 */
export interface ImageStyleConfig {
  name: string;
  description: string;
  visualElements: string[];      // 视觉元素（中文描述）
  colorPalette: string[];        // 配色方案
  shootingStyle: string;         // 拍摄风格
  mood: string;                  // 氛围（英文，AI 理解更好）
}

/**
 * 构图指南配置接口
 */
export interface CompositionGuideConfig {
  name: string;
  description: string;
  guidance: string;              // 构图指导（中文描述）
}

/**
 * 图片提示词配置接口
 */
export interface ImagePromptsConfig {
  version: string;
  description: string;
  styles: Record<string, ImageStyleConfig>;
  defaultStyle: string;
  compositionGuides: Record<string, CompositionGuideConfig>;
  globalSettings: {
    quality: string;
    platform: string;
    aspectRatio: string;
  };
  promptTemplate: string;
}

/**
 * 图片提示词管理器
 */
export class ImagePromptsManager {
  private config: ImagePromptsConfig | null = null;
  private configPath: string;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 30 * 1000; // 30 秒内使用缓存

  constructor(configPath?: string) {
    this.configPath = configPath || resolve(process.cwd(), 'prompts/image-prompts.json');
    this.setupFileWatcher();
  }

  /**
   * 设置文件监听器，文件变化时自动清空缓存
   */
  private setupFileWatcher(): void {
    try {
      watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          logger.debug('图片提示词配置文件变化，清空缓存');
          this.config = null;
          promptsCache.delete('image_prompts_config');
        }
      });
    } catch (error) {
      // 文件可能不存在，忽略
    }
  }

  /**
   * 加载配置（带缓存）
   */
  load(): ImagePromptsConfig {
    // 检查缓存是否有效
    const now = Date.now();
    if (this.config && (now - this.lastLoadTime) < this.CACHE_TTL) {
      return this.config;
    }

    // 检查内存缓存
    const cached = promptsCache.get<ImagePromptsConfig>('image_prompts_config');
    if (cached) {
      this.config = cached;
      return cached;
    }

    try {
      if (!existsSync(this.configPath)) {
        logger.warn('图片提示词配置文件不存在，使用内置默认配置', { path: this.configPath });
        const defaultConfig = this.getDefaultConfig();
        promptsCache.set('image_prompts_config', defaultConfig);
        return defaultConfig;
      }

      const content = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      this.lastLoadTime = now;

      // 存入缓存
      promptsCache.set('image_prompts_config', this.config);

      logger.info('图片提示词配置加载成功', {
        version: this.config?.version,
        stylesCount: Object.keys(this.config?.styles || {}).length,
      });

      return this.config!;
    } catch (error) {
      logger.error('图片提示词配置加载失败', { error: (error as Error).message });
      logger.warn('使用内置默认配置');
      return this.getDefaultConfig();
    }
  }

  /**
   * 获取图片风格配置
   */
  getImageStyle(styleName: string): ImageStyleConfig {
    if (!this.config) {
      this.load();
    }

    const style = this.config!.styles[styleName];

    if (!style) {
      logger.warn(`图片风格"${styleName}"不存在，使用默认风格`, {
        requested: styleName,
        default: this.config!.defaultStyle
      });
      return this.config!.styles[this.config!.defaultStyle];
    }

    return style;
  }

  /**
   * 获取所有图片风格列表
   */
  getAllStyles(): string[] {
    if (!this.config) {
      this.load();
    }

    return Object.keys(this.config!.styles);
  }

  /**
   * 获取构图指南
   */
  getCompositionGuide(guideName: string): CompositionGuideConfig {
    if (!this.config) {
      this.load();
    }

    const guide = this.config!.compositionGuides[guideName];

    if (!guide) {
      // 返回第一个构图指南
      const firstKey = Object.keys(this.config!.compositionGuides)[0];
      return this.config!.compositionGuides[firstKey];
    }

    return guide;
  }

  /**
   * 构建图片生成提示词
   * 更灵活的提示词构建，避免过于模板化
   */
  buildUserPrompt(topic: string, style?: string, content?: string): string {
    const styleConfig = this.getImageStyle(style || this.config!.defaultStyle);

    // 从内容中提取关键信息（如果提供）
    let contentContext = '';
    if (content) {
      // 提取内容中的关键词或短句
      const contentPreview = content.substring(0, 200);
      contentContext = `Content context: ${contentPreview}`;
    }

    // 使用更自然的提示词组合方式
    const promptParts: string[] = [];

    // 1. 主题
    promptParts.push(`Subject: ${topic}`);

    // 2. 视觉元素（自然串联）
    if (styleConfig.visualElements.length > 0) {
      const elementsStr = styleConfig.visualElements.join(', ');
      promptParts.push(`Visual elements: ${elementsStr}`);
    }

    // 3. 配色方案
    if (styleConfig.colorPalette.length > 0) {
      const colorsStr = styleConfig.colorPalette.join(' with ');
      promptParts.push(`Color palette: ${colorsStr}`);
    }

    // 4. 拍摄风格
    promptParts.push(`Shooting style: ${styleConfig.shootingStyle}`);

    // 5. 氛围
    promptParts.push(`Mood: ${styleConfig.mood}`);

    // 6. 内容上下文（如果有）
    if (contentContext) {
      promptParts.push(contentContext);
    }

    // 7. 质量要求
    promptParts.push(this.config!.globalSettings.quality);

    // 8. 平台风格
    promptParts.push(this.config!.globalSettings.platform);

    // 9. 画幅比例
    promptParts.push(this.config!.globalSettings.aspectRatio);

    return promptParts.join('. ');
  }

  /**
   * 构建多图提示词（为每张图片添加变体，确保差异化和多样性）
   */
  buildMultiplePrompts(topic: string, style?: string, content?: string, count: number = 3): string[] {
    const styleConfig = this.getImageStyle(style || this.config!.defaultStyle);
    const prompts: string[] = [];

    // 获取所有构图指南
    const guides = Object.values(this.config!.compositionGuides);

    // 为每张图定义不同的视角和焦点
    const viewVariations = [
      'Close-up shot, detailed view',           // 特写
      'Medium shot, eye-level perspective',     // 中景
      'Wide shot, environmental view',          // 广角
      'Overhead shot, flat lay perspective',    // 俯拍
      'Low angle, dramatic perspective',        // 低角度
      '45-degree angle, natural view',          // 45 度角
    ];

    // 为每张图定义不同的焦点
    const focusVariations = [
      'Focus on the main subject, shallow depth of field',
      'Focus on textures and details, macro style',
      'Focus on overall atmosphere, soft focus',
      'Focus on colors and composition, artistic',
      'Focus on storytelling, narrative moment',
      'Focus on authenticity, candid style',
    ];

    for (let i = 0; i < count; i++) {
      // 为每张图片选择不同的构图、视角和焦点
      const guide = guides[i % guides.length];
      const view = viewVariations[i % viewVariations.length];
      const focus = focusVariations[i % focusVariations.length];

      // 构建差异化提示词
      const promptParts: string[] = [];

      // 1. 主题
      promptParts.push(`Subject: ${topic}`);

      // 2. 视觉元素（每张图可以侧重不同的元素）
      if (styleConfig.visualElements.length > 0) {
        // 轮询选择不同的视觉元素重点
        const elementIndex = i % styleConfig.visualElements.length;
        const primaryElement = styleConfig.visualElements[elementIndex];
        const otherElements = styleConfig.visualElements.filter((_, idx) => idx !== elementIndex);
        const elementsStr = otherElements.length > 0
          ? `${primaryElement}, with ${otherElements.join(', ')}`
          : primaryElement;
        promptParts.push(`Visual elements: ${elementsStr}`);
      }

      // 3. 配色方案
      if (styleConfig.colorPalette.length > 0) {
        const colorsStr = styleConfig.colorPalette.join(' with ');
        promptParts.push(`Color palette: ${colorsStr}`);
      }

      // 4. 拍摄风格
      promptParts.push(`Shooting style: ${styleConfig.shootingStyle}`);

      // 5. 视角和构图（差异化关键）
      promptParts.push(`View: ${view}. Composition: ${guide.guidance}`);

      // 6. 焦点（差异化关键）
      promptParts.push(`Focus: ${focus}`);

      // 7. 氛围
      promptParts.push(`Mood: ${styleConfig.mood}`);

      // 8. 质量要求
      promptParts.push(this.config!.globalSettings.quality);

      // 9. 平台风格
      promptParts.push(this.config!.globalSettings.platform);

      // 10. 画幅比例
      promptParts.push(this.config!.globalSettings.aspectRatio);

      prompts.push(promptParts.join('. '));
    }

    return prompts;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): ImagePromptsConfig {
    return {
      version: '2.0.0',
      description: '图片生成默认配置',
      styles: {
        '生活分享': {
          name: '生活分享',
          description: '真实接地气',
          visualElements: ['生活场景', '真实瞬间', '温馨细节'],
          colorPalette: ['暖米色', '奶油色', '浅棕色'],
          shootingStyle: '黄金时刻自然光，candid 抓拍视角',
          mood: 'warm, cozy, relatable'
        }
      },
      defaultStyle: '生活分享',
      compositionGuides: {
        'hero': {
          name: '主图',
          description: '核心主题特写',
          guidance: '居中构图，突出主体，视觉焦点集中'
        }
      },
      globalSettings: {
        quality: 'high quality, detailed, aesthetic',
        platform: 'Xiaohongshu lifestyle photography style',
        aspectRatio: '3:4 vertical or 1:1 square'
      },
      promptTemplate: 'Subject: {topic}. Visual elements: {elements}. Color palette: {colors}. Shooting style: {style}. Mood: {mood}.'
    };
  }

  /**
   * 重新加载配置
   */
  reload(): ImagePromptsConfig {
    this.config = null;
    return this.load();
  }
}

// 创建单例实例
export const imagePromptsManager = new ImagePromptsManager();

// 导出便捷函数
export function getImageStyle(styleName: string): ImageStyleConfig {
  return imagePromptsManager.getImageStyle(styleName);
}

export function getAllImageStyles(): string[] {
  return imagePromptsManager.getAllStyles();
}

export function buildPrompt(topic: string, style?: string, content?: string): string {
  return imagePromptsManager.buildUserPrompt(topic, style, content);
}

export function buildMultiplePrompts(topic: string, style?: string, content?: string, count: number = 3): string[] {
  return imagePromptsManager.buildMultiplePrompts(topic, style, content, count);
}
