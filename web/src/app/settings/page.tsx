'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Loader2, Save, Key, FileText, Image as ImageIcon, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const { toast, ToastContainer } = useToast();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [modelConfig, setModelConfig] = useState<any>({
    textProvider: 'qwen',
    textApiKey: '',
    imageProvider: 'qwen',
    imageApiKey: '',
  });
  const [modelConfigLoaded, setModelConfigLoaded] = useState(false);

  useEffect(() => {
    loadModelConfig();
  }, []);

  const loadModelConfig = async () => {
    try {
      const response = await fetch('/api/model-config');
      const data = await response.json();
      if (data.success) {
        setModelConfig({
          textProvider: data.data.textProvider || 'qwen',
          textApiKey: '',
          imageProvider: data.data.imageProvider || 'qwen',
          imageApiKey: '',
        });
        setModelConfigLoaded(true);
      }
    } catch (error) {
      console.error('加载模型配置失败:', error);
    }
  };

  const saveModelConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/model-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelConfig),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('模型配置保存成功！');
        setModelConfig({ ...modelConfig, textApiKey: '', imageApiKey: '' });
      } else {
        toast.error('保存失败：' + (data.errors || data.message).join(', '));
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const testModelConfig = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/model-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textApiKey: modelConfig.textApiKey,
          imageApiKey: modelConfig.imageApiKey,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('模型配置测试通过！');
      } else {
        toast.error('测试失败：' + data.message);
      }
    } catch (error) {
      toast.error('测试失败');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#141414] pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF5A75] to-[#FF2442] flex items-center justify-center shadow-lg shadow-[#FF2442]/20">
              <Key className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF5A75] to-[#FF2442] bg-clip-text text-transparent mb-2">
            模型配置
          </h1>
          <p className="text-gray-400">配置 AI 模型的 API Key</p>
        </div>

        {/* 模型配置卡片 */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-[#FF5A75]" />
              API Key 配置
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              配置文本和图片生成模型的 API Key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 提示信息 */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-300">
                💡 配置文件保存在 <code className="bg-blue-500/20 px-1.5 py-0.5 rounded text-white">config/model-config.json</code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 文本模型 */}
              <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">文本模型</h3>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">模型提供商</Label>
                  <select
                    value={modelConfig.textProvider}
                    onChange={(e) => setModelConfig({ ...modelConfig, textProvider: e.target.value })}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white focus:border-pink-500/50 focus:outline-none"
                  >
                    <option value="qwen">通义千问 (Qwen)</option>
                    <option value="deepseek">深度求索 (DeepSeek)</option>
                    <option value="openai">OpenAI (GPT)</option>
                    <option value="glm">智谱 AI (GLM)</option>
                    <option value="minimax">MiniMax</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">API Key</Label>
                  <Input
                    type="password"
                    value={modelConfig.textApiKey}
                    onChange={(e) => setModelConfig({ ...modelConfig, textApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 text-sm h-9"
                  />
                </div>
              </div>

              {/* 图片模型 */}
              <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">图片模型</h3>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">模型提供商</Label>
                  <select
                    value={modelConfig.imageProvider}
                    onChange={(e) => setModelConfig({ ...modelConfig, imageProvider: e.target.value })}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white focus:border-pink-500/50 focus:outline-none"
                  >
                    <option value="qwen">通义万相 (Qwen)</option>
                    <option value="openai">DALL-E 3 (OpenAI)</option>
                    <option value="glm">智谱 AI (CogView)</option>
                    <option value="minimax">MiniMax</option>
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">
                    API Key <span className="text-gray-500">(可选)</span>
                  </Label>
                  <Input
                    type="password"
                    value={modelConfig.imageApiKey}
                    onChange={(e) => setModelConfig({ ...modelConfig, imageApiKey: e.target.value })}
                    placeholder="留空则使用文本 API Key"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500/50 text-sm h-9"
                  />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={saveModelConfig}
                disabled={saving || testing}
                className="flex-1 h-10 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white shadow-lg shadow-pink-500/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存配置
                  </>
                )}
              </Button>
              <Button
                onClick={testModelConfig}
                disabled={testing || saving}
                variant="outline"
                className="h-10 border-white/20 hover:bg-white/10"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    测试
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <ToastContainer />
    </div>
  );
}
