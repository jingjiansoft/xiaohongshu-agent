/**
 * 小红书自动发布 Agent - 主入口
 * 
 * 导出所有模块供外部使用
 */

// 导出核心 Agent
export { XiaohongshuAgent, createAgent } from './agent.js';
export type { AgentConfig, GenerateContentRequest } from './agent.js';

// 导出模型适配器
export * from './adapters/index.js';

// 导出内容生成器
export * from './generators/index.js';

// 导出核心模块（注意：PublishResult 只从 publisher 导出）
export { Orchestrator } from './core/orchestrator.js';
export type { OrchestratorConfig, PublishTask } from './core/orchestrator.js';
export * from './core/publisher.js';
export * from './core/browser.js';
export { cookieManager } from './core/cookie-manager.js';
export type { SavedCookie, CookieFile } from './core/cookie-manager.js';

// 导出配置和工具
export { loadConfig } from './config.js';
export { logger } from './utils/logger.js';