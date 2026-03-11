/**
 * 图片内容生成器
 * 使用图片模型生成小红书配图
 * 架构与文本生成器保持一致，使用配置文件加载提示词
 */

import { BaseGenerator, ContentRequest, GeneratedContent } from './base.js';
import { ImageModelAdapter } from '../adapters/base.js';
import { createCanvas } from 'canvas';
import { join } from 'path';
import { buildPrompt, buildMultiplePrompts } from '../prompts/image-loader.js';

/**
 * 图片生成器配置
 */
export interface ImageGeneratorConfig {
  adapter: ImageModelAdapter;
  defaultSize?: string;
  defaultStyle?: string;
}

/**
 * 图片生成器
 */
export class ImageGenerator extends BaseGenerator {
  private adapter: ImageModelAdapter;
  private defaultSize: string;
  private defaultStyle: string;

  constructor(config: ImageGeneratorConfig) {
    super('ImageGenerator');
    this.adapter = config.adapter;
    this.defaultSize = config.defaultSize || '1024x1024';
    this.defaultStyle = config.defaultStyle || '生活分享';
  }

  /**
   * 生成单张图片
   */
  async generate(request: ContentRequest): Promise<GeneratedContent> {
    return this.generateImages(request, request.imageCount || 1);
  }

  /**
   * 生成多张图片（每次一张，确保每张有不同的构图和视角）
   */
  private async generateImages(request: ContentRequest, count: number): Promise<GeneratedContent> {
    this.validateRequest(request);

    // 优先使用外部传入的图片提示词（来自文本生成器）
    let prompts: string[];
    if (request.extra?.imagePrompts && Array.isArray(request.extra.imagePrompts) && request.extra.imagePrompts.length > 0) {
      prompts = request.extra.imagePrompts;
      this.log('使用文本生成器提供的图片提示词', { count: prompts.length });

      // 如果提示词数量不足，补充生成
      if (prompts.length < count) {
        const additionalPrompts = buildMultiplePrompts(request.topic, request.style, request.content, count - prompts.length);
        prompts.push(...additionalPrompts);
        this.log('补充生成额外的图片提示词', { additional: additionalPrompts.length });
      }
    } else {
      // 为每张图片生成不同的提示词（使用不同的构图指南）
      prompts = buildMultiplePrompts(request.topic, request.style, request.content, count);
      this.log('自动生成图片提示词', { count: prompts.length });
    }

    this.log('生成图片', { topic: request.topic, style: request.style, count });

    const imageUrls: string[] = [];

    try {
      // 逐张生成，确保每张使用不同的提示词和构图
      for (let i = 0; i < count; i++) {
        const prompt = prompts[i];
        this.log(`生成第 ${i + 1} 张图片`, { prompt, index: i + 1 });

        const result = await this.adapter.generateImage(prompt, {
          size: this.defaultSize,
          style: request.style || this.defaultStyle,
          n: 1,  // 每次只生成一张，避免相似的图
        });

        if (result.success && result.content) {
          const url = typeof result.content === 'string' ? result.content.trim() : result.content;
          imageUrls.push(url);
          this.log(`第 ${i + 1} 张图片生成成功`, { index: i + 1 });
        }
      }
    } catch (error) {
      this.logError('AI 图片生成失败', error);
      // 降级：生成兜底图片
      const fallbackImages = await this.generateFallbackImages(request.topic, count);
      if (fallbackImages) {
        imageUrls.push(...fallbackImages);
      }
    }

    this.log('图片生成完成', { count: imageUrls.length });

    return {
      content: '',
      images: imageUrls,
      metadata: {
        prompts,
      },
    };
  }

  /**
   * 生成多张兜底图片
   */
  private async generateFallbackImages(topic: string, count: number): Promise<string[] | null> {
    const images: string[] = [];
    for (let i = 1; i <= count; i++) {
      const imageUrl = await this.generateFallbackImage(topic, i);
      if (imageUrl) {
        images.push(imageUrl);
      }
    }
    return images.length > 0 ? images : null;
  }

  /**
   * 兜底图片生成：创建渐变色背景图
   * 使用 Canvas 生成带有文字标题的渐变色图片
   */
  private async generateFallbackImage(topic: string, index: number = 1): Promise<string | null> {
    try {
      // 创建 1080x1440 的画布（小红书推荐比例 3:4）
      const width = 1080;
      const height = 1440;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // 生成渐变色背景（根据索引选择不同配色）
      const gradients = [
        { from: '#FF6B6B', to: '#FFE66D' }, // 红黄渐变
        { from: '#4ECDC4', to: '#556270' }, // 青灰渐变
        { from: '#A8E6CF', to: '#DCEDC1' }, // 绿色渐变
        { from: '#FFD3B5', to: '#FFAAA5' }, // 粉色渐变
        { from: '#D4FC79', to: '#96E6A1' }, // 嫩绿渐变
      ];

      const gradient = gradients[(index - 1) % gradients.length];

      // 创建线性渐变
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, gradient.from);
      grad.addColorStop(1, gradient.to);

      // 填充背景
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 添加装饰性圆形
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = 50 + Math.random() * 150;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 绘制标题文字（居中）
      const title = topic.length > 20 ? topic.substring(0, 20) + '...' : topic;

      // 主标题
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 72px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 添加文字阴影
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // 分两行显示（如果标题太长）
      const words = title.split(' ');
      let textY = height / 2;
      if (words.length > 2) {
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        ctx.fillText(line1, width / 2, textY - 40);
        ctx.fillText(line2, width / 2, textY + 40);
      } else {
        ctx.fillText(title, width / 2, textY);
      }

      // 重置阴影
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 添加副标题/标签
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '36px Arial, sans-serif';
      ctx.fillText('生活分享 · 真实记录', width / 2, height - 100);

      // 保存图片到本地
      const outputPath = join(process.cwd(), 'temp', `fallback-${Date.now()}-${index}.png`);

      // 确保 temp 目录存在
      const { mkdir, writeFile } = await import('fs/promises');
      await mkdir(join(process.cwd(), 'temp'), { recursive: true });

      const buffer = canvas.toBuffer('image/png');
      await writeFile(outputPath, buffer);

      this.log('兜底图片生成成功', { path: outputPath, size: buffer.length });

      return outputPath;
    } catch (error) {
      this.logError('兜底图片生成失败', error);
      return null;
    }
  }
}