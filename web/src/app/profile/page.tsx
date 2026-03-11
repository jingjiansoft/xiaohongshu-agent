'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Loader2, Save, User, BookOpen, Tag, Clock, Bell, X } from 'lucide-react';

const STYLES = [
  { value: '清新自然', label: '清新自然', emoji: '🌸', desc: '温柔治愈，如春风拂面' },
  { value: '专业干货', label: '专业干货', emoji: '📚', desc: '结构清晰，信息密度高' },
  { value: '生活分享', label: '生活分享', emoji: '🏠', desc: '真实接地气，像朋友聊天' },
  { value: '种草推荐', label: '种草推荐', emoji: '🛍️', desc: '真诚推荐，突出亮点' },
  { value: '情感共鸣', label: '情感共鸣', emoji: '💭', desc: '细腻走心，引发共鸣' },
  { value: '幽默搞笑', label: '幽默搞笑', emoji: '😂', desc: '轻松有趣，段子手风格' },
  { value: '文艺复古', label: '文艺复古', emoji: '📜', desc: '文艺范儿，复古调调' },
];

export default function ProfilePage() {
  const { toast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<any>({
    user: {
      name: '',
      brand: '',
      description: '',
      targetAudience: '',
      tone: '',
      preferences: {
        styles: [],
        emojiUsage: '',
        contentLength: '',
        imageCount: 3,
      },
    },
    content: {
      commonTopics: [],
      keywords: [],
      bannedWords: [],
      recommendedPhrases: [],
    },
    publishing: {
      preferredTime: [],
      frequency: '',
      autoPublish: false,
      requireReview: true,
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/config/profile');
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/config/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('配置保存成功！');
      } else {
        toast.error('保存失败：' + data.error);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addTag = (category: string, value: string) => {
    if (!value.trim()) return;
    setProfile((prev: any) => ({
      ...prev,
      content: {
        ...prev.content,
        [category]: [...(prev.content[category] || []), value.trim()],
      },
    }));
  };

  const removeTag = (category: string, index: number) => {
    setProfile((prev: any) => ({
      ...prev,
      content: {
        ...prev.content,
        [category]: prev.content[category].filter((_: any, i: number) => i !== index),
      },
    }));
  };

  const toggleStyle = (styleValue: string) => {
    const currentStyles = profile.user.preferences.styles || [];
    const newStyles = currentStyles.includes(styleValue)
      ? currentStyles.filter((s: string) => s !== styleValue)
      : [...currentStyles, styleValue];
    setProfile((prev: any) => ({
      ...prev,
      user: {
        ...prev.user,
        preferences: {
          ...prev.user.preferences,
          styles: newStyles,
        },
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#141414] pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent mb-2">
            个人配置
          </h1>
          <p className="text-gray-400">管理你的个人背景、内容偏好和发布设置</p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
            </div>
            <p className="text-gray-400">加载配置中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧导航 - 固定宽度 */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-3">
                <nav className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  {[
                    { value: 'user', label: '个人背景', icon: User, desc: '博主定位信息' },
                    { value: 'content', label: '内容偏好', icon: BookOpen, desc: '话题与关键词' },
                    { value: 'publishing', label: '发布设置', icon: Bell, desc: '发布时间与审核' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => document.getElementById(item.value)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      className="group flex items-start gap-3 p-3 rounded-lg text-left transition-all hover:bg-white/5"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-pink-500/30 group-hover:to-orange-500/30 transition-all">
                        <item.icon className="w-5 h-5 text-pink-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-pink-400 transition-colors">{item.label}</p>
                        <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </nav>

                {/* 快速操作 */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <p className="text-xs font-medium text-gray-400 mb-3">快速操作</p>
                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full h-10 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white shadow-lg shadow-pink-500/20 text-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        保存全部
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        保存配置
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* 右侧内容区域 - 占据 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 个人背景 */}
              <section id="user" className="scroll-mt-24">
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">个人背景信息</CardTitle>
                        <CardDescription className="text-gray-400 text-sm">设置你的博主定位和目标受众</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-xs">博主名称</Label>
                        <Input
                          value={profile.user.name}
                          onChange={(e) => setProfile({ ...profile, user: { ...profile.user, name: e.target.value } })}
                          placeholder="例如：伦哥"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-xs">博主定位</Label>
                        <Input
                          value={profile.user.brand}
                          onChange={(e) => setProfile({ ...profile, user: { ...profile.user, brand: e.target.value } })}
                          placeholder="例如：生活美学博主"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-xs">个人描述</Label>
                      <Textarea
                        value={profile.user.description}
                        onChange={(e) => setProfile({ ...profile, user: { ...profile.user, description: e.target.value } })}
                        placeholder="例如：热爱生活的创业公司老板"
                        rows={2}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-xs">目标受众</Label>
                        <Input
                          value={profile.user.targetAudience}
                          onChange={(e) => setProfile({ ...profile, user: { ...profile.user, targetAudience: e.target.value } })}
                          placeholder="例如：25-35 岁都市白领"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-xs">文字风格</Label>
                        <Input
                          value={profile.user.tone}
                          onChange={(e) => setProfile({ ...profile, user: { ...profile.user, tone: e.target.value } })}
                          placeholder="例如：亲切自然"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                        />
                      </div>
                    </div>

                    {/* 常用风格选择 */}
                    <div>
                      <Label className="text-gray-300 text-xs mb-3 block">常用风格 (可多选)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {STYLES.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => toggleStyle(s.value)}
                            className={`p-2.5 rounded-lg border text-left transition-all ${
                              profile.user.preferences?.styles?.includes(s.value)
                                ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/20 border-pink-500/50'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{s.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-white">{s.label}</span>
                                <p className="text-xs text-gray-500 truncate">{s.desc}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 内容偏好 */}
              <section id="content" className="scroll-mt-24">
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Tag className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">内容偏好设置</CardTitle>
                        <CardDescription className="text-gray-400 text-sm">管理常用话题、关键词和禁用词</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 常用话题 */}
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-xs">常用话题</Label>
                      <Input
                        placeholder="输入话题后按回车添加"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTag('commonTopics', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.content.commonTopics?.map((topic: string, index: number) => (
                          <Badge
                            key={index}
                            className="bg-white/10 text-gray-300 hover:bg-white/20 cursor-pointer text-xs"
                            onClick={() => removeTag('commonTopics', index)}
                          >
                            {topic} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 推荐关键词 */}
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-xs">推荐关键词</Label>
                      <Input
                        placeholder="输入关键词后按回车添加"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTag('keywords', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.content.keywords?.map((keyword: string, index: number) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20 cursor-pointer text-xs"
                            onClick={() => removeTag('keywords', index)}
                          >
                            {keyword} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 禁用词 */}
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-xs">禁用词</Label>
                      <Input
                        placeholder="输入禁用词后按回车添加"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTag('bannedWords', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.content.bannedWords?.map((word: string, index: number) => (
                          <Badge
                            key={index}
                            variant="destructive"
                            className="cursor-pointer text-xs"
                            onClick={() => removeTag('bannedWords', index)}
                          >
                            {word} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 发布设置 */}
              <section id="publishing" className="scroll-mt-24">
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">发布设置</CardTitle>
                        <CardDescription className="text-gray-400 text-sm">配置发布时间和自动发布选项</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 发布时间 */}
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-xs">发布时间偏好</Label>
                      <Input
                        placeholder="例如：09:00，输入后按回车添加"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTag('preferredTime', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.publishing.preferredTime?.map((time: string, index: number) => (
                          <Badge
                            key={index}
                            className="bg-green-500/20 text-green-300 border border-green-500/50 cursor-pointer text-xs"
                            onClick={() => removeTag('preferredTime', index)}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {time} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 发布频率 */}
                    <div>
                      <Label className="text-gray-300 text-xs">发布频率</Label>
                      <Input
                        value={profile.publishing.frequency}
                        onChange={(e) => setProfile({ ...profile, publishing: { ...profile.publishing, frequency: e.target.value } })}
                        placeholder="例如：每天 1-2 篇"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm h-9"
                      />
                    </div>

                    {/* 开关选项 */}
                    <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-gray-300 text-xs">自动发布</Label>
                          <p className="text-xs text-gray-500 mt-0.5">开启后生成内容将自动发布到小红书</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={profile.publishing.autoPublish}
                          onChange={(e) => setProfile({ ...profile, publishing: { ...profile.publishing, autoPublish: e.target.checked } })}
                          className="w-9 h-4.5 rounded-full appearance-none bg-white/10 checked:bg-gradient-to-r checked:from-pink-500 checked:to-orange-500 cursor-pointer transition-all"
                        />
                      </div>
                      <div className="border-t border-white/10 pt-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-gray-300 text-xs">人工审核</Label>
                            <p className="text-xs text-gray-500 mt-0.5">发布前需要人工确认内容</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.publishing.requireReview}
                            onChange={(e) => setProfile({ ...profile, publishing: { ...profile.publishing, requireReview: e.target.checked } })}
                            className="w-9 h-4.5 rounded-full appearance-none bg-white/10 checked:bg-gradient-to-r checked:from-pink-500 checked:to-orange-500 cursor-pointer transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
