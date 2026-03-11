/**
 * 阿里云通义千问适配器
 * 支持 Qwen 文本模型、通义万相图片生成
 */

import { TextModelAdapter, ImageModelAdapter, ModelConfig, GenerateResult } from './base.js';
import { logger } from '../utils/logger.js';

/**
 * 通义千问文本模型适配器
 */
export class QwenTextAdapter extends TextModelAdapter {
  private apiKey: string;
  private baseUrl: string = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

  constructor(config: ModelConfig) {
    super(config);
    this.apiKey = config.apiKey;
    if (config.baseUrl) this.baseUrl = config.baseUrl;
  }

  async initialize(): Promise<void> {
    this.log('通义千问文本模型初始化成功');
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
      const model = options?.model || 'qwen-max';
      
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
      const model = options?.model || 'qwen-max';
      
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
 * 通义万相图片生成适配器
 */
export class QwenImageAdapter extends ImageModelAdapter {
  private apiKey: string;
  // 通义千问文生图 API 端点（北京地域）
  private apiEndpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

  constructor(config: ModelConfig) {
    super(config);
    this.apiKey = config.apiKey;
  }

  async initialize(): Promise<void> {
    this.log('通义千问文生图模型初始化成功');
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.generateImage('测试图片', { model: 'qwen-image-2.0' });
      return result.success || result.error?.includes('任务失败') === false;
    } catch (error) {
      return false;
    }
  }

  async generateImage(prompt: string, options?: Record<string, any>): Promise<GenerateResult<string>> {
    try {
      // 通义千问文生图模型：qwen-image-2.0, qwen-image-2.0-pro (支持 1-6 张图片)
      const model = options?.model || 'qwen-image-2.0';

      // 通义千问文生图支持的尺寸格式：1024*1024, 720*1280, 1280*720, 1440*720, 720*1440, 1088*1088
      let size = '1024*1024';
      if (options?.size) {
        // 将 1024x1024 格式转换为 1024*1024
        size = options.size.replace('x', '*');
      }

      // 支持生成多张图片 (qwen-image-2.0 系列支持 1-6 张)
      logger.info('开始调用通义千问文生图 API', { prompt, model, size });

      // 构建 negative_prompt
      const negativePrompt = options?.negativePrompt || '低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有 AI 感，构图混乱，文字模糊，扭曲';

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          input: {
            messages: [
              {
                role: 'user',
                content: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          },
          parameters: {
            negative_prompt: negativePrompt,
            prompt_extend: true, // 自动优化提示词
            watermark: false,    // 不添加水印
            size: size,
            n: options?.n || 1,       // 生成图片数量 (qwen-image-2.0 系列支持 1-6)
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('通义千问文生图 API 调用失败', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`API 请求失败：${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      logger.info('通义千问文生图 API 响应', { request_id: data.request_id });

      // 同步返回结果，解析图片 URL
      // 格式：data.output.choices[0].message.content[0].image
      const content = data.output?.choices?.[0]?.message?.content;
      
      // 提取第一个图片 URL
      const imageUrl = content?.[0]?.image || '';

      if (!imageUrl) {
        logger.error('未获取到图片 URL', { output: JSON.stringify(data.output) });
        throw new Error('未获取到图片 URL');
      }

      logger.info('通义千问文生图图片生成成功', imageUrl);

      // 如果生成多张图片，返回逗号分隔的 URL 字符串
      return {
        success: true,
        content: imageUrl,
        metadata: {
          imageCount: 1,
        }
      };
    } catch (error) {
      logger.error('通义千问文生图图片生成失败', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  }
}