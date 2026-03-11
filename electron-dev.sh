#!/bin/bash

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 启动 Electron 开发环境..."
echo "📁 项目目录: $SCRIPT_DIR"

# 清理残留进程
echo "🧹 清理残留端口..."
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true
rm -f web/.next/dev/lock

# 启动后端服务
echo "📡 启动后端服务 (port 3001)..."
./node_modules/.bin/tsx src/server.ts &
SERVER_PID=$!

# 启动前端服务（使用子 shell 避免改变工作目录）
echo "🌐 启动前端服务 (port 3000)..."
(cd "$SCRIPT_DIR/web" && npm run dev) &
WEB_PID=$!

# 轮询等待服务就绪
echo "⏳ 等待后端服务启动..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 后端服务已就绪"
    break
  fi
  sleep 1
done

echo "⏳ 等待前端服务启动..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务已就绪"
    break
  fi
  sleep 1
done

# 启动 Electron
echo "🪟 启动 Electron..."
node "$SCRIPT_DIR/node_modules/electron/cli.js" "$SCRIPT_DIR"

# 清理进程
echo "🛑 关闭服务..."
kill $SERVER_PID $WEB_PID 2>/dev/null
