/**
 * 智谱 GLM 适配器
 * 支持 GLM-4 文本模型、CogView 图片生成
 */

import { TextModelAdapter, ImageModelAdapter, ModelConfig, GenerateResult } from './base.js';

/**
 * 智谱 GLM 文本模型适配器
 * API 文档: https://open.bigmodel.cn/dev/api
 */
export class GLMTextAdapter extends TextModelAdapter {
  private apiKey: string;
  private baseUrl: string = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  constructor(config: ModelConfig) {
    super(config);
    this.apiKey = config.apiKey;
    if (config.baseUrl) this.baseUrl = config.baseUrl;
  }

  async initialize(): Promise<void> {
    this.log('智谱 GLM 文本模型初始化成功');
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.generateText('你好');
      return result.success;
    } catch (error) {
      return false;
    }
  }

  async generateText(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      const model = options?.model || 'glm-4';
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 2000,
        }),
      });

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';

      this.log('文本生成成功', { model, promptLength: prompt.length });

      return { success: true, content, usage: data.usage };
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
      const model = options?.model || 'glm-4';
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 2000,
        }),
      });

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';

      return { success: true, content };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

/**
 * 智谱 CogView 图片生成适配器
 */
export class CogViewImageAdapter extends ImageModelAdapter {
  private apiKey: string;

  constructor(config: ModelConfig) {
    super(config);
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<void> {
    this.log('智谱 CogView 图片模型初始化成功');
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async generateImage(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'cogview-3',
          prompt,
          size: options?.size || '1024x1024',
        }),
      });

      const data = await response.json() as any;
      const imageUrl = data.data?.[0]?.url || '';

      this.log('图片生成成功', { prompt, imageUrl });

      return { success: true, content: imageUrl };
    } catch (error) {
      this.logError('图片生成失败', error);
      return { success: false, error: (error as Error).message };
    }
  }
}