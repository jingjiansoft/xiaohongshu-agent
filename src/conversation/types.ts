/**
 * 对话系统类型定义
 */

/**
 * 对话消息
 */
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'generated';
  content: string;
  timestamp: Date;
  summary?: string; // AI 生成的对话摘要（仅 assistant 消息包含）
}

/**
 * 提取的需求信息
 */
export interface ExtractedRequirements {
  topic?: string;           // 主题
  style?: string;           // 风格
  keywords?: string[];      // 关键词
  audience?: string;        // 目标受众
  tone?: string;            // 语气
  requirements?: string[];  // 特殊要求
  confidence: number;       // 提取置信度 (0-1)
}

/**
 * 准备度状态
 */
export interface ReadinessStatus {
  ready: boolean;           // 是否准备好
  missingFields: string[];  // 缺失的字段
  nextQuestion?: string;    // 下一个引导问题
  confidence: number;       // 准备度置信度
}

/**
 * 对话会话
 */
export interface ConversationSession {
  id: string;
  userId?: string;
  messages: Message[];
  extractedRequirements: ExtractedRequirements;
  status: 'active' | 'ready' | 'generating' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  summary?: string; // 当前对话摘要
}

/**
 * 对话响应
 */
export interface ConversationResponse {
  message: string;                              // AI 回复
  extractedRequirements: ExtractedRequirements; // 当前提取的需求
  readinessStatus: ReadinessStatus;             // 准备度状态
  suggestions?: string[];                       // 建议（可选）
  summary?: string;                             // 对话摘要
}

/**
 * 生成请求（从对话会话转换而来）
 */
export interface GenerationRequest {
  topic: string;
  style?: string;
  keywords?: string[];
  imageCount?: number;
  autoPublish?: boolean;
}
