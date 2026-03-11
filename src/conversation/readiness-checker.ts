/**
 * 准备度检查器
 * 判断提取的需求信息是否足够开始生成
 */

import { ExtractedRequirements, ReadinessStatus } from './types.js';
import { logger } from '../utils/logger.js';

export class ReadinessChecker {
  private readonly REQUIRED_FIELDS = ['topic'];  // 必需字段
  private readonly OPTIONAL_FIELDS = ['style', 'keywords'];  // 可选但建议有的字段
  private readonly MIN_CONFIDENCE = 0.7;  // 最低置信度

  /**
   * 检查准备度
   */
  check(requirements: ExtractedRequirements): ReadinessStatus {
    logger.debug('检查准备度', { requirements });

    // 检查必需字段
    const missingRequired = this.REQUIRED_FIELDS.filter(
      field => !requirements[field as keyof ExtractedRequirements]
    );

    if (missingRequired.length > 0) {
      return {
        ready: false,
        missingFields: missingRequired,
        nextQuestion: this.generateQuestion(missingRequired[0]),
        confidence: 0,
      };
    }

    // 检查可选字段
    const missingOptional = this.OPTIONAL_FIELDS.filter(
      field => !requirements[field as keyof ExtractedRequirements]
    );

    // 如果置信度低且缺少可选字段，继续询问
    if (missingOptional.length > 0 && requirements.confidence < this.MIN_CONFIDENCE) {
      return {
        ready: false,
        missingFields: missingOptional,
        nextQuestion: this.generateQuestion(missingOptional[0]),
        confidence: 0.5,
      };
    }

    // 准备就绪
    return {
      ready: true,
      missingFields: [],
      confidence: 1,
    };
  }

  /**
   * 生成引导问题
   */
  private generateQuestion(field: string): string {
    const questions: Record<string, string> = {
      topic: '你想写什么主题的笔记呢？可以简单描述一下。',
      style: '你希望是什么风格？我们有：清新自然、专业干货、生活分享、种草推荐、情感共鸣、幽默搞笑、文艺复古等风格。',
      keywords: '有什么关键词需要突出吗？比如想强调的特点或卖点。',
      audience: '目标读者是谁呢？比如年轻白领、学生党、宝妈等。',
      tone: '你希望用什么语气？比如亲切、专业、幽默等。',
    };

    return questions[field] || '还有其他要求吗？';
  }

  /**
   * 生成总结消息
   */
  generateSummary(requirements: ExtractedRequirements): string {
    const parts: string[] = [];

    if (requirements.topic) {
      parts.push(`主题：${requirements.topic}`);
    }

    if (requirements.style) {
      parts.push(`风格：${requirements.style}`);
    }

    if (requirements.keywords && requirements.keywords.length > 0) {
      parts.push(`关键词：${requirements.keywords.join('、')}`);
    }

    if (requirements.audience) {
      parts.push(`目标受众：${requirements.audience}`);
    }

    if (requirements.requirements && requirements.requirements.length > 0) {
      parts.push(`特殊要求：${requirements.requirements.join('、')}`);
    }

    const summary = parts.join('\n');

    return `好的，让我确认一下你的需求：\n\n${summary}\n\n这些信息准确吗？如果没问题，我就开始为你生成内容了！`;
  }
}

// 导出单例实例
export const readinessChecker = new ReadinessChecker();
