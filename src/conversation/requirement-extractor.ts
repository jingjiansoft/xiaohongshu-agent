/**
 * 需求提取器
 * 从对话历史中提取结构化需求信息
 */

import { Message, ExtractedRequirements } from './types.js';
import { TextModelAdapter } from '../adapters/base.js';
import { logger } from '../utils/logger.js';

export class RequirementExtractor {
  constructor(private adapter: TextModelAdapter) {}

  /**
   * 从对话历史中提取需求
   */
  async extract(messages: Message[]): Promise<ExtractedRequirements> {
    logger.debug('开始提取需求', { messageCount: messages.length });

    // 构建提取提示词
    const prompt = this.buildExtractionPrompt(messages);

    try {
      // 调用 AI 模型
      const result = await this.adapter.chatCompletion(
        [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.3,  // 低温度，更确定性的输出
          max_tokens: 500,
        }
      );

      if (!result.success || !result.content) {
        logger.error('需求提取失败', { error: result.error });
        return { confidence: 0 };
      }

      // 解析 JSON 结果
      const extracted = this.parseExtractedRequirements(result.content);
      logger.info('需求提取成功', { extracted });

      return extracted;
    } catch (error) {
      logger.error('需求提取异常', { error: (error as Error).message });
      return { confidence: 0 };
    }
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(): string {
    return `你是一个需求分析专家，负责从对话中提取小红书笔记的需求信息。

你的任务：
1. 分析对话历史，提取关键信息
2. 返回 JSON 格式的结构化数据
3. 评估提取的置信度（0-1）

可用的风格选项：
- 清新自然：温柔治愈，如春风拂面
- 专业干货：结构清晰，信息密度高
- 生活分享：真实接地气，像朋友聊天
- 种草推荐：真诚推荐，突出亮点
- 情感共鸣：细腻走心，引发共鸣
- 幽默搞笑：轻松有趣，段子手风格
- 文艺复古：文艺范儿，复古调调
- 旅行游记：身临其境，有攻略有感受
- 美食探店：色香味俱全，实用种草
- 学习成长：自律上进，方法论
- 职场进阶：专业实用，职场智慧

注意：
- 只提取明确提到的信息，不要猜测
- 如果信息不明确，置信度应该较低
- 风格必须从上述选项中选择，如果用户描述的风格不在列表中，选择最接近的`;
  }

  /**
   * 构建提取提示词
   */
  private buildExtractionPrompt(messages: Message[]): string {
    const conversation = messages
      .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .join('\n');

    return `从以下对话中提取小红书笔记的需求信息，返回 JSON 格式：

{
  "topic": "主题（用户想写什么内容）",
  "style": "风格（从可用风格中选择最匹配的）",
  "keywords": ["关键词1", "关键词2"],
  "audience": "目标受众",
  "tone": "语气",
  "requirements": ["特殊要求1", "特殊要求2"],
  "confidence": 0.8
}

对话历史：
${conversation}

要求：
1. 只返回 JSON，不要其他内容
2. 如果某个字段没有明确信息，不要包含该字段
3. confidence 表示提取的置信度（0-1），基于信息的明确程度
4. 风格必须从系统提示词中的可用风格选择`;
  }

  /**
   * 解析提取的需求
   */
  private parseExtractedRequirements(text: string): ExtractedRequirements {
    try {
      // 尝试提取 JSON 部分
      let jsonText = text.trim();

      // 如果包含 ```json 标记，提取 JSON 部分
      const jsonMatch = text.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      // 解析 JSON
      const parsed = JSON.parse(jsonText);

      // 验证和清理数据
      const requirements: ExtractedRequirements = {
        confidence: parsed.confidence || 0,
      };

      if (parsed.topic) requirements.topic = parsed.topic.trim();
      if (parsed.style) requirements.style = parsed.style.trim();
      if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
        requirements.keywords = parsed.keywords.map((k: string) => k.trim());
      }
      if (parsed.audience) requirements.audience = parsed.audience.trim();
      if (parsed.tone) requirements.tone = parsed.tone.trim();
      if (Array.isArray(parsed.requirements) && parsed.requirements.length > 0) {
        requirements.requirements = parsed.requirements.map((r: string) => r.trim());
      }

      return requirements;
    } catch (error) {
      logger.error('解析需求 JSON 失败', { error: (error as Error).message, text });
      return { confidence: 0 };
    }
  }
}
