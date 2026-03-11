/**
 * 会话存储管理器
 * 负责会话的创建、读取、更新、删除
 */

import { ConversationSession, Message, ExtractedRequirements } from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

/**
 * 会话存储接口
 */
export interface SessionStore {
  create(userId?: string): ConversationSession;
  get(sessionId: string): ConversationSession | null;
  update(sessionId: string, updates: Partial<ConversationSession>): void;
  delete(sessionId: string): void;
  addMessage(sessionId: string, message: Message): void;
  updateRequirements(sessionId: string, requirements: ExtractedRequirements): void;
  getStats(): { totalSessions: number; activeSessions: number; readySessions: number };
}

/**
 * 内存会话存储实现
 * 生产环境建议使用 Redis
 */
export class InMemorySessionStore implements SessionStore {
  private sessions: Map<string, ConversationSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 分钟

  constructor() {
    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // 每 5 分钟清理一次
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

    this.sessions.set(session.id, session);
    logger.info('创建新会话', { sessionId: session.id, userId });

    return session;
  }

  /**
   * 获取会话
   */
  get(sessionId: string): ConversationSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.warn('会话不存在', { sessionId });
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    const updatedAt = session.updatedAt.getTime();
    if (now - updatedAt > this.SESSION_TIMEOUT) {
      logger.warn('会话已过期', { sessionId });
      this.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * 更新会话
   */
  update(sessionId: string, updates: Partial<ConversationSession>): void {
    const session = this.get(sessionId);
    if (!session) {
      throw new Error(`会话不存在: ${sessionId}`);
    }

    Object.assign(session, updates, { updatedAt: new Date() });
    this.sessions.set(sessionId, session);

    logger.debug('更新会话', { sessionId, updates: Object.keys(updates) });
  }

  /**
   * 删除会话
   */
  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
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

    session.messages.push(message);
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

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

    session.extractedRequirements = requirements;
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

    logger.debug('更新需求信息', { sessionId, confidence: requirements.confidence });
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const updatedAt = session.updatedAt.getTime();
      if (now - updatedAt > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('清理过期会话', { count: cleanedCount });
    }
  }

  /**
   * 获取会话统计信息
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.status === 'active').length,
      readySessions: Array.from(this.sessions.values()).filter(s => s.status === 'ready').length,
    };
  }
}

// 导出单例实例
// 使用 SQLite 持久化存储，服务器重启后会话不会丢失
import { SqliteSessionStore } from './sqlite-session-store.js';
export const sessionStore = new SqliteSessionStore();

