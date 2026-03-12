/**
 * 配置和数据存储统一导出
 *
 * 使用统一存储方案后的配置管理：
 * - 用户配置：使用 configCache 缓存 + 文件存储
 * - 模型配置：使用 configCache 缓存 + 文件存储
 * - 会话数据：使用 SQLite 持久化存储
 * - Cookie：使用 SQLite 持久化存储
 * - 生成历史：使用 SQLite 持久化存储
 */

// 配置管理（带缓存）
export { UserProfileManager, getUserProfile, getUserKeywords, getBannedWords } from '../config/user-profile.js';
export { ModelConfigManager, modelConfigManager } from '../config/model-config.js';

// 统一存储
export {
  UnifiedStorage,
  saveSetting,
  getSetting,
  saveCookies,
  getCookies,
  addContentHistory,
  getContentHistory,
} from './unified-storage.js';

// 缓存管理
export {
  CacheManager,
  globalCache,
  promptsCache,
  configCache,
} from '../utils/cache.js';
