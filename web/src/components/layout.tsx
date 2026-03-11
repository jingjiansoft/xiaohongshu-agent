'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Settings,
  Home,
  LogIn,
  Menu,
  X,
  User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: '首页', href: '/', icon: Home },
    { name: '登录管理', href: '/login', icon: LogIn },
    { name: '模型配置', href: '/settings', icon: Settings },
    { name: '个人配置', href: '/profile', icon: User },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-gray-100">
      {/* 顶部导航栏 */}
      <header className="flex-shrink-0 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/30 transition-shadow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
                小红书自动发布 Agent
              </span>
            </Link>

            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive(item.href)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 移动端导航 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0a0a0a] px-4 py-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
                  isActive(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* 主要内容 */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
