'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Send,
  Copy,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface GeneratedContent {
  title: string;
  content: string;
  topics: string[];
  images: string[];
  style?: string;
}

interface GeneratedContentMessageProps {
  content: GeneratedContent;
  timestamp: Date;
  onPublish?: () => Promise<void>;
}

export function GeneratedContentMessage({
  content,
  timestamp,
  onPublish,
}: GeneratedContentMessageProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setPublishResult({ success: true, message: '已复制' });
      setTimeout(() => setPublishResult(null), 2000);
    } catch (error) {
      setPublishResult({ success: false, message: '复制失败' });
    }
  };

  const handlePublish = async () => {
    if (!onPublish) return;

    try {
      setIsPublishing(true);
      await onPublish();
      setPublishResult({ success: true, message: '发布成功！' });
    } catch (error) {
      setPublishResult({
        success: false,
        message: `发布失败：${(error as Error).message}`,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex gap-2 w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* AI 头像 */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-500">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      {/* 生成内容卡片 */}
      <div className="flex-1 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 overflow-hidden shadow-lg">
          {/* 头部 */}
          <div className="px-4 py-3 bg-green-500/10 border-b border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-green-300">
                  AI 生成的内容
                </span>
              </div>
              {content.style && (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                  {content.style}
                </Badge>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-4 space-y-3">
            {/* 标题 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  标题
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(content.title)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-base font-bold text-white leading-snug">
                {content.title}
              </p>
            </div>

            {/* 正文 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  正文
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(content.content)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded-lg bg-black/20 p-3">
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {content.content}
                </p>
              </div>
            </div>

            {/* 话题标签 */}
            {content.topics.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  话题标签
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {content.topics.map((topic, i) => {
                    // 移除 topic 中已有的 # 符号
                    const cleanTopic = topic.replace(/^#+/, '');
                    return (
                      <Badge
                        key={i}
                        className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 cursor-pointer text-xs border border-blue-500/30 transition-colors"
                        onClick={() => copyToClipboard('#' + cleanTopic)}
                      >
                        #{cleanTopic}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 图片预览 */}
            {content.images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-gray-400">
                    配图 ({content.images.length} 张)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {content.images.map((img, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-black/20 rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-colors"
                    >
                      {img.startsWith('temp/') || img.includes('http') ? (
                        <img
                          src={img}
                          alt={`图片${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          图片 {i + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 发布按钮 */}
            <div className="pt-2">
              <Button
                onClick={handlePublish}
                disabled={isPublishing || !onPublish}
                className="w-full h-11 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-medium shadow-lg shadow-pink-500/20 disabled:opacity-50 transition-all"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    发布到小红书
                  </>
                )}
              </Button>
            </div>

            {/* 发布结果提示 */}
            {publishResult && (
              <div
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-lg text-xs',
                  publishResult.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                )}
              >
                {publishResult.success ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{publishResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* 时间戳 */}
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
