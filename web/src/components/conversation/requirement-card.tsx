'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface ExtractedRequirements {
  topic?: string;
  style?: string;
  keywords?: string[];
  audience?: string;
  tone?: string;
  requirements?: string[];
  confidence: number;
}

interface RequirementCardProps {
  requirements: ExtractedRequirements;
  isReady: boolean;
}

export function RequirementCard({ requirements, isReady }: RequirementCardProps) {
  const items = [
    { label: '主题', value: requirements.topic, required: true },
    { label: '风格', value: requirements.style, required: false },
    {
      label: '关键词',
      value: requirements.keywords?.join('、'),
      required: false,
    },
    { label: '目标受众', value: requirements.audience, required: false },
  ];

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          需求信息
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            {item.value ? (
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-600 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{item.label}</span>
                {item.required && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4 border-red-500/30 text-red-400"
                  >
                    必需
                  </Badge>
                )}
              </div>
              {item.value ? (
                <p className="text-sm text-white mt-1 break-words">{item.value}</p>
              ) : (
                <p className="text-xs text-gray-600 mt-1">待确定</p>
              )}
            </div>
          </div>
        ))}

        {requirements.requirements && requirements.requirements.length > 0 && (
          <div className="flex items-start gap-2 pt-2 border-t border-white/10">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-xs text-gray-400">特殊要求</span>
              <div className="mt-1 space-y-1">
                {requirements.requirements.map((req, i) => (
                  <p key={i} className="text-xs text-white">
                    • {req}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 置信度指示器 */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">信息完整度</span>
            <span className="text-xs text-gray-300">
              {Math.round(requirements.confidence * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-orange-500 transition-all duration-500"
              style={{ width: `${requirements.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* 准备状态 */}
        {isReady && (
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">准备就绪</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              信息已收集完整，可以开始生成内容
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
