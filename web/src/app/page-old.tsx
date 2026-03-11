'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Send, Image as ImageIcon, FileText, Sparkles, 
  CheckCircle, XCircle, Settings, Key, AlertCircle, 
  RefreshCw, Clock, History 
} from 'lucide-react';

/**
 * 小红书自动发布 Agent - 可视化操作界面（优化版）
 */

export default function HomePage() {
  // 模型配置（只读显示）
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
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    content: string;
    topics: string[];
    images: string[];
  } | null>(null);
  
  // 状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // 生成进度
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateStatus, setGenerateStatus] = useState('');
  
  // 发布进度
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStatus, setPublishStatus] = useState('');

  // 加载模型配置
  useEffect(() => {
    loadModelConfig();
  }, []);

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

  /**
   * 生成内容（带进度显示）
   */
  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('请输入主题');
      return;
    }

    // 检查模型配置
    if (!modelConfig || !modelConfig.textApiKeySet) {
      if (confirm('请先配置模型 API Key，是否前往设置页面？')) {
        window.location.href = '/settings';
      }
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setGenerateProgress(0);
    setGenerateStatus('准备生成...');

    try {
      // 模拟进度更新（实际应该用 WebSocket 或轮询）
      const progressInterval = setInterval(() => {
        setGenerateProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

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
        
        // 3 秒后清除状态
        setTimeout(() => {
          setGenerateProgress(0);
          setGenerateStatus('');
        }, 3000);
      } else {
        setResult({ success: false, message: data.error || '生成失败' });
      }
    } catch (error) {
      setResult({ success: false, message: '请求失败，请检查配置' });
    } finally {
      setIsGenerating(false);
      setGenerateProgress(0);
      setGenerateStatus('');
    }
  };

  /**
   * 发布到小红书（带进度显示）
   */
  const handlePublish = async () => {
    if (!generatedContent) {
      alert('请先生成内容');
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);
    setPublishStatus('准备发布...');

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setPublishProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 800);

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
        
        // 如果有笔记链接，3 秒后打开
        if (data.noteUrl) {
          setTimeout(() => {
            window.open(data.noteUrl, '_blank');
          }, 2000);
        }
      } else {
        setResult({ success: false, message: data.error || '发布失败' });
      }
    } catch (error) {
      setResult({ success: false, message: '发布失败，请检查配置' });
    } finally {
      setIsPublishing(false);
      setPublishProgress(0);
      setPublishStatus('');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent mb-2">
            小红书自动发布 Agent
          </h1>
          <p className="text-gray-600">多模型接入 · AI 生成内容 · 自动发布</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <a href="/settings" className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium">
              <Settings className="w-4 h-4 mr-2" />
              用户配置
            </a>
            <a href="/login" className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium">
              <FileText className="w-4 h-4 mr-2" />
              登录管理
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入面板 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-600" />
                创建内容
              </CardTitle>
              <CardDescription>输入主题，AI 自动生成小红书笔记内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 主题输入 */}
              <div className="space-y-2">
                <Label htmlFor="topic">主题 *</Label>
                <Input
                  id="topic"
                  placeholder="例如：健康早餐、旅行攻略、好物推荐..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isGenerating || isPublishing}
                />
              </div>

              {/* 风格选择 */}
              <div className="space-y-2">
                <Label>内容风格</Label>
                <Select value={style} onValueChange={setStyle} disabled={isGenerating || isPublishing}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="清新自然">🌸 清新自然</SelectItem>
                    <SelectItem value="专业干货">📚 专业干货</SelectItem>
                    <SelectItem value="生活分享">🏠 生活分享</SelectItem>
                    <SelectItem value="种草推荐">🛍️ 种草推荐</SelectItem>
                    <SelectItem value="情感共鸣">💭 情感共鸣</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 关键词 */}
              <div className="space-y-2">
                <Label htmlFor="keywords">关键词（可选，逗号分隔）</Label>
                <Input
                  id="keywords"
                  placeholder="例如：营养, 简单, 快手早餐"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={isGenerating || isPublishing}
                />
              </div>

              {/* 图片数量 */}
              <div className="space-y-2">
                <Label htmlFor="imageCount">图片数量</Label>
                <Select value={imageCount.toString()} onValueChange={(v) => setImageCount(parseInt(v))} disabled={isGenerating || isPublishing}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 张</SelectItem>
                    <SelectItem value="2">2 张</SelectItem>
                    <SelectItem value="3">3 张</SelectItem>
                    <SelectItem value="4">4 张</SelectItem>
                    <SelectItem value="5">5 张</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 模型配置状态显示 */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">当前模型配置</span>
                  </div>
                  <a href="/settings" className="text-xs text-pink-600 hover:text-pink-700 flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    修改
                  </a>
                </div>
                {modelConfig ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span className="text-gray-600">文本：</span>
                      <span className="font-medium">{modelConfig.textProvider}</span>
                      {modelConfig.textApiKeySet && <CheckCircle className="w-3 h-3 text-green-600 ml-1" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-purple-600" />
                      <span className="text-gray-600">图片：</span>
                      <span className="font-medium">{modelConfig.imageProvider}</span>
                      {modelConfig.imageApiKeySet && <CheckCircle className="w-3 h-3 text-green-600 ml-1" />}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">加载中...</div>
                )}
                {!modelConfig?.textApiKeySet && (
                  <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    请先配置模型 API Key
                  </div>
                )}
              </div>

              {/* 生成按钮 */}
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || isPublishing || !topic.trim()}
                className="w-full bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700"
                size="lg"
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

              {/* 生成进度 */}
              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={generateProgress} className="w-full" />
                  <p className="text-xs text-gray-500 text-center">{generateStatus}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：结果面板 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-orange-600" />
                生成结果
              </CardTitle>
              <CardDescription>预览 AI 生成的内容，确认后即可发布</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedContent ? (
                <div className="space-y-4">
                  {/* 标题 */}
                  <div>
                    <Label>标题</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                      <p className="font-medium">{generatedContent.title}</p>
                    </div>
                  </div>

                  {/* 正文 */}
                  <div>
                    <Label>正文</Label>
                    <Textarea 
                      value={generatedContent.content}
                      readOnly
                      className="mt-1 min-h-[200px]"
                    />
                  </div>

                  {/* 话题 */}
                  <div>
                    <Label>话题标签</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {generatedContent.topics.map((topic, index) => (
                        <Badge key={index} variant="secondary">
                          #{topic}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 图片 */}
                  <div>
                    <Label>配图 ({generatedContent.images.length}张)</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {generatedContent.images.map((img, index) => (
                        <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          {img.startsWith('temp/') ? (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              图片 {index + 1}
                            </div>
                          ) : (
                            <img src={img} alt={`图片${index + 1}`} className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 发布按钮 */}
                  <Button 
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    size="lg"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        发布中... {publishProgress}%
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        发布到小红书
                      </>
                    )}
                  </Button>

                  {/* 发布进度 */}
                  {isPublishing && (
                    <div className="space-y-2">
                      <Progress value={publishProgress} className="w-full" />
                      <p className="text-xs text-gray-500 text-center">{publishStatus}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无生成内容</p>
                  <p className="text-sm mt-2">在左侧输入主题后点击生成内容</p>
                </div>
              )}

              {/* 结果提示 */}
              {result && (
                <Alert variant={result.success ? 'default' : 'destructive'}>
                  <AlertDescription>
                    {result.success ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {result.message}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {result.message}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
