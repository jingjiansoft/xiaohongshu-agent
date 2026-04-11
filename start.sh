#!/bin/bash

# 小红书自动发文 Agent - 启动脚本
# 同时启动后端服务和 Web 应用

echo "🚀 启动小红书自动发文 Agent..."
echo ""

# 检查环境变量
if [ ! -f ".env" ]; then
  echo "⚠️  警告：.env 文件不存在"
  echo "   请复制 .env.example 并配置 API Key"
  echo ""
fi

# 启动后端服务（后台运行）
echo "📡 启动后端 API 服务..."
npm run server &
SERVER_PID=$!
echo "   后端服务 PID: $SERVER_PID"

# 等待后端启动
sleep 3

# 启动 Web 应用
echo "🌐 启动 Web 应用..."
cd web
npm run dev &
WEB_PID=$!
echo "   Web 应用 PID: $WEB_PID"
echo "✅ 所有服务已启动"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待中断信号
trap "kill $SERVER_PID $WEB_PID 2>/dev/null; exit" INT TERM EXIT

# 保持脚本运行
wait