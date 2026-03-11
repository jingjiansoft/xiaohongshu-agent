/**
 * 文本内容生成器
 * 使用真实的文本模型生成小红书笔记内容
 */

import { BaseGenerator, ContentRequest, GeneratedContent } from './base.js';
import { TextModelAdapter } from '../adapters/base.js';
import { getStyleConfig, buildPrompt, StyleConfig } from '../prompts/loader.js';
import { getUserProfile, getUserKeywords, getBannedWords } from '../config/user-profile.js';
import { logger } from '../utils/logger.js';

/**
 * 文本生成器配置
 */
export interface TextGeneratorConfig {
  adapter: TextModelAdapter;
}

/**
 * 文本生成器
 */
export class TextGenerator extends BaseGenerator {
  private adapter: TextModelAdapter;

  constructor(config: TextGeneratorConfig) {
    super('TextGenerator');
    this.adapter = config.adapter;
  }

  /**
   * 生成完整的小红书笔记内容
   */
  async generate(request: ContentRequest): Promise<GeneratedContent> {
    this.validateRequest(request);

    this.log('开始生成内容', { topic: request.topic, style: request.style });

    try {
      // 加载用户配置
      const userProfile = getUserProfile();
      const userKeywords = getUserKeywords();
      const bannedWords = getBannedWords();

      this.log('用户配置', {
        user: userProfile.user.name,
        brand: userProfile.user.brand,
        preferredStyles: userProfile.user.preferences.styles.join(', '),
      });

      // 从配置文件加载风格配置
      const style = getStyleConfig(request.style || userProfile.user.preferences.styles[0] || '生活分享');

      this.log('使用风格配置', {
        style: style.name,
        tone: style.tone.join(', '),
        emojis: style.emojis.length,
        description: style.description,
        contentLength: `${style.structure.content.length[0]}-${style.structure.content.length[1]}字`
      });

      // 合并关键词
      const allKeywords = [...new Set([
        ...(request.keywords || []),
        ...userKeywords,
      ])];

      // 使用 prompts/loader 中的 buildPrompt 函数
      const userPrompt = buildPrompt(request.style || style.name, request.topic, allKeywords);

      // 构建系统提示词
      const systemPrompt = this.buildSystemPrompt(style, userProfile, bannedWords);

      logger.debug('系统提示词', { length: systemPrompt.length });
      logger.debug('用户提示词', { length: userPrompt.length });

      // 调用 AI 模型，要求返回 JSON 格式
      const result = await this.adapter.chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.8,
          max_tokens: 2000,
        }
      );

      if (!result.success || !result.content) {
        this.logError('AI 生成失败', { error: result.error });
        throw new Error(`AI 生成失败：${result.error}`);
      }

      this.log('AI 返回原始内容', {
        length: result.content.length,
        preview: result.content.substring(0, 300)
      });

      // 解析 JSON 格式的内容
      const content = this.parseJSONContent(result.content, style);

      this.log('解析后的内容', {
        title: content.title,
        contentLength: content.content.length,
        topicsCount: content.topics?.length || 0
      });

      // 如果解析失败，使用模拟数据
      if (!content.title || content.title === '未命名' || content.content.length < 50) {
        this.log('内容解析失败，使用模拟数据');
        return this.generateMockContent(request, style);
      }

