'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, ExternalLink, RefreshCw, Cookie } from 'lucide-react';

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [savingCookies, setSavingCookies] = useState(false);
  const [loginStatus, setLoginStatus] = useState<{
    isLoggedIn: boolean;
    url: string;
    message: string;
  } | null>(null);
  const [cookiesSaved, setCookiesSaved] = useState(false);
  const [cookiesSavedAt, setCookiesSavedAt] = useState<Date | null>(null);

  const checkLoginStatus = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/login/status');
      const data = await response.json();
      
      if (data.success) {
        setLoginStatus(data.data);
      } else {
        setLoginStatus(null);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setLoginStatus(null);
    } finally {
      setChecking(false);
    }
  };

  const saveCookies = async () => {
    if (!loginStatus?.isLoggedIn) {
      alert('请先登录');
      return;
    }

    setSavingCookies(true);
    try {
      // 后端在检查登录状态时已经自动保存了 Cookie
      // 这里只需要通知后端重新保存一次即可
      const saveResponse = await fetch('/api/login/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh_cookies'
        }),
      });
      
      const saveData = await saveResponse.json();
      if (saveData.success) {
        setCookiesSaved(true);
        setCookiesSavedAt(new Date());
        alert('Cookie 已更新！发布时会自动使用，无需重新登录。');
      } else {
        throw new Error(saveData.message || '保存失败');
      }
    } catch (error) {
      console.error('保存 Cookie 失败:', error);
      alert('保存 Cookie 失败：' + (error as Error).message);
    } finally {
      setSavingCookies(false);
    }
  };

  const handleLogin = () => {
    setLoggingIn(true);
    window.open('https://creator.xiaohongshu.com/login', '_blank');
    setTimeout(() => {
      setLoggingIn(false);
      checkLoginStatus();
    }, 5000);
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent mb-2">
            小红书登录管理
          </h1>
          <p className="text-gray-600">检查和管理你的小红书登录状态</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>登录状态</CardTitle>
            <CardDescription>查看当前小红书创作者平台的登录状态</CardDescription>
          </CardHeader>
          <CardContent>
            {checking ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-pink-600" />
                <p className="mt-4 text-gray-600">检查登录状态中...</p>
              </div>
            ) : loginStatus ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {loginStatus.isLoggedIn ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                    <div>
                      <p className="text-lg font-semibold">
                        {loginStatus.isLoggedIn ? '已登录' : '未登录'}
                      </p>
                      <p className="text-sm text-gray-500">{loginStatus.message}</p>
                    </div>
                  </div>
                  <Badge variant={loginStatus.isLoggedIn ? 'default' : 'destructive'}>
                    {loginStatus.isLoggedIn ? '正常' : '需登录'}
                  </Badge>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Cookie className="w-5 h-5 text-blue-600" />
                    <p className="font-medium text-blue-900">Cookie 同步说明</p>
                  </div>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>✅ <strong>推荐方式：</strong>使用命令行登录</p>
                    <code className="block bg-white px-3 py-2 rounded border text-xs">
                      npm run test:login
                    </code>
                    <p className="text-xs">
                      1. 运行命令后会打开浏览器<br/>
                      2. 扫码登录<br/>
                      3. Cookie 会自动保存到 config/cookies.json<br/>
                      4. 发布时会自动使用，无需重新登录
                    </p>
                  </div>
                  {cookiesSaved && (
                    <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      Cookie 已保存于 {cookiesSavedAt?.toLocaleTimeString()}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">
                    <strong>当前 URL:</strong> {loginStatus.url}
                  </p>
                </div>

                {!loginStatus.isLoggedIn && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        💡 <strong>提示：</strong>点击下面的按钮打开小红书登录页面，完成登录后返回此页面刷新状态。
                      </p>
                    </div>

                    <Button 
                      onClick={handleLogin} 
                      disabled={loggingIn}
                      className="w-full bg-gradient-to-r from-pink-600 to-orange-600"
                      size="lg"
                    >
                      {loggingIn ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          打开登录页面...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          打开小红书登录页面
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {loginStatus.isLoggedIn && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm text-green-800">
                      ✅ <strong>太棒了！</strong>你已登录小红书，可以正常使用发布功能。
                    </p>
                    {!cookiesSaved && (
                      <p className="text-sm text-green-700 mt-2">
                        💡 建议保存 Cookie，这样发布时不需要重新登录。
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={checkLoginStatus}
                    disabled={checking}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新状态
                  </Button>
                  {loginStatus.isLoggedIn && (
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/'}
                    >
                      返回首页
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">无法获取登录状态，请稍后重试</p>
                <Button onClick={checkLoginStatus} variant="outline" className="mt-4">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>💡 提示：也可以使用命令行登录</p>
          <code className="bg-gray-100 px-3 py-1 rounded mt-2 inline-block">
            npm run test:login
          </code>
        </div>
      </div>
    </div>
  );
}
