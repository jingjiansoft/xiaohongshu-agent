/**
 * 统一数据存储管理器
 * 使用 SQLite 统一管理所有持久化数据
 *
 * 表结构：
 * - settings: 系统配置（用户配置、模型配置等）
 * - cookies: Cookie 存储
 * - sessions: 会话数据（已在 sqlite-session-store.ts 中）
 * - messages: 消息数据（已在 sqlite-session-store.ts 中）
 * - requirements: 需求数据（已在 sqlite-session-store.ts 中）
 * - content_history: 生成历史
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export interface SettingRow {
  key: string;
  value: string;
  category: 'user_profile' | 'model_config' | 'system';
  updated_at: number;
}

export interface CookieRow {
  id: string;
  data: string;
  updated_at: number;
}

export interface ContentHistoryRow {
  id: string;
  topic: string;
  style: string;
  title: string;
  content: string;
  topics: string;
  images: string;
  status: 'generated' | 'published' | 'failed';
  note_url?: string;
  created_at: number;
}

/**
 * 统一数据存储管理器
 */
export class UnifiedStorage {
  private db: Database.Database;
  private static instance: UnifiedStorage | null = null;

  private constructor(dbPath?: string) {
    const defaultPath = join(process.cwd(), 'data', 'agent.db');
    const finalPath = dbPath || defaultPath;

    // 确保目录存在
    const dir = join(finalPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // 初始化数据库
    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL'); // 启用 WAL 模式，提高并发性能
    this.db.pragma('cache_size = -64000'); // 64MB 缓存
    this.initDatabase();

    logger.info('统一数据存储已初始化', { path: finalPath });
  }

  /**
   * 获取单例实例
   */
  static getInstance(dbPath?: string): UnifiedStorage {
    if (!UnifiedStorage.instance) {
      UnifiedStorage.instance = new UnifiedStorage(dbPath);
    }
    return UnifiedStorage.instance;
  }

  /**
   * 初始化数据库表
   */
  private initDatabase(): void {
    // 设置表 - 存储用户配置、模型配置等
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Cookie 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cookies (
        id TEXT PRIMARY KEY DEFAULT 'main',
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 生成历史表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_history (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        style TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        topics TEXT NOT NULL,
        images TEXT NOT NULL,
        status TEXT NOT NULL,
        note_url TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
      CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);
      CREATE INDEX IF NOT EXISTS idx_content_history_status ON content_history(status);
      CREATE INDEX IF NOT EXISTS idx_content_history_created_at ON content_history(created_at);
    `);

    logger.info('数据库表初始化完成');
  }

  // ==================== Settings 操作 ====================

  /**
   * 保存设置
   */
  saveSetting(key: string, value: any, category: 'user_profile' | 'model_config' | 'system'): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, category, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(key, JSON.stringify(value), category, Date.now());
    logger.debug('保存设置', { key, category });
  }

  /**
   * 获取设置
   */
  getSetting<T>(key: string): T | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  }

  /**
   * 删除设置
   */
  deleteSetting(key: string): void {
    const stmt = this.db.prepare('DELETE FROM settings WHERE key = ?');
    stmt.run(key);
  }

  /**
   * 获取某类的所有设置
   */
  getSettingsByCategory<T>(category: 'user_profile' | 'model_config' | 'system'): Record<string, T> {
    const stmt = this.db.prepare('SELECT key, value FROM settings WHERE category = ?');
    const rows = stmt.all(category) as { key: string; value: string }[];
    const result: Record<string, T> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value) as T;
      } catch {
        // 忽略解析错误
      }
    }
    return result;
  }

  // ==================== Cookies 操作 ====================

  /**
   * 保存 Cookie
   */
  saveCookies(data: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cookies (id, data, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run('main', JSON.stringify(data), Date.now());
    logger.debug('保存 Cookie');
  }

  /**
   * 获取 Cookie
   */
  getCookies<T>(): T | null {
    const stmt = this.db.prepare('SELECT data FROM cookies WHERE id = ?');
    const row = stmt.get('main') as { data: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.data) as T;
    } catch {
      return null;
    }
  }

  // ==================== Content History 操作 ====================

  /**
   * 添加生成历史
   */
  addContentHistory(history: Omit<ContentHistoryRow, 'id' | 'created_at'>): string {
    const id = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO content_history (id, topic, style, title, content, topics, images, status, note_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      history.topic,
      history.style,
      history.title,
      history.content,
      history.topics,
      history.images,
      history.status,
      history.note_url || null,
      Date.now()
    );
    logger.info('添加生成历史', { id, topic: history.topic });
    return id;
  }

  /**
   * 获取生成历史
   */
  getContentHistory(limit: number = 20, offset: number = 0): ContentHistoryRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM content_history
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset) as any[];
    return rows.map(row => ({
      ...row,
      topics: JSON.parse(row.topics),
      images: JSON.parse(row.images),
    }));
  }

  /**
   * 更新历史状态
   */
  updateHistoryStatus(id: string, status: 'generated' | 'published' | 'failed', noteUrl?: string): void {
    const stmt = this.db.prepare(`
      UPDATE content_history SET status = ?, note_url = ? WHERE id = ?
    `);
    stmt.run(status, noteUrl || null, id);
  }

  // ==================== 工具方法 ====================

  /**
   * 执行事务
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
    logger.info('统一数据存储已关闭');
  }

  /**
   * 清空所有数据（开发/测试用）
   */
  clearAll(): void {
    this.db.exec('DELETE FROM content_history');
    this.db.exec('DELETE FROM cookies');
    this.db.exec('DELETE FROM settings');
    logger.warn('已清空所有数据');
  }
}

// 导出辅助函数，方便现有代码迁移
const storage = UnifiedStorage.getInstance();

export function saveSetting(key: string, value: any, category: 'user_profile' | 'model_config' | 'system'): void {
  storage.saveSetting(key, value, category);
}

export function getSetting<T>(key: string): T | null {
  return storage.getSetting<T>(key);
}

export function saveCookies(data: any): void {
  storage.saveCookies(data);
}

export function getCookies<T>(): T | null {
  return storage.getCookies<T>();
}

export function addContentHistory(history: Omit<ContentHistoryRow, 'id' | 'created_at'>): string {
  return storage.addContentHistory(history);
}

export function getContentHistory(limit?: number, offset?: number): ContentHistoryRow[] {
  return storage.getContentHistory(limit, offset);
}
