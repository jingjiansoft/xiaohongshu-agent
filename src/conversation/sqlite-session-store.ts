/**
 * SQLite 会话存储实现
 * 提供持久化的会话存储，服务器重启后会话不会丢失
 */

import Database from 'better-sqlite3';
import { ConversationSession, Message, ExtractedRequirements } from './types.js';
import { SessionStore } from './session-store.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * SQLite 会话存储实现
 */
export class SqliteSessionStore implements SessionStore {
  private db: Database.Database;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 分钟

  constructor(dbPath?: string) {
    // 默认存储在 data 目录
    const defaultPath = join(process.cwd(), 'data', 'sessions.db');
    const finalPath = dbPath || defaultPath;

    // 确保目录存在
    const dir = join(finalPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // 初始化数据库
    this.db = new Database(finalPath);
    this.initDatabase();

    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // 每 5 分钟清理一次

    logger.info('SQLite 会话存储已初始化', { path: finalPath });
  }

  /**
   * 初始化数据库表
   */
  private initDatabase(): void {
    // 创建会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        status TEXT NOT NULL,
        summary TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 迁移：为已存在的表添加 summary 字段
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN summary TEXT`);
      logger.info('已添加 sessions.summary 字段');
    } catch (error) {
      // 字段已存在，忽略错误
    }

    // 创建消息表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // 迁移：为已存在的表添加 summary 字段
    try {
      this.db.exec(`ALTER TABLE messages ADD COLUMN summary TEXT`);
      logger.info('已添加 messages.summary 字段');
    } catch (error) {
      // 字段已存在，忽略错误
    }

    // 创建需求表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requirements (
        session_id TEXT PRIMARY KEY,
        topic TEXT,
        style TEXT,
        keywords TEXT,
        audience TEXT,
        tone TEXT,
        requirements TEXT,
        confidence REAL NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);
    `);
  }

