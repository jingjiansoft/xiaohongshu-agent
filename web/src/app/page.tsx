'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { MessageCircle, FileText, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-[#141414]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-orange-500/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center mb-16">
            <img src="/logo.svg" alt="Logo" className="w-20 h-20 mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-400 via-orange-400 to-pink-400 bg-clip-text text-transparent mb-4">
              小红书自动发文 Agent
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              AI 驱动的内容创作助手，选择你喜欢的创作方式
            </p>
          </div>

          {/* 模式选择卡片 */}
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 对话模式 */}
            <Card
              onClick={() => router.push('/conversation')}
              className="group relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-blue-500/50 transition-all cursor-pointer p-8"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl group-hover:scale-150 transition-transform" />

              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-3">对话模式</h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  通过 AI 对话深入了解你的创作需求，智能提取主题、风格和关键词，让内容更贴合你的想法
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>智能需求提取</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>个性化引导问题</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>实时置信度评估</span>
                  </div>
                </div>

                <div className="flex items-center text-blue-400 font-medium group-hover:gap-3 gap-2 transition-all">
                  <span>开始对话</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>

            {/* 模板模式 */}
            <Card
              onClick={() => router.push('/template')}
              className="group relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-pink-500/50 transition-all cursor-pointer p-8"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/20 to-orange-500/20 blur-3xl group-hover:scale-150 transition-transform" />

              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-3">模板模式</h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  快速填写主题、风格和关键词，直接生成内容。适合明确知道自己想要什么的创作者
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    <span>快速表单填写</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    <span>多种风格模板</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    <span>一键生成发布</span>
                  </div>
                </div>

                <div className="flex items-center text-pink-400 font-medium group-hover:gap-3 gap-2 transition-all">
                  <span>快速生成</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </div>

          {/* 底部提示 */}
          <div className="text-center mt-12">
            <p className="text-sm text-gray-500">
              💡 提示：对话模式适合探索创意，模板模式适合快速生成
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
