/**
 * 配置文件
 * 管理所有配置项和常量
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
dotenvConfig({ path: resolve(process.cwd(), '.env') });

export interface Config {
  browser: {
    headless: boolean;
    slowMo: number;
    timeout: number;
  };

  xiaohongshu: {
    baseUrl: string;
    publishUrl: string;
    loginUrl: string;
  };
  
  publishLimit: {
    maxPerDay: number;
    minIntervalMs: number;
  };
  
  contentGeneration: {
    provider: 'openai' | 'anthropic' | 'qwen' | 'glm' | 'deepseek' | 'minimax';
    model: string;
    apiKey: string;
  };
}

export const defaultConfig: Config = {
  browser: {
    headless: false,
    slowMo: 100,
    timeout: 30000,
  },

  xiaohongshu: {
    baseUrl: 'https://creator.xiaohongshu.com',
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
    loginUrl: 'https://creator.xiaohongshu.com/login',
  },
  
  publishLimit: {
    maxPerDay: 5,
    minIntervalMs: 30 * 60 * 1000,
  },
  
  contentGeneration: {
    provider: 'qwen',
    model: 'qwen-max',
    apiKey: process.env.TEXT_API_KEY || '',
  },
};

export function loadConfig(): Config {
  return {
    ...defaultConfig,
    contentGeneration: {
      ...defaultConfig.contentGeneration,
      apiKey: process.env.TEXT_API_KEY || '',
    },
  };
}

// 导出提示词配置加载器
export { 
  PromptsManager, 
  promptsManager, 
  getStyleConfig, 
  getAllStyleNames, 
  buildPrompt 
} from './prompts/loader.js';
export type { StyleConfig, PromptsConfig } from './prompts/loader.js';