  /**
   * 创建新会话
   */
  create(userId?: string): ConversationSession {
    const session: ConversationSession = {
      id: uuidv4(),
      userId,
      messages: [],
      extractedRequirements: {
        confidence: 0,
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 插入会话记录
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, status, summary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.userId || null,
      session.status,
      null,
      session.createdAt.getTime(),
      session.updatedAt.getTime()
    );

    // 插入空的需求记录
    const reqStmt = this.db.prepare(`
      INSERT INTO requirements (session_id, confidence)
      VALUES (?, ?)
    `);
    reqStmt.run(session.id, 0);

    logger.info('创建新会话', { sessionId: session.id, userId });

    return session;
  }

  /**
   * 获取会话
   */
  get(sessionId: string): ConversationSession | null {
    // 获取会话基本信息
    const sessionStmt = this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `);
    const sessionRow = sessionStmt.get(sessionId) as any;

    if (!sessionRow) {
      logger.warn('会话不存在', { sessionId });
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - sessionRow.updated_at > this.SESSION_TIMEOUT) {
      logger.warn('会话已过期', { sessionId });
      this.delete(sessionId);
      return null;
    }

    // 获取消息列表
    const messagesStmt = this.db.prepare(`
      SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC
    `);
    const messageRows = messagesStmt.all(sessionId) as any[];

    const messages: Message[] = messageRows.map(row => ({
      role: row.role as 'user' | 'assistant' | 'system' | 'generated',
      content: row.content,
      timestamp: new Date(row.timestamp),
      summary: row.summary || undefined,
    }));

    // 获取需求信息
    const reqStmt = this.db.prepare(`
      SELECT * FROM requirements WHERE session_id = ?
    `);
    const reqRow = reqStmt.get(sessionId) as any;

    const extractedRequirements: ExtractedRequirements = {
      topic: reqRow?.topic || undefined,
      style: reqRow?.style || undefined,
      keywords: reqRow?.keywords ? JSON.parse(reqRow.keywords) : undefined,
      audience: reqRow?.audience || undefined,
      tone: reqRow?.tone || undefined,
      requirements: reqRow?.requirements ? JSON.parse(reqRow.requirements) : undefined,
      confidence: reqRow?.confidence || 0,
    };

    return {
      id: sessionRow.id,
      userId: sessionRow.user_id || undefined,
      messages,
      extractedRequirements,
      status: sessionRow.status,
      summary: sessionRow.summary || undefined,
      createdAt: new Date(sessionRow.created_at),
      updatedAt: new Date(sessionRow.updated_at),
    };
  }

  /**
   * 更新会话
   */
  update(sessionId: string, updates: Partial<ConversationSession>): void {
    const session = this.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    // 更新会话基本信息
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.summary !== undefined) {
      fields.push('summary = ?');
      values.push(updates.summary);
    }

    if (updates.userId !== undefined) {
      fields.push('user_id = ?');
      values.push(updates.userId);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());

    if (fields.length > 0) {
      values.push(sessionId);
      const stmt = this.db.prepare(`
        UPDATE sessions SET ${fields.join(', ')} WHERE id = ?
      `);
      stmt.run(...values);
    }

    logger.debug('更新会话', { sessionId, updates: Object.keys(updates) });
  }

  /**
   * 删除会话
   */
  delete(sessionId: string): void {
    // 由于设置了 ON DELETE CASCADE，删除会话会自动删除相关的消息和需求
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(sessionId);

    logger.info('删除会话', { sessionId });
  }

  /**
   * 添加消息
   */
  addMessage(sessionId: string, message: Message): void {
    const session = this.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    // 插入消息
    const stmt = this.db.prepare(`
      INSERT INTO messages (session_id, role, content, summary, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      message.role,
      message.content,
      message.summary || null,
      message.timestamp.getTime()
    );

    // 更新会话的 updated_at
    const updateStmt = this.db.prepare(`
      UPDATE sessions SET updated_at = ? WHERE id = ?
    `);
    updateStmt.run(Date.now(), sessionId);

    logger.debug('添加消息', { sessionId, role: message.role });
  }

  /**
   * 更新需求信息
   */
  updateRequirements(sessionId: string, requirements: ExtractedRequirements): void {
    const session = this.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    // 更新需求信息
    const stmt = this.db.prepare(`
      UPDATE requirements SET
        topic = ?,
        style = ?,
        keywords = ?,
        audience = ?,
        tone = ?,
        requirements = ?,
        confidence = ?
      WHERE session_id = ?
    `);

    stmt.run(
      requirements.topic || null,
      requirements.style || null,
      requirements.keywords ? JSON.stringify(requirements.keywords) : null,
      requirements.audience || null,
      requirements.tone || null,
      requirements.requirements ? JSON.stringify(requirements.requirements) : null,
      requirements.confidence,
      sessionId
    );

    // 更新会话的 updated_at
    const updateStmt = this.db.prepare(`
      UPDATE sessions SET updated_at = ? WHERE id = ?
    `);
    updateStmt.run(Date.now(), sessionId);

    logger.debug('更新需求信息', { sessionId, confidence: requirements.confidence });
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredTime = now - this.SESSION_TIMEOUT;

    const stmt = this.db.prepare(`
      DELETE FROM sessions WHERE updated_at < ?
    `);

    const result = stmt.run(expiredTime);

    if (result.changes > 0) {
      logger.info('清理过期会话', { count: result.changes });
    }
  }

  /**
   * 获取会话统计信息
   */
  getStats() {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions');
    const activeStmt = this.db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'active'");
    const readyStmt = this.db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'ready'");

    const total = (totalStmt.get() as any).count;
    const active = (activeStmt.get() as any).count;
    const ready = (readyStmt.get() as any).count;

    return {
      totalSessions: total,
      activeSessions: active,
      readySessions: ready,
    };
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
    logger.info('SQLite 会话存储已关闭');
  }
}

