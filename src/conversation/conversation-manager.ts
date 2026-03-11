/**
 * 对话管理器
 * 协调对话流程、需求提取和准备度检查
 */

import {
  ConversationSession,
  ConversationResponse,
  Message,
  GenerationRequest,
} from './types.js';
import { SessionStore } from './session-store.js';
import { RequirementExtractor } from './requirement-extractor.js';
import { ReadinessChecker } from './readiness-checker.js';
import { TextModelAdapter } from '../adapters/base.js';
import { logger } from '../utils/logger.js';

export class ConversationManager {
  constructor(
    private sessionStore: SessionStore,
    private extractor: RequirementExtractor,
    private checker: ReadinessChecker,
    private adapter: TextModelAdapter
  ) {}

  /**
   * 开始新对话
   */
  startConversation(userId?: string): { sessionId: string; message: string } {
    const session = this.sessionStore.create(userId);

    // 添加系统消息
    const systemMessage: Message = {
      role: 'system',
      content: this.getConversationSystemPrompt(),
      timestamp: new Date(),
    };
    this.sessionStore.addMessage(session.id, systemMessage);

    // 生成开场白
    const greeting = this.generateGreeting();

    // 添加 AI 消息
    const aiMessage: Message = {
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
    };
    this.sessionStore.addMessage(session.id, aiMessage);

    logger.info('开始新对话', { sessionId: session.id });

    return {
      sessionId: session.id,
      message: greeting,
    };
  }

  /**
   * 发送用户消息
   */
  async sendMessage(sessionId: string, userMessage: string): Promise<ConversationResponse> {
    logger.info('收到用户消息', { sessionId, message: userMessage });

    // 获取会话
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      throw new Error('会话不存在或已过期');
    }

    // 添加用户消息
    const message: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    this.sessionStore.addMessage(sessionId, message);

    // 重新获取会话，确保包含刚添加的用户消息
    const updatedSession = this.sessionStore.get(sessionId);
    if (!updatedSession) {
      throw new Error('会话不存在或已过期');
    }

    // 准备发送给 AI 的消息：系统消息 + 摘要（如果有）+ 最新10条消息
    const messagesToSend = this.prepareMessagesForAI(updatedSession);

    // 生成 AI 回复和摘要
    const { response, summary } = await this.generateResponseWithSummary(messagesToSend, updatedSession.summary);

