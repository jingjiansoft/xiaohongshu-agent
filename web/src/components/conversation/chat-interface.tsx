'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageBubble } from './message-bubble';
import { GeneratedContentMessage } from './generated-content-message';
import { Send, Loader2 } from 'lucide-react';

interface GeneratedContent {
  title: string;
  content: string;
  topics: string[];
  images: string[];
}

interface Message {
  role: 'user' | 'assistant' | 'generated';
  content: string;
  timestamp: Date;
  generatedContent?: GeneratedContent;
}

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onPublish?: (content: GeneratedContent) => Promise<void>;
}

export function ChatInterface({ messages, isLoading, onSendMessage, onPublish }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // 检查是否在底部
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const threshold = 50; // 50px 的容差
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    return isAtBottom;
  };

  // 处理滚动事件
  const handleScroll = () => {
    setShouldAutoScroll(checkIfAtBottom());
  };

  // 自动滚动到底部（仅当用户在底部时）
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // 自动聚焦输入框
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.map((message, index) => {
          // 如果是生成内容消息
          if (message.role === 'generated' && message.generatedContent) {
            return (
              <GeneratedContentMessage
                key={index}
                content={message.generatedContent}
                timestamp={message.timestamp}
                onPublish={onPublish ? () => onPublish(message.generatedContent!) : undefined}
              />
            );
          }

          // 普通消息
          return (
            <MessageBubble
              key={index}
              role={message.role as 'user' | 'assistant'}
              content={message.content}
              timestamp={message.timestamp}
            />
          );
        })}

        {/* 加载指示器 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">AI 正在思考...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t border-white/10 bg-white/5 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的回复..."
            disabled={isLoading}
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-pink-500/50"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
