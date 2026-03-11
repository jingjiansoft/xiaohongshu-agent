/**
 * MiniMax 适配器
 * 支持文本、图片、视频生成
 * API 文档: https://www.minimaxi.com/document/
 */

import { TextModelAdapter, ImageModelAdapter, VideoModelAdapter, ModelConfig, GenerateResult } from './base.js';

/**
 * MiniMax 文本模型适配器
 */
export class MiniMaxTextAdapter extends TextModelAdapter {
  private apiKey: string;
  private groupId: string;
  private baseUrl: string;

  constructor(config: ModelConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.groupId = config.params?.groupId || '';
    this.baseUrl = config.baseUrl || 'https://api.minimax.chat/v1/text/chatcompletion_v2';
  }

  async initialize(): Promise<void> {
    this.log('MiniMax 文本模型初始化成功');
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
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'abab6.5s-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature || 0.7,
        }),
      });

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';

      this.log('文本生成成功', { promptLength: prompt.length });

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
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'abab6.5s-chat',
          messages,
          temperature: options?.temperature || 0.7,
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
 * MiniMax 图片生成适配器
 */
export class MiniMaxImageAdapter extends ImageModelAdapter {
  private apiKey: string;

  constructor(config: ModelConfig) {
    super(config);
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<void> {
    this.log('MiniMax 图片模型初始化成功');
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async generateImage(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      const response = await fetch('https://api.minimax.chat/v1/image_generation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'image-01',
          prompt,
        }),
      });

      const data = await response.json() as any;
      const imageUrl = data.data?.image_url || '';

      this.log('图片生成成功', { prompt, imageUrl });

      return { success: true, content: imageUrl };
    } catch (error) {
      this.logError('图片生成失败', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

/**
 * MiniMax 视频生成适配器
 */
export class MiniMaxVideoAdapter extends VideoModelAdapter {
  private apiKey: string;

  constructor(config: ModelConfig) {
    super(config);
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<void> {
    this.log('MiniMax 视频模型初始化成功');
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async generateVideo(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      // 创建视频生成任务
      const response = await fetch('https://api.minimax.chat/v1/video_generation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'video-01',
          prompt,
        }),
      });

      const data = await response.json() as any;
      const taskId = data.task_id;

      this.log('视频生成任务已创建', { taskId, prompt });

      return {
        success: true,
        content: taskId,
        metadata: { taskId },
      };
    } catch (error) {
      this.logError('视频生成失败', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getVideoStatus(taskId: string): Promise<GenerateResult<{ status: string; progress: number; url?: string }>> {
    try {
      const response = await fetch(`https://api.minimax.chat/v1/video_generation/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json() as any;
      const status = data.status || 'pending';
      const progress = data.progress || 0;
      const url = data.file_id || undefined;

      return {
        success: true,
        content: { status, progress, url },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}