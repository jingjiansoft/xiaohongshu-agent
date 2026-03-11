/**
 * 提示词配置加载器
 * 从 prompts.json 加载和管理提示词模板
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../utils/logger.js';

/**
 * 风格配置接口
 */
export interface StyleConfig {
  name: string;
  description: string;
  tone: string[];
  emojis: string[];
  systemPrompt: string;
  userPromptTemplate: string;
  structure: {
    title: {
      length: [number, number];
      requireEmoji: boolean;
      patterns: string[];
    };
    content: {
      length: [number, number];
      paragraphs: [number, number];
      requireSubtitles: boolean;
      requireLists: boolean;
    };
    topics: {
      count: [number, number];
      includeTopic: boolean;
    };
  };
  recommendedWords?: string[];
  bannedWords?: string[];
}

/**
 * 提示词配置接口
 */
export interface PromptsConfig {
  version: string;
  description: string;
  styles: Record<string, StyleConfig>;
  defaultStyle: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    version: string;
  };
}

/**
 * 提示词配置管理器
 */
export class PromptsManager {
  private config: PromptsConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || resolve(process.cwd(), 'prompts/prompts.json');
  }

  /**
   * 加载配置
   */
  load(): PromptsConfig {
    try {
      if (!existsSync(this.configPath)) {
        logger.warn('提示词配置文件不存在，使用内置默认配置', { path: this.configPath });
        return this.getDefaultConfig();
      }

      const content = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(content);

      logger.info('提示词配置加载成功', {
        version: this.config?.version,
        stylesCount: Object.keys(this.config?.styles || {}).length,
      });

      return this.config!;
    } catch (error) {
      logger.error('提示词配置加载失败', { error: (error as Error).message });
      logger.warn('使用内置默认配置');
      return this.getDefaultConfig();
    }
  }

  /**
   * 获取风格配置
   */
  getStyle(styleName: string): StyleConfig {
    if (!this.config) {
      this.load();
    }

    const style = this.config!.styles[styleName];
    
    if (!style) {
      logger.warn(`风格"${styleName}"不存在，使用默认风格`, { 
        requested: styleName,
        default: this.config!.defaultStyle 
      });
      return this.config!.styles[this.config!.defaultStyle];
    }

    return style;
  }

  /**
   * 获取所有风格列表
   */
  getAllStyles(): string[] {
    if (!this.config) {
      this.load();
    }

    return Object.keys(this.config!.styles);
  }

  /**
   * 构建完整的用户提示词
   */
  buildUserPrompt(styleName: string, topic: string, keywords?: string[]): string {
    const style = this.getStyle(styleName);

    const keywordsSection = keywords && keywords.length > 0
      ? `关键词：${keywords.join('、')}\n`
      : '';

    // 使用风格模板中的 userPromptTemplate
    let basePrompt = style.userPromptTemplate
      .replace(/{topic}/g, topic)
      .replace(/{keywords_section}/g, keywordsSection);

    // 插入字数要求到创作要求部分
    const titleLength = style.structure.title.length;
    const contentLength = style.structure.content.length;
    const tagsCount = style.structure.topics.count;
    const wordCountRequirements = `\n字数要求：标题${titleLength[0]}-${titleLength[1]} 字，正文${contentLength[0]}-${contentLength[1]} 字，话题标签${tagsCount[0]}-${tagsCount[1]} 个`;

    // 在创作要求后面添加字数要求
    basePrompt = basePrompt.replace('创作要求：', `创作要求：${wordCountRequirements}`);

    // 添加通用的 JSON 格式要求和 markdown 禁止提示
    return `【核心主题】${topic}
（重要：所有内容必须围绕这个主题展开）

${basePrompt}

【重要】请严格按以下 JSON 格式返回，不要其他内容：
{
  "title": "你的标题",
  "content": "你的正文内容",
  "topics": ["话题 1", "话题 2", "话题 3"],
  "image_prompts": ["首图提示词", "次图提示词", "第三图提示词"]
}

【图片提示词生成指南】
image_prompts 字段需要生成 3-6 个图片提示词，每个提示词要：
1. 与正文内容高度相关，提取核心场景和视觉元素
2. 使用中英文混合描述（主体用中文，风格和技术词汇用英文）
3. 包含以下要素：
   - 主体：具体的人物/物品/场景（中文描述）
   - 视角：Close-up/Medium shot/Wide shot/Overhead/Low angle 等
   - 构图：居中/三分法/对角线/留白等
   - 光线：自然光/黄金时刻/柔光/侧光等
   - 氛围：warm/cozy/fresh/elegant/vibrant 等（英文）
   - 风格：lifestyle photography/flat lay/candid/aesthetic 等（英文）
4. 每张图片的提示词要有差异化（不同视角、不同焦点、不同构图）
5. 符合小红书风格：真实、有质感、生活化

示例格式：
"温馨的早餐场景，桌上摆放着咖啡和面包，Close-up shot，浅景深突出主体，warm morning light，cozy and inviting atmosphere，lifestyle photography style"

注意：
- 只返回 JSON，不要任何其他文字
- 确保 JSON 格式正确，可以被解析
- 正文内容不同段落之间使用换行符 \n 分隔
- 正文中不要使用 markdown 格式（如 ** 加粗、### 标题等），只用纯文本
- 正文中的双引号需要转义为 \\"
- 内容必须严格围绕主题"${topic}"展开，不要偏离主题`;
  }

  /**
   * 获取默认配置（作为后备）
   */
  private getDefaultConfig(): PromptsConfig {
    // 返回最小化默认配置
    return {
      version: '1.0.0',
      description: '默认提示词配置',
      styles: {
        '生活分享': {
          name: '生活分享',
          description: '真实接地气',
          tone: ['真实', '亲切'],
          emojis: ['📷', '💭'],
          systemPrompt: '你是一位热爱生活的小红书博主。',
          userPromptTemplate: '请以"生活分享"的风格为主题"{topic}"创作一篇小红书笔记。\n\n{keywords_section}',
          structure: {
            title: { length: [12, 20], requireEmoji: false, patterns: [] },
            content: { length: [250, 450], paragraphs: [3, 5], requireSubtitles: false, requireLists: false },
            topics: { count: [3, 5], includeTopic: true }
          }
        }
      },
      defaultStyle: '生活分享',
      metadata: {
        createdAt: '2025-03-06',
        updatedAt: '2025-03-06',
        author: 'Vick',
        version: '1.0.0'
      }
    };
  }

  /**
   * 重新加载配置（用于热更新）
   */
  reload(): PromptsConfig {
    this.config = null;
    return this.load();
  }

  /**
   * 获取配置版本
   */
  getVersion(): string {
    if (!this.config) {
      this.load();
    }
    return this.config!.version;
  }

  /**
   * 检查配置是否已加载
   */
  isLoaded(): boolean {
    return this.config !== null;
  }
}

// 创建单例实例
export const promptsManager = new PromptsManager();

// 导出便捷函数
export function getStyleConfig(styleName: string): StyleConfig {
  return promptsManager.getStyle(styleName);
}

export function getAllStyleNames(): string[] {
  return promptsManager.getAllStyles();
}

export function buildPrompt(styleName: string, topic: string, keywords?: string[]): string {
  return promptsManager.buildUserPrompt(styleName, topic, keywords);
}