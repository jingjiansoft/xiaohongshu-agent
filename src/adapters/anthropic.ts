/**
 * Anthropic Claude 适配器
 */

import Anthropic from '@anthropic-ai/sdk';
import { TextModelAdapter, ModelConfig, GenerateResult } from './base.js';
import { logger } from '../utils/logger.js';

export class ClaudeAdapter extends TextModelAdapter {
  private client: Anthropic | null = null;

  async initialize(): Promise<void> {
    this.client = new Anthropic({ apiKey: this.config.apiKey });
    this.log('Claude 模型初始化成功');
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) await this.initialize();
      return true;
    } catch (error) {
      this.logError('连接测试失败', error);
      return false;
    }
  }

  async generateText(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      if (!this.client) await this.initialize();

      const message = await this.client!.messages.create({
        model: options?.model || 'claude-3-opus-20240229',
        max_tokens: options?.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      
      return {
        success: true,
        content,
        usage: {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logError('文本生成失败', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: Record<string, any>
  ): Promise<GenerateResult<string>> {
    try {
      if (!this.client) await this.initialize();

      const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');

      const message = await this.client!.messages.create({
        model: options?.model || 'claude-3-opus-20240229',
        max_tokens: options?.maxTokens || 4096,
        system: systemPrompt,
        messages: userMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      });

      const content = message.content[0].type === 'text' ? message.content[0].text : '';

      return {
        success: true,
        content,
        usage: {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logError('聊天补全失败', error);
      return { success: false, error: (error as Error).message };
    }
  }
}