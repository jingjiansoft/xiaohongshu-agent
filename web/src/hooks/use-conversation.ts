'use client';

import { useState, useCallback, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExtractedRequirements {
  topic?: string;
  style?: string;
  keywords?: string[];
  audience?: string;
  tone?: string;
  requirements?: string[];
  confidence: number;
}

interface ReadinessStatus {
  ready: boolean;
  missingFields: string[];
  nextQuestion?: string;
  confidence: number;
}

interface ConversationState {
  sessionId: string | null;
  messages: Message[];
  extractedRequirements: ExtractedRequirements;
  readinessStatus: ReadinessStatus | null;
  isLoading: boolean;
  error: string | null;
  summary?: string; // 对话摘要
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 从 sessionStorage 恢复会话数据
const getStoredSession = (): { sessionId: string | null; messages: Message[]; summary?: string } => {
  if (typeof window === 'undefined') return { sessionId: null, messages: [] };

  const sessionId = sessionStorage.getItem('conversation_session_id');
  const messagesJson = sessionStorage.getItem('conversation_messages');
  const summary = sessionStorage.getItem('conversation_summary') || undefined;

  let messages: Message[] = [];
  if (messagesJson) {
    try {
      const parsed = JSON.parse(messagesJson);
      messages = parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } catch (error) {
      console.error('Failed to parse stored messages:', error);
    }
  }

  return { sessionId, messages, summary };
};

// 保存会话数据到 sessionStorage
const storeSession = (sessionId: string, messages: Message[], summary?: string) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('conversation_session_id', sessionId);
  sessionStorage.setItem('conversation_messages', JSON.stringify(messages));
  if (summary) {
    sessionStorage.setItem('conversation_summary', summary);
  }
};

// 清除会话数据
const clearStoredSession = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('conversation_session_id');
  sessionStorage.removeItem('conversation_messages');
  sessionStorage.removeItem('conversation_summary');
};

export function useConversation() {
  // 初始状态不从 sessionStorage 读取，避免 hydration 错误
  const [state, setState] = useState<ConversationState>({
    sessionId: null,
    messages: [],
    extractedRequirements: { confidence: 0 },
    readinessStatus: null,
    isLoading: false,
    error: null,
    summary: undefined,
  });

  // 在客户端挂载后恢复会话数据
  useEffect(() => {
    const storedSession = getStoredSession();
    console.log('[useConversation] Restoring session:', storedSession);

    if (storedSession.sessionId) {
      setState(prev => ({
        ...prev,
        sessionId: storedSession.sessionId,
        messages: storedSession.messages,
        summary: storedSession.summary,
      }));
    }
  }, []);

  /**
   * 开始新对话
   */
  const startConversation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_URL}/api/conversation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        const newMessages = [
          {
            role: 'assistant' as const,
            content: data.data.message,
            timestamp: new Date(),
          },
        ];

        console.log('[useConversation] New conversation started:', data.data.sessionId);

        // 保存到 sessionStorage
        storeSession(data.data.sessionId, newMessages);

        setState(prev => ({
          ...prev,
          sessionId: data.data.sessionId,
          messages: newMessages,
          isLoading: false,
        }));
      } else {
        throw new Error(data.error || '开始对话失败');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message,
      }));
    }
  }, []);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!state.sessionId) {
      throw new Error('会话未初始化');
    }

    const currentSessionId = state.sessionId;

    // 添加用户消息到 UI
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch(`${API_URL}/api/conversation/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date(),
        };

        setState(prev => {
          const newMessages = [...prev.messages, aiMessage];
          const newSummary = data.data.summary;

          // 保存到 sessionStorage
          storeSession(currentSessionId, newMessages, newSummary);

          return {
            ...prev,
            messages: newMessages,
            extractedRequirements: data.data.extractedRequirements,
            readinessStatus: data.data.readinessStatus,
            summary: newSummary, // 更新摘要
            isLoading: false,
          };
        });
      } else {
        throw new Error(data.error || '发送消息失败');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message,
      }));
    }
  }, [state.sessionId]);

  /**
   * 开始生成内容
   */
  const startGeneration = useCallback(async () => {
    if (!state.sessionId) {
      throw new Error('会话未初始化');
    }

    const currentSessionId = state.sessionId;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `${API_URL}/api/conversation/${currentSessionId}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (data.success) {
        return data.data.generationRequest;
      } else {
        throw new Error(data.error || '开始生成失败');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message,
      }));
      throw error;
    }
  }, [state.sessionId]);

  /**
   * 重置对话
   */
  const reset = useCallback(() => {
    clearStoredSession(); // 清除 sessionStorage

    setState({
      sessionId: null,
      messages: [],
      extractedRequirements: { confidence: 0 },
      readinessStatus: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    startConversation,
    sendMessage,
    startGeneration,
    reset,
  };
}
