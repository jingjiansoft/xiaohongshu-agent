'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Terminal, RefreshCw, Cookie, Smartphone, Database } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const { toast, ToastContainer } = useToast();
  const [checking, setChecking] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginStatus, setLoginStatus] = useState<{
    isLoggedIn: boolean;
    url: string;
    message: string;
    cookieExists?: boolean;
    cookieValid?: boolean;
  } | null>(null);
  const [loginProgress, setLoginProgress] = useState('');

  const checkLoginStatus = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/login/status');
      const data = await response.json();

      if (data.success) {
        setLoginStatus(data.data);
        if (data.data.isLoggedIn) {
          toast.success('已登录');
        }
      } else {
        setLoginStatus(null);
        toast.error('检查登录状态失败');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setLoginStatus(null);
      toast.error('检查登录状态失败');
    } finally {
      setChecking(false);
    }
  };

  const handleWebLogin = async () => {
    setLoggingIn(true);
    setLoginProgress('正在打开登录页面...');

    try {
      const response = await fetch('/api/login/initiate', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('已打开登录页面，请扫码登录');
        setLoginProgress('请在打开的浏览器窗口中扫码登录...');

        // 轮询检查登录状态
        const checkInterval = setInterval(() => {
          checkLoginStatus().then(() => {
            if (loginStatus?.isLoggedIn) {
              clearInterval(checkInterval);
              setLoggingIn(false);
              setLoginProgress('');
            }
          });
        }, 2000);

        // 60 秒后停止轮询
        setTimeout(() => {
          clearInterval(checkInterval);
          setLoggingIn(false);
          setLoginProgress('');
          checkLoginStatus();
        }, 60000);
      } else {
        toast.error('启动登录失败：' + data.message);
        setLoggingIn(false);
        setLoginProgress('');
      }
    } catch (error) {
      console.error('启动登录失败:', error);
      toast.error('启动登录失败');
      setLoggingIn(false);
      setLoginProgress('');
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#141414] pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF5A75] to-[#FF2442] flex items-center justify-center shadow-lg shadow-[#FF2442]/20">
              <Cookie className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF5A75] to-[#FF2442] bg-clip-text text-transparent mb-2">
            小红书登录管理
          </h1>
          <p className="text-gray-400">检查登录状态和 Cookie 配置</p>
        </div>

        {/* 登录方式选择 */}
        <Card className="mb-6 border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#FF5A75]" />
              选择登录方式
            </CardTitle>
            <CardDescription className="text-gray-400">
              选择便捷的登录方式进行小红书登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 网页登录 */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF5A75]/10 to-[#FF2442]/10 border border-[#FF5A75]/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF5A75]/20 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-[#FF5A75]" />
                  </div>
                  <h3 className="font-semibold text-white">网页登录</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  点击按钮后打开登录页面，扫码完成登录
                </p>
                <Button
                  onClick={handleWebLogin}
                  disabled={loggingIn || loginStatus?.isLoggedIn}
                  className="w-full bg-gradient-to-r from-[#FF5A75] to-[#FF2442] hover:from-[#FF5A75]/90 hover:to-[#FF2442]/90 text-white h-10"
                >
                  {loggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      登录中...
                    </>
                  ) : loginStatus?.isLoggedIn ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      已登录
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 mr-2" />
                      网页登录
                    </>
                  )}
                </Button>
                {loginProgress && (
                  <p className="text-xs text-gray-500 mt-2">{loginProgress}</p>
                )}
              </div>

              {/* 命令行登录 */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF5A75]/10 to-[#FF2442]/10 border border-[#FF5A75]/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF5A75]/20 flex items-center justify-center">
                    <Terminal className="w-4 h-4 text-[#FF5A75]" />
                  </div>
                  <h3 className="font-semibold text-white">命令行登录</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  在终端运行命令，适合服务器环境
                </p>
                <code className="block bg-black/50 px-3 py-2 rounded-lg text-green-400 text-xs font-mono mb-2">
                  npm run test:login
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 登录状态 */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">登录状态</CardTitle>
            <CardDescription className="text-gray-400">检查 Cookie 文件和后端浏览器的登录状态</CardDescription>
          </CardHeader>
          <CardContent>
            {checking ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF5A75]" />
                </div>
                <p className="text-gray-400">检查中...</p>
              </div>
            ) : loginStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    {loginStatus.isLoggedIn ? (
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white">
                        {loginStatus.isLoggedIn ? '已登录' : '未登录'}
                      </p>
                      <p className="text-sm text-gray-400">{loginStatus.message}</p>
                    </div>
                  </div>
                  <Badge variant={loginStatus.isLoggedIn ? 'default' : 'destructive'} className="bg-green-500/20 text-green-400 border-green-500/50 px-3 py-1">
                    {loginStatus.isLoggedIn ? '正常' : '需登录'}
                  </Badge>
                </div>

                {/* Cookie 状态 */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">SQLite 数据库</span>
                    </div>
                    <Badge variant={loginStatus.cookieExists ? 'default' : 'secondary'} className={loginStatus.cookieExists ? 'bg-green-500/20 text-green-400 border-green-500/50' : ''}>
                      {loginStatus.cookieExists ? 'Cookie 已保存' : '未保存'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">data/agent.db</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={checkLoginStatus}
                    variant="outline"
                    className="flex-1 border-white/20 hover:bg-white/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新状态
                  </Button>
                  {loginStatus.isLoggedIn && (
                    <Button
                      onClick={() => window.location.href = '/'}
                      variant="outline"
                      className="flex-1 border-white/20 hover:bg-white/10"
                    >
                      返回首页
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>无法获取登录状态</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ToastContainer />
    </div>
  );
}
