'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ChatInterface } from '@/components/conversation/chat-interface';
import { useConversation } from '@/hooks/use-conversation';
import {
  MessageSquare,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle,
  Metronome,
} from 'lucide-react';

interface GeneratedContent {
  title: string;
  content: string;
  topics: string[];
  images: string[];
  style?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'generated';
  content: string;
  timestamp: Date;
  generatedContent?: GeneratedContent;
}

export default function ConversationPage() {
  const router = useRouter();
  const {
    sessionId,
    messages: conversationMessages,
    isLoading,
    error,
    summary,
    startConversation,
    sendMessage,
    reset,
  } = useConversation();

  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // 同步对话消息到显示消息列表
  useEffect(() => {
    // 直接使用 conversationMessages，不从 sessionStorage 读取
    // 这样用户消息会立即显示
    setDisplayMessages(prev => {
      // 保留已有的 generated 类型消息
      const generatedMessages = prev.filter(m => m.role === 'generated');

      // 合并对话消息和生成消息
      const conversationMsgs = conversationMessages.map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant' | 'generated',
      }));

      return [...conversationMsgs, ...generatedMessages];
    });
  }, [conversationMessages]);

  // 开始生成内容 - 基于整个对话历史
  const handleStartGeneration = async () => {
    if (conversationMessages.length === 0) {
      setResult({ success: false, message: '请先和 AI 对话，描述你想创作的内容' });
      return;
    }

    if (!sessionId) {
      setResult({ success: false, message: '会话未初始化' });
      return;
    }

    try {
      setIsGenerating(true);

      // 调用对话模式专用的生成 API
      const response = await fetch(`/api/conversation/${sessionId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success && data.data?.content) {
        // 将生成的内容作为消息添加到消息列表
        const generatedMessage: Message = {
          role: 'generated',
          content: '已生成内容',
          timestamp: new Date(),
          generatedContent: data.data.content,
        };

        setDisplayMessages(prev => [...prev, generatedMessage]);

        setResult({ success: true, message: '内容生成成功！' });

        setTimeout(() => {
          setResult(null);
        }, 3000);
      } else {
        // 如果是会话过期错误，提示用户刷新页面
        if (response.status === 404 || data.error?.includes('会话不存在')) {
          throw new Error('会话已过期，请刷新页面重新开始对话');
        }
        throw new Error(data.error || '生成失败');
      }
    } catch (error) {
      console.error('生成失败:', error);
      setResult({
        success: false,
        message: `生成失败：${(error as Error).message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 发布到小红书
  const handlePublish = async (content: GeneratedContent) => {
    try {
      setIsPublishing(true);

      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 发布成功，不显示全局提示，由 GeneratedContentMessage 组件内部处理
      } else {
        throw new Error(data.error || '发布失败');
      }
    } catch (error) {
      setResult({ success: false, message: `发布失败：${(error as Error).message}` });
      throw error;
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setResult({ success: true, message: '已复制到剪贴板！' });
      setTimeout(() => setResult(null), 2000);
    } catch (error) {
      setResult({ success: false, message: '复制失败' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#141414]">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
              <div className="h-6 w-px bg-white/10" />
              <MessageSquare className="w-5 h-5 text-pink-400" />
              <h1 className="text-lg font-semibold text-white">对话模式</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                startConversation();
              }}
              className="text-gray-400 hover:text-white"
            >
              重新开始
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full py-4 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* 左侧：对话区域 (2/3) */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {/* 聊天区域 - 固定高度，内部滚动 */}
            <div className="flex-1 flex flex-col border border-white/10 bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden">
              {/* 标题栏 */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-pink-400" />
                  <h2 className="text-white text-base font-semibold">消息列表</h2>
                </div>
              </div>

              {/* 聊天内容区域 */}
              <div className="flex-1 min-h-0">
                {sessionId ? (
                  <ChatInterface
                    messages={displayMessages}
                    isLoading={isLoading}
                    onSendMessage={sendMessage}
                    onPublish={handlePublish}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <MessageSquare className="w-16 h-16 text-gray-600 mx-auto" />
                      <p className="text-gray-400">还没有对话会话</p>
                      <Button
                        onClick={startConversation}
                        className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
                      >
                        开始对话
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：对话信息和生成按钮 */}
          <div className="lg:col-span-1 h-full overflow-y-auto space-y-4">
            {/* 对话信息卡片 */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Metronome className="w-4 h-4 text-pink-400" />对话摘要
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* 消息统计 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">消息数量</span>
                    <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs">
                      {conversationMessages.length} 条
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">对话状态</span>
                    <Badge className="bg-green-500/10 text-green-300 border-green-500/20 text-xs">
                      {conversationMessages.length > 0 ? '进行中' : '等待开始'}
                    </Badge>
                  </div>
                </div>

                {/* 对话摘要 */}
                {summary && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-300">对话摘要</h4>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* 准备状态 */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-xs text-green-300">
                    {conversationMessages.length === 0 && '开始对话后即可生成'}
                    {conversationMessages.length > 0 && conversationMessages.length < 3 && '继续对话以获得更好效果'}
                    {conversationMessages.length >= 3 && '已准备好生成内容'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 开始生成按钮 */}
            <Button
              onClick={handleStartGeneration}
              disabled={isGenerating || conversationMessages.length === 0}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium shadow-lg shadow-green-500/20 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  生成内容
                </>
              )}
            </Button>

            {/* 使用提示 */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">💡 使用提示</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-gray-400">
                  1. 直接和 AI 聊天，描述你想创作的内容
                </p>
                <p className="text-xs text-gray-400">
                  2. AI 会记录整个对话上下文
                </p>
                <p className="text-xs text-gray-400">
                  3. 随时点击’生成内容’按钮
                </p>
                <p className="text-xs text-gray-400">
                  4. 生成的内容会显示在消息列表中
                </p>
                <p className="text-xs text-gray-400">
                  5. 点击生成内容中的按钮即可发布
                </p>
              </CardContent>
            </Card>

            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-red-300 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* 结果提示 */}
      {result && (
        <div className="fixed bottom-4 right-4 max-w-md z-50">
          <Alert variant={result.success ? undefined : 'destructive'} className="bg-[#1a1a1a] border-white/10 shadow-lg">
            <AlertDescription className={result.success ? 'text-gray-300' : 'text-red-300'}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 text-sm">{result.message}</div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
