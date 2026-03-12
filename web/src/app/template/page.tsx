'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Loader2, Send, Image as ImageIcon, Sparkles,
  CheckCircle, XCircle, FileText, AlertCircle,
  RefreshCw, Copy, X, ArrowLeft, ArrowRight,
  History, Trash2
} from 'lucide-react';

interface GeneratedContent {
  title: string;
  content: string;  // 后端返回的是 content
  topics: string[];
  images: string[];
}

interface GenerateHistory {
  id: string;
  topic: string;
  style: string;
  timestamp: Date;
  content: GeneratedContent;
}

const STYLES = [
  { value: '生活分享', label: '生活分享', emoji: '🏠', desc: '真实接地气，像朋友聊天' },
  { value: '清新自然', label: '清新自然', emoji: '🌸', desc: '温柔治愈，如春风拂面' },
  { value: '专业干货', label: '专业干货', emoji: '📚', desc: '结构清晰，信息密度高' },
  { value: '种草推荐', label: '种草推荐', emoji: '🛍️', desc: '真诚推荐，突出亮点' },
  { value: '情感共鸣', label: '情感共鸣', emoji: '💭', desc: '细腻走心，引发共鸣' },
  { value: '幽默搞笑', label: '幽默搞笑', emoji: '😂', desc: '轻松有趣，段子手风格' },
  { value: '文艺复古', label: '文艺复古', emoji: '📜', desc: '文艺范儿，复古调调' },
  { value: '旅行游记', label: '旅行游记', emoji: '✈️', desc: '身临其境，有攻略有感受' },
  { value: '美食探店', label: '美食探店', emoji: '🍜', desc: '色香味俱全，实用种草' },
  { value: '学习成长', label: '学习成长', emoji: '📖', desc: '自律上进，方法论' },
  { value: '职场进阶', label: '职场进阶', emoji: '💼', desc: '专业实用，职场智慧' },
];

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#141414] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 模型配置
  const [modelConfig, setModelConfig] = useState<{
    textProvider: string;
    imageProvider: string;
    textApiKeySet: boolean;
    imageApiKeySet: boolean;
  } | null>(null);

  // 表单状态
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('生活分享');
  const [keywords, setKeywords] = useState('');
  const [imageCount, setImageCount] = useState(3);

  // 生成的内容
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // 状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 进度
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateStatus, setGenerateStatus] = useState('');
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStatus, setPublishStatus] = useState('');

  // 生成历史
  const [history, setHistory] = useState<GenerateHistory[]>([]);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // 图片预览
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  const openImagePreview = (img: string, index: number) => {
    setPreviewImage(img);
    setPreviewIndex(index);
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
  };

  const navigateImage = (direction: number) => {
    if (!generatedContent) return;
    const newIndex = (previewIndex + direction + generatedContent.images.length) % generatedContent.images.length;
    setPreviewIndex(newIndex);
    setPreviewImage(generatedContent.images[newIndex]);
  };

  // 加载
  useEffect(() => {
    loadModelConfig();
    loadHistory();
  }, []);

  // 处理从对话模式跳转回来的参数
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const styleParam = searchParams.get('style');
    const keywordsParam = searchParams.get('keywords');
    const autoGenerate = searchParams.get('autoGenerate');

    if (topicParam) {
      setTopic(topicParam);
    }
    if (styleParam) {
      setStyle(styleParam);
    }
    if (keywordsParam) {
      setKeywords(keywordsParam);
    }

    // 如果设置了自动生成标志，延迟一下等待状态更新后自动生成
    if (autoGenerate === 'true' && topicParam) {
      // 清除 URL 参数中的 autoGenerate 标志，防止刷新页面时重复生成
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('autoGenerate');
      router.replace(`/?${newParams.toString()}`, { scroll: false });

      setTimeout(() => {
        handleGenerate();
      }, 500);
    }
  }, [searchParams]);

  const loadModelConfig = async () => {
    try {
      const response = await fetch('/api/model-config');
      const data = await response.json();
      if (data.success) {
        setModelConfig(data.data);
      }
    } catch (error) {
      console.error('加载模型配置失败:', error);
    }
  };

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('generateHistory');
      if (saved) {
        const parsed = JSON.parse(saved) as { id?: string; topic: string; style: string; timestamp: string; content: GeneratedContent }[];
        const withDates = parsed.map((item) => ({
          ...item,
          id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(item.timestamp),
        }));
        setHistory(withDates.slice(0, 10));
      }
    } catch (error) {
      console.error('加载历史失败:', error);
    }
  };

  const saveHistory = (newHistory: GenerateHistory[]) => {
    try {
      localStorage.setItem('generateHistory', JSON.stringify(newHistory.slice(0, 10)));
      setHistory(newHistory.slice(0, 10));
    } catch (error) {
      console.error('保存历史失败:', error);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('generateHistory');
    setHistory([]);
  };

  const loadFromHistory = (item: GenerateHistory) => {
    setTopic(item.topic);
    setStyle(item.style);
    setGeneratedContent(item.content);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('请输入主题');
      return;
    }

    if (!modelConfig || !modelConfig.textApiKeySet) {
      if (confirm('请先配置模型 API Key，是否前往设置页面？')) {
        window.location.href = '/settings';
      }
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setGenerateProgress(0);
    setGenerateStatus('初始化...');

    try {
      const progressInterval = setInterval(() => {
        setGenerateProgress(prev => {
          if (prev >= 85) return prev;
          return prev + 5;
        });
      }, 300);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          style,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          imageCount,
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (data.success && data.content) {
        setGenerateProgress(100);
        setGenerateStatus('生成完成！');
        setGeneratedContent(data.content);
        setResult({ success: true, message: '内容生成成功！' });

        const newHistoryItem: GenerateHistory = {
          id: Date.now().toString(),
          topic,
          style,
          timestamp: new Date(),
          content: data.content,
        };
        const newHistory = [newHistoryItem, ...history];
        saveHistory(newHistory);

        setTimeout(() => {
          setGenerateProgress(0);
          setGenerateStatus('');
        }, 3000);
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (error) {
      console.error('生成失败:', error);

      if (retryCount < 3 && (error as Error).message?.includes('超时')) {
        setRetryCount(prev => prev + 1);
        setGenerateStatus(`生成失败，${3 - retryCount}秒后自动重试...`);
        setTimeout(() => {
          setRetryCount(0);
          handleGenerate();
        }, 3000);
        return;
      }

      setResult({
        success: false,
        message: `生成失败：${(error as Error).message}`
      });
    } finally {
      setIsGenerating(false);
      setGenerateProgress(0);
      setGenerateStatus('');
      setRetryCount(0);
    }
  };

  const handlePublish = async () => {
    if (!generatedContent) {
      alert('请先生成内容');
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);
    setPublishStatus('准备发布...');

    try {
      const progressInterval = setInterval(() => {
        setPublishProgress(prev => {
          if (prev >= 85) return prev;
          return prev + 10;
        });
      }, 500);

      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generatedContent,
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (data.success) {
        setPublishProgress(100);
        setPublishStatus('发布成功！');
        setResult({
          success: true,
          message: `发布成功！${data.noteUrl ? `笔记链接：${data.noteUrl}` : ''}`
        });

        if (data.noteUrl) {
          setTimeout(() => {
            window.open(data.noteUrl, '_blank');
          }, 2000);
        }
      } else {
        throw new Error(data.error || '发布失败');
      }
    } catch (error) {
      setResult({ success: false, message: `发布失败：${(error as Error).message}` });
    } finally {
      setIsPublishing(false);
      setPublishProgress(0);
      setPublishStatus('');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setResult({ success: true, message: '已复制到剪贴板！' });
    } catch (error) {
      setResult({ success: false, message: '复制失败' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-linear-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#141414]">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm shrink-0">
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
              <FileText className="w-5 h-5 text-pink-400" />
              <h1 className="text-lg font-semibold text-white">模板模式</h1>
            </div>
            <p className="text-sm text-gray-400 hidden sm:block">
              快速填写主题和风格，一键生成高质量笔记
            </p>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full py-4 pb-6 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* 左侧：创建面板 (1/3) */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            {/* 创建面板 */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                    <CardTitle className="text-white text-base">创建内容</CardTitle>
                  </div>
                  {/* 简化的模型配置状态 */}
                  <div className="flex items-center gap-1">
                    {modelConfig ? (
                      <>
                        <span className="text-[10px] text-gray-500">
                          {modelConfig.textProvider}
                          {modelConfig.textApiKeySet ? (
                            <CheckCircle className="w-2.5 h-2.5 text-green-500 inline ml-0.5" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5 text-red-500 inline ml-0.5" />
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-600">加载中...</span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 主题输入 */}
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-gray-300 text-sm">
                    主题 <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    id="topic"
                    placeholder="可以是简短主题，或一段背景介绍..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isGenerating || isPublishing}
                    className="min-h-[80px] bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-pink-500/50 resize-none"
                  />
                </div>

                {/* 风格和图片数量 - 一行 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">风格</Label>
                    <Select value={style} onValueChange={setStyle} disabled={isGenerating || isPublishing}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-white/10">
                        {STYLES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-gray-200 focus:bg-white/10">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">图片数量</Label>
                    <Select value={imageCount.toString()} onValueChange={(v) => setImageCount(parseInt(v))} disabled={isGenerating || isPublishing}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-white/10">
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <SelectItem key={num} value={num.toString()} className="text-gray-200 focus:bg-white/10">
                            {num}张
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 风格说明 */}
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400">
                    <span className="text-lg mr-1">{STYLES.find(s => s.value === style)?.emoji}</span>
                    <span className="text-gray-300 font-medium">{STYLES.find(s => s.value === style)?.label}</span>
                    <span className="text-gray-500 ml-2">— {STYLES.find(s => s.value === style)?.desc}</span>
                  </p>
                </div>

                {/* 关键词 */}
                <div className="space-y-2">
                  <Label htmlFor="keywords" className="text-gray-300 text-sm">
                    关键词 <span className="text-gray-500">(可选，逗号分隔)</span>
                  </Label>
                  <Input
                    id="keywords"
                    placeholder="营养，简单，快手早餐"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    disabled={isGenerating || isPublishing}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 text-sm h-9"
                  />
                </div>

                {/* 生成按钮 */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || isPublishing || !topic.trim()}
                  className="w-full h-10 bg-linear-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-medium shadow-lg shadow-pink-500/20 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中... {generateProgress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成内容
                    </>
                  )}
                </Button>

              </CardContent>
            </Card>
          </div>

          {/* 右侧：结果预览 (2/3) */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col border border-white/10 bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden">
              {/* 标题栏 */}
              <div className="shrink-0 px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-orange-400" />
                    <h2 className="text-white text-base font-semibold">生成结果</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 历史记录按钮 */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setHistoryDrawerOpen(true)}
                      className="h-9 px-3 text-gray-400 hover:text-white hover:bg-white/10"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    {generatedContent && (
                      <Button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="h-9 px-4 bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            发布中...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1" />
                            发布到小红书
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-6">
                {generatedContent ? (
                  <div className="space-y-3">
                    {/* 标题 */}
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">标题</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(generatedContent.title)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-base font-semibold text-white leading-snug">
                        {generatedContent.title}
                      </p>
                    </div>

                    {/* 正文 */}
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">正文</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(generatedContent.content)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {generatedContent.content}
                      </p>
                    </div>

                    {/* 话题标签 */}
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <h3 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">话题标签</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedContent.topics.map((t, i) => (
                          <Badge
                            key={i}
                            className="bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 cursor-pointer text-[10px] border border-blue-500/20"
                            onClick={() => copyToClipboard('#' + t)}
                          >
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 图片预览 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs text-gray-400">配图 ({generatedContent.images.length}张)</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                        {generatedContent.images.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => openImagePreview(img, i)}
                            className="aspect-square bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-pink-500/50 transition-all cursor-pointer hover:scale-105"
                          >
                            {img.startsWith('temp/') || img.includes('http') ? (
                              <img
                                src={img}
                                alt={`图片${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '';
                                  (e.target as HTMLImageElement).parentElement!.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center text-gray-500 text-xs bg-white/5">
                                      图片 ${i + 1}
                                    </div>
                                  `;
                                }}
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

                    {/* 发布进度 */}
                    {isPublishing && (
                      <div className="space-y-2 pt-2">
                        <Progress value={publishProgress} className="h-1 bg-white/10" />
                        <p className="text-xs text-gray-500 text-center">{publishStatus}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-gray-500">暂无生成内容</p>
                      <p className="text-sm text-gray-600 mt-2">在左侧输入主题后点击生成内容</p>
                    </div>
                  </div>
                )}

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
                          {!result.success && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 h-7 text-xs shrink-0"
                              onClick={handleGenerate}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              重试
                            </Button>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览弹窗 */}
      {previewImage && generatedContent && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={closeImagePreview}>
          <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            {/* 关闭按钮 */}
            <button
              onClick={closeImagePreview}
              className="absolute -top-10 right-0 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 图片 */}
            <div className="flex items-center justify-center">
              {previewImage.startsWith('temp/') || previewImage.includes('http') ? (
                <img
                  src={previewImage}
                  alt={`预览图片 ${previewIndex + 1}`}
                  className="max-h-[80vh] max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-500 bg-white/5 rounded-lg">
                  图片 {previewIndex + 1}
                </div>
              )}
            </div>

            {/* 导航按钮 */}
            {generatedContent.images.length > 1 && (
              <>
                <button
                  onClick={() => navigateImage(-1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigateImage(1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* 图片指示器和计数 */}
            {generatedContent.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <span className="text-white/60 text-sm">{previewIndex + 1} / {generatedContent.images.length}</span>
                <div className="flex items-center gap-1.5">
                  {generatedContent.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPreviewIndex(i);
                        setPreviewImage(generatedContent.images[i]);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === previewIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 历史记录抽屉 */}
      <Sheet open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
        <SheetContent className="bg-[#0a0a0a] border-white/10 w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              生成历史
            </SheetTitle>
            <SheetDescription className="text-gray-400">
              最新 {history.length} 条记录
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {history.length > 0 && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearHistory}
                  className="h-8 text-xs text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  清空历史
                </Button>
              </div>
            )}
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                    <History className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-500">暂无历史记录</p>
                </div>
              ) : (
                history.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      loadFromHistory(item);
                      setHistoryDrawerOpen(false);
                    }}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-pink-500/50 hover:bg-white/10 transition-all"
                  >
                    <p className="text-sm font-medium text-white mb-2">{item.topic}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {STYLES.find(s => s.value === item.style)?.emoji} {item.style}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(item.timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
}