    // 添加 AI 消息
    const aiMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      summary, // 保存摘要
    };
    this.sessionStore.addMessage(sessionId, aiMessage);

    // 更新会话摘要
    if (summary) {
      this.sessionStore.update(sessionId, { summary });
    }

    logger.info('生成 AI 回复', { sessionId, hasSummary: !!summary });

    // 返回空的需求和准备度状态（保持接口兼容）
    return {
      message: response,
      extractedRequirements: { confidence: 0 },
      readinessStatus: { ready: false, missingFields: [], confidence: 0 },
      summary,
    };
  }

  /**
   * 获取当前提取的需求
   */
  getExtractedRequirements(sessionId: string) {
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      throw new Error('会话不存在或已过期');
    }
    return session.extractedRequirements;
  }

  /**
   * 基于对话历史生成内容
   * 返回 GenerationRequest 供 Orchestrator 使用
   */
  async generateContentFromConversation(sessionId: string): Promise<GenerationRequest> {
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      throw new Error('会话不存在或已过期');
    }

    // 获取对话历史（排除系统消息和生成内容消息）
    const conversationHistory = session.messages
      .filter(m => m.role !== 'system' && m.role !== 'generated')
      .slice(-10); // 只取最新10条

    if (conversationHistory.length === 0) {
      throw new Error('对话历史为空，请先与 AI 对话');
    }

    // 构建生成提示词，包含摘要（如果有）
    const summaryContext = session.summary
      ? `\n\n【对话摘要】\n${session.summary}\n\n`
      : '';

    const generatePrompt = `${summaryContext}请仔细阅读以下对话历史，理解用户想要创作的主题和内容方向，然后生成一篇小红书笔记。

对话历史：
${conversationHistory.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n')}

**重要提示**：
- 必须基于对话历史中用户提到的具体主题和内容来创作
- 不要偏离用户在对话中表达的意图
- 如果用户提到了具体的场景、事件、感受，必须在笔记中体现
- 保持用户在对话中的语言风格和个性

请生成一篇完整的小红书笔记，要求：

**风格定位**：对话生成风格 - 基于用户对话内容，自然真实地表达用户的想法和感受，保持对话中的个性化特点。

**内容要求**：
1. 吸引人的标题（20字以内），必须与用户对话中的主题相关
2. 正文内容（200-500字，分段，使用 emoji）
   - 保持对话中的真实感和个性
   - 自然融入对话中提到的细节和感受
   - 语言风格贴近用户在对话中的表达方式
   - 内容必须围绕用户在对话中提到的主题展开
3. 3-5个相关话题标签（不要包含 # 符号），必须与对话主题相关
4. 根据内容类型决定需要1-3张配图
5. 为每张图片生成详细的英文图片提示词（描述画面内容、风格、氛围、光线等），图片内容必须与对话主题相关

**重要**：必须生成 1-3 张图片的提示词，每个提示词要详细描述画面。

请按以下 JSON 格式返回：
{
  "title": "标题",
  "content": "正文内容",
  "topics": ["话题1", "话题2", "话题3"],
  "style": "对话生成",
  "image_prompts": [
    "A detailed English prompt for image 1, describing the scene, style, lighting, and atmosphere",
    "A detailed English prompt for image 2",
    "A detailed English prompt for image 3"
  ]
}`;

    // 使用 AI 生成内容
    const formattedMessages = [
      {
        role: 'system' as const,
        content: '你是一个专业的小红书内容创作者。你的任务是仔细阅读用户的对话历史，理解用户想要创作的具体主题和内容方向，然后基于这些信息创作一篇高质量的小红书笔记。重要：必须严格基于对话内容，不要偏离用户表达的主题和意图。',
      },
      {
        role: 'user' as const,
        content: generatePrompt,
      },
    ];

    const result = await this.adapter.chatCompletion(formattedMessages, {
      temperature: 0.8,
      max_tokens: 2000,
    });

    if (!result.success || !result.content) {
      throw new Error('生成内容失败');
    }

    // 解析 JSON 响应
    let generatedContent;
    try {
      const jsonMatch = result.content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       result.content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : result.content;
      generatedContent = JSON.parse(jsonStr);
    } catch (error) {
      logger.error('解析生成内容失败', { error: (error as Error).message, content: result.content });
      throw new Error('生成的内容格式不正确');
    }

    // 构建 GenerationRequest
    const imagePrompts = generatedContent.imagePrompts || generatedContent.image_prompts || [];
    const imageCount = imagePrompts.length || 3;
    const style = generatedContent.style || '对话生成';

    const generationRequest: GenerationRequest = {
      topic: generatedContent.title || '未命名主题',
      style: style,
      keywords: generatedContent.topics || [],
      imageCount,
      autoPublish: false,
    };

    // 将生成的内容和图片提示词存储在 extra 字段中
    (generationRequest as any).extra = {
      title: generatedContent.title,
      content: generatedContent.content,
      topics: generatedContent.topics || [],
      imagePrompts,
      style,
    };

    logger.info('基于对话生成内容请求', { sessionId, imageCount, style });

    return generationRequest;
  }

  /**
   * 结束对话，转换为生成请求
   */
  finalize(sessionId: string): GenerationRequest {
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      throw new Error('会话不存在或已过期');
    }

    const req = session.extractedRequirements;

    if (!req.topic) {
      throw new Error('缺少必需的主题信息');
    }

    // 更新会话状态
    this.sessionStore.update(sessionId, { status: 'generating' });

    logger.info('结束对话，开始生成', { sessionId });

    return {
      topic: req.topic,
      style: req.style,
      keywords: req.keywords,
      imageCount: 3,  // 默认 3 张图片
      autoPublish: false,
    };
  }

  /**
   * 获取对话系统提示词
   */
  private getConversationSystemPrompt(): string {
    return `你是一个友好、自然的小红书内容创作助手。

你的角色：
- 像朋友一样和用户聊天，了解他们想创作的内容
- 不要像问卷调查一样机械地提问
- 根据用户的回复自然地展开对话
- 可以给出建议、分享想法、提供灵感

对话风格：
- 轻松自然，像朋友聊天
- 不要一次问太多问题
- 可以用 emoji 让对话更生动
- 适时给出创意建议和灵感

当用户描述他们想创作的内容时，你可以：
- 帮助他们完善想法
- 提供创作角度的建议
- 分享相关的创作技巧
- 讨论目标受众和内容风格

记住：你是在和用户**聊天**，不是在**采集需求**。保持对话的自然流畅。`;
  }

  /**
   * 生成开场白
   */
  private generateGreeting(): string {
    return '嗨！我是你的小红书创作助手 ✨\n\n今天想聊点什么？有什么想分享的内容吗？';
  }

  /**
   * 生成后续问题
   */
  private async generateFollowUpQuestion(
    messages: Message[],
    suggestedQuestion: string
  ): Promise<string> {
    try {
      // 过滤并转换消息格式
      const formattedMessages = messages
        .filter(m => m.role !== 'generated')
        .map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }));

      // 使用 AI 生成更自然的后续问题
      const result = await this.adapter.chatCompletion(
        [
          ...formattedMessages,
          {
            role: 'user',
            content: `基于对话历史，生成一个自然的后续问题。建议的问题方向：${suggestedQuestion}`,
          },
        ],
        {
          temperature: 0.7,
          max_tokens: 200,
        }
      );

      if (result.success && result.content) {
        return result.content.trim();
      }
    } catch (error) {
      logger.error('生成后续问题失败', { error: (error as Error).message });
    }

    // 降级：使用建议的问题
    return suggestedQuestion;
  }

  /**
   * 准备发送给 AI 的消息
   * 过滤掉系统消息和生成内容消息，只保留最新10条
   */
  private prepareMessagesForAI(session: ConversationSession): Message[] {
    // 过滤掉 system 和 generated 类型的消息
    const filteredMessages = session.messages.filter(
      (msg) => msg.role !== 'system' && msg.role !== 'generated'
    );

    // 只取最新10条
    const recentMessages = filteredMessages.slice(-10);

    // 获取系统消息
    const systemMessage = session.messages.find((msg) => msg.role === 'system');

    // 组合：系统消息 + 最新10条
    return systemMessage ? [systemMessage, ...recentMessages] : recentMessages;
  }

  /**
   * 生成 AI 回复和摘要
   */
  private async generateResponseWithSummary(
    messages: Message[],
    previousSummary?: string
  ): Promise<{ response: string; summary: string }> {
    try {
      // 过滤并转换消息格式
      const formattedMessages = messages
        .filter(m => m.role !== 'generated')
        .map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }));

      // 构建提示词，要求 AI 返回回复和摘要
      const summaryPrompt = {
        role: 'system' as const,
        content: `${previousSummary ? `\n\n【对话摘要】\n${previousSummary}\n\n` : ''}
请完成两个任务：
1. 根据用户的消息，生成自然友好的回复
2. 生成一个简洁的对话摘要（100字以内），概括到目前为止讨论的主要内容和要点

请按以下 JSON 格式返回：
{
  "response": "你的回复内容",
  "summary": "对话摘要"
}`,
      };

      const result = await this.adapter.chatCompletion([...formattedMessages, summaryPrompt], {
        temperature: 0.7,
        max_tokens: 500,
      });

      if (result.success && result.content) {
        try {
          // 尝试解析 JSON
          const parsed = JSON.parse(result.content.trim());
          return {
            response: parsed.response || result.content,
            summary: parsed.summary || '',
          };
        } catch {
          // JSON 解析失败，使用原始内容作为回复
          return {
            response: result.content.trim(),
            summary: previousSummary || '',
          };
        }
      }
    } catch (error) {
      logger.error('生成回复和摘要失败', { error: (error as Error).message });
    }

    // 降级：通用回复
    return {
      response: '好的，我明白了。还有其他要求吗？',
      summary: previousSummary || '',
    };
  }

  /**
   * 生成通用回复（保留用于兼容）
   */
  private async generateResponse(messages: Message[]): Promise<string> {
    try {
      // 过滤并转换消息格式
      const formattedMessages = messages
        .filter(m => m.role !== 'generated')
        .map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }));

      const result = await this.adapter.chatCompletion(formattedMessages, {
        temperature: 0.7,
        max_tokens: 300,
      });

      if (result.success && result.content) {
        return result.content.trim();
      }
    } catch (error) {
      logger.error('生成回复失败', { error: (error as Error).message });
    }

    // 降级：通用回复
    return '好的，我明白了。还有其他要求吗？';
  }
}
