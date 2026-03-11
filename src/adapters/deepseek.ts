/**
 * DeepSeek 适配器
 * 支持 DeepSeek Chat 和 Coder 模型
 */

import OpenAI from 'openai';
import { TextModelAdapter, ModelConfig, GenerateResult } from './base.js';
import { logger } from '../utils/logger.js';

/**
 * DeepSeek 文本模型适配器
 */
export class DeepSeekAdapter extends TextModelAdapter {
  private client: OpenAI | null = null;

  async initialize(): Promise<void> {
    // DeepSeek 兼容 OpenAI SDK
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl || 'https://api.deepseek.com/v1',
    });
    this.log('DeepSeek 模型初始化成功');
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) await this.initialize();
      
      const result = await this.client!.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      
      this.log('连接测试成功');
      return result.choices.length > 0;
    } catch (error) {
      this.logError('连接测试失败', error);
      return false;
    }
  }

  async generateText(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      if (!this.client) await this.initialize();

      const response = await this.client!.chat.completions.create({
        model: options?.model || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4000,
      });

      const content = response.choices[0]?.message?.content || '';
      
      this.log('文本生成成功', { promptLength: prompt.length, responseLength: content.length });

      return {
        success: true,
        content,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
      };
    } catch (error) {
      this.logError('文本生成失败', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: Record<string, any>
  ): Promise<GenerateResult<string>> {
    try {
      if (!this.client) await this.initialize();

      const response = await this.client!.chat.completions.create({
        model: options?.model || 'deepseek-chat',
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 4000,
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        success: true,
        content,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
      };
    } catch (error) {
      this.logError('聊天补全失败', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}