'use client';

import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex gap-2 w-full mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* 头像 */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-gradient-to-br from-pink-500 to-orange-500'
            : 'bg-gradient-to-br from-purple-500 to-blue-500'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* 消息内容 */}
      <div
        className={cn(
          'flex flex-col max-w-[75%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 shadow-sm',
            isUser
              ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-tr-sm'
              : 'bg-white/10 border border-white/10 text-gray-200 rounded-tl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 px-2">
          {timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