      return content;
    } catch (error) {
      this.logError('内容生成失败', error);

      // 降级返回模拟数据
      this.log('使用模拟数据作为降级方案');
      return this.generateMockContent(request);
    }
  }

  /**
   * 构建系统提示词（包含用户背景）
   */
  private buildSystemPrompt(style: StyleConfig, userProfile: any, bannedWords?: string[]): string {
    const userStyle = style.systemPrompt;

    return `${userStyle}

【用户背景】
- 博主名称：${userProfile.user.name}
- 博主定位：${userProfile.user.brand || '生活博主'}
- 目标受众：${userProfile.user.targetAudience || '年轻人'}
- 文字风格：${userProfile.user.tone || '亲切自然'}

【内容要求】
- 字数：${style.structure.content.length[0]}-${style.structure.content.length[1]} 字
- Emoji 使用：${userProfile.user.preferences.emojiUsage || '适量'}
- 禁用词汇：${bannedWords?.join('、') || '无'}
- 推荐用语：${userProfile.content.recommendedPhrases?.join('、') || '无'}

【重要原则】
- 必须严格围绕用户提供的主题来创作，不要偏离主题
- 用户背景仅作为写作风格参考，不影响内容主题
- 即使博主定位与主题无关，也要忠实于用户指定的主题`;
  }
  }

  /**
   * 解析 JSON 格式的内容
   */
  private parseJSONContent(text: string, style: StyleConfig): GeneratedContent {
    logger.debug('开始解析 JSON 内容', { textLength: text.length });

    try {
      // 尝试提取 JSON 部分（处理可能的 markdown 代码块）
      let jsonText = text;

      // 如果包含 ```json 标记，提取 JSON 部分
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        logger.debug('提取到 JSON 代码块');
      }

      // 尝试修复 JSON 中的常见问题
      jsonText = this.fixJSONText(jsonText);

      // 解析 JSON
      const parsed = JSON.parse(jsonText);

      logger.debug('JSON 解析成功', {
        hasTitle: !!parsed.title,
        hasContent: !!parsed.content,
        hasTopics: Array.isArray(parsed.topics)
      });

      // 验证必需字段
      if (!parsed.title || !parsed.content) {
        throw new Error('JSON 缺少必需字段：title 或 content');
      }

      // 确保 topics 是数组
      const topics = Array.isArray(parsed.topics) ? parsed.topics : [];

      // 确保话题数量（使用配置文件中的配置）
      const minTopics = style.structure.topics.count[0];
      if (topics.length < minTopics) {
        const baseTopics = [style.name.replace(/\s/g, ''), '小红书', '分享'];
        topics.push(...baseTopics.slice(0, minTopics - topics.length));
      }

      // 处理标题：限制在 20 字以内（使用配置文件中的配置）
      const maxTitleLength = style.structure.title.length[1];
      let title = parsed.title.trim();
      if (title.length > maxTitleLength) {
        this.log(`标题过长 (${title.length}字)，自动截断到${maxTitleLength}字`, { original: title });
        title = title.substring(0, maxTitleLength - 2) + '...';
        this.log(`截断后标题：${title}`);
      }

      // 提取图片提示词（如果有）
      const imagePrompts = Array.isArray(parsed.image_prompts) ? parsed.image_prompts : [];
      if (imagePrompts.length > 0) {
        this.log('提取到图片提示词', { count: imagePrompts.length });
      }

      return {
        title: title,
        content: parsed.content.trim(),
        topics: topics.slice(0, 6).map((t: string) => t.replace('#', '').trim()),
        metadata: {
          imagePrompts: imagePrompts,
        },
      };
    } catch (error) {
      logger.error('JSON 解析失败', { error: (error as Error).message });

      // 降级：尝试从非结构化文本中提取
      this.log('尝试使用正则表达式解析');
      return this.parseGeneratedContent(text);
    }
  }

  /**
   * 解析生成的内容（降级方案：处理非 JSON 格式）
   */
  private parseGeneratedContent(text: string): GeneratedContent {
    let title = '';
    let content = '';
    let topics: string[] = [];

    // 尝试提取 JSON（处理可能的 markdown 代码块）
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.title && parsed.content) {
          return {
            title: parsed.title.trim(),
            content: parsed.content.trim(),
            topics: (parsed.topics || []).slice(0, 6),
          };
        }
      } catch (e) {
        // JSON 解析失败，继续下面的正则解析
      }
    }

    // 模式 1: 标题：xxx \n\n 正文：xxx
    const titleMatch = text.match(/标题 [：:]\s*(.+?)(?=\n|$)/s);
    if (titleMatch) {
      title = titleMatch[1].trim();
      const contentMatch = text.match(/正文 [：:]\s*(.+?)(?=\n\n|话题|$)/s);
      if (contentMatch) {
        content = contentMatch[1].trim();
      }
      const topicsMatch = text.match(/话题 [：:]\s*(.+?)$/s);
      if (topicsMatch) {
        topics = topicsMatch[1].match(/#([^#\s]+)/g)?.map(t => t.replace('#', '')) || [];
      }
    }

    // 模式 2: 第一行作为标题
    if (!title) {
      const firstLine = text.split('\n')[0].trim();
      if (firstLine && firstLine.length < 50) {
        title = firstLine;
        content = text.split('\n').slice(1).join('\n').trim();
      }
    }

    // 提取话题
    if (topics.length === 0) {
      topics = text.match(/#([^#\s]+)/g)?.map(t => t.replace('#', '')) || [];
    }

    // 如果没有正文
    if (!content) {
      content = title ? text.replace(/标题 [：:].*?\n/, '').replace(/正文 [：:]\s*/, '').trim() : text;
    }

    // 确保话题数量
    if (topics.length < 3) {
      topics.push('生活分享', '小红书', '日常');
    }

    // 处理标题：限制在 20 字以内
    let finalTitle = title || '未命名';
    if (finalTitle.length > 20) {
      logger.warn(`标题过长 (${finalTitle.length}字)，自动截断到 20 字`, { original: finalTitle });
      finalTitle = finalTitle.substring(0, 18) + '...';
      logger.info(`截断后标题：${finalTitle}`);
    }

    return {
      title: finalTitle,
      content: content || text,
      topics: topics.slice(0, 6),
    };
  }

  /**
   * 修复 JSON 文本中的常见问题
   */
  private fixJSONText(text: string): string {
    let fixed = text;

    // 1. 移除 markdown 加粗符号 **
    fixed = fixed.replace(/\*\*/g, '');

    // 2. 移除 markdown 标题符号 ###
    fixed = fixed.replace(/^#{1,6}\s+/gm, '');

    // 3. 移除 markdown 代码块标记（如果存在）
    fixed = fixed.replace(/```/g, '');

    // 4. 移除行内的 markdown 斜体符号 *text*
    fixed = fixed.replace(/\*([^*]+)\*/g, '$1');

    // 5. 修复 JSON 字符串中的换行符 - 只处理未转义的实际换行符
    // 匹配引号内的内容，将未转义的实际换行符替换为 \n
    fixed = fixed.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, content) => {
      // 只转义实际的特殊字符，不重复转义已转义的字符
      let escaped = content
        .replace(/\n/g, '\\n')    // 转义实际换行符
        .replace(/\r/g, '\\r')    // 转义实际回车符
        .replace(/\t/g, '\\t');   // 转义实际制表符
      return `"${escaped}"`;
    });

    // 6. 尝试修复未闭合的字符串 - 查找每行末尾是否有未闭合的引号
    const lines = fixed.split('\n');
    const repairedLines: string[] = [];
    let inStringValue = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 检查是否在字符串值中间断开
      const quoteCount = (line.match(/"(?!\\|\\")/g) || []).length;

      if (inStringValue) {
        // 在多行字符串中，查找结束引号
        const endQuoteIndex = line.indexOf('"');
        if (endQuoteIndex !== -1) {
          // 找到结束引号，检查是否脱义
          let escapedCount = 0;
          let idx = endQuoteIndex - 1;
          while (idx >= 0 && line[idx] === '\\') {
            escapedCount++;
            idx--;
          }
          if (escapedCount % 2 === 0) {
            inStringValue = false;
          }
        }
        repairedLines.push(line);
      } else {
        // 检查是否开始了一个未闭合的字符串值
        const valueMatch = line.match(/:\s*"/);
        if (valueMatch && quoteCount % 2 === 1) {
          inStringValue = true;
        }
        repairedLines.push(line);
      }
    }
    fixed = repairedLines.join('\n');

    return fixed;
  }

  /**
   * 生成模拟内容（降级方案）
   */
  private generateMockContent(request: ContentRequest, style?: StyleConfig): GeneratedContent {
    const styleName = style?.name || request.style || '生活分享';
    const topic = request.topic;

    // 生成标题并限制在 20 字以内
    let title = `${topic} | 让生活更有质感✨`;
    if (title.length > 20) {
      title = topic.length <= 15 ? `${topic} | 生活质感✨` : topic.substring(0, 18) + '...';
    }

    const content = `这是关于${topic}的${styleName}风格内容。\n\n` +
      `✨ 这里是正文内容，详细描述关于${topic}的体验和感受...\n\n` +
      `💡 提示：配置有效的 API Key 以获取高质量的 AI 生成内容。\n\n` +
      `欢迎在评论区分享你的想法～`;

    const topics = [topic, styleName.replace(/\s/g, ''), '分享', '日常', '记录'];

    return {
      title,
      content,
      topics: topics.slice(0, 6),
    };
  }
}