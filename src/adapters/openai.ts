/**
 * OpenAI 适配器
 * 支持 GPT 文本模型和 DALL-E 图片模型
 */

import OpenAI from 'openai';
import { TextModelAdapter, ImageModelAdapter, ModelConfig, GenerateResult } from './base.js';

/**
 * OpenAI 文本模型适配器
 */
export class OpenAITextAdapter extends TextModelAdapter {
  private client: OpenAI | null = null;

  async initialize(): Promise<void> {
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
    this.log('OpenAI 文本模型初始化成功');
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) await this.initialize();
      
      await this.client!.models.list();
      this.log('连接测试成功');
      return true;
    } catch (error) {
      this.logError('连接测试失败', error);
      return false;
    }
  }

  async generateText(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      if (!this.client) await this.initialize();

      const response = await this.client!.chat.completions.create({
        model: options?.model || this.config.params?.model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || this.config.params?.temperature || 0.7,
        max_tokens: options?.maxTokens || this.config.params?.maxTokens || 2000,
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
        model: options?.model || this.config.params?.model || 'gpt-4',
        messages: messages as any,
        temperature: options?.temperature || this.config.params?.temperature || 0.7,
        max_tokens: options?.maxTokens || this.config.params?.maxTokens || 2000,
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

/**
 * OpenAI 图片模型适配器 (DALL-E)
 */
export class OpenAIImageAdapter extends ImageModelAdapter {
  private client: OpenAI | null = null;

  async initialize(): Promise<void> {
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
    this.log('OpenAI 图片模型初始化成功');
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

  async generateImage(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      if (!this.client) await this.initialize();

      const response = await this.client!.images.generate({
        model: options?.model || 'dall-e-3',
        prompt,
        n: options?.n || 1,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        response_format: options?.responseFormat || 'url',
      });

      const imageUrl = response.data?.[0]?.url || '';

      if (!imageUrl) {
        throw new Error('图片生成失败：未返回图片 URL');
      }

      this.log('图片生成成功', { prompt, imageUrl });

      return {
        success: true,
        content: imageUrl,
        metadata: {
          revisedPrompt: response.data?.[0]?.revised_prompt,
        },
      };
    } catch (error) {
      this.logError('图片生成失败', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}