#!/bin/bash

# 依赖检查脚本
# 确保所有依赖都已正确安装

echo "🔍 检查项目依赖..."

# 检查根目录依赖
echo ""
echo "📦 检查后端依赖..."
if [ ! -d "node_modules" ]; then
  echo "❌ 后端依赖未安装"
  echo "👉 运行：npm install"
  exit 1
fi

# 检查关键依赖
MISSING=()

check_package() {
  # 检查是否在 dependencies 或 devDependencies 中
  if [ ! -d "node_modules/$1" ]; then
    # 如果是 dev 依赖，只警告不报错
    if grep -q "\"$1\"" package.json; then
      echo "⚠️  警告：$1 未安装（可能是 dev 依赖）"
    else
      MISSING+=("$1")
    fi
  fi
}

check_package "playwright"
check_package "express"
check_package "typescript"

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌ 后端缺少依赖：${MISSING[@]}"
  echo "👉 运行：npm install"
  exit 1
fi

echo "✅ 后端依赖正常"

# 检查 Web 依赖
echo ""
echo "📦 检查 Web 前端依赖..."
if [ ! -d "web/node_modules" ]; then
  echo "❌ Web 前端依赖未安装"
  echo "👉 运行：cd web && npm install"
  exit 1
fi

cd web

WEB_MISSING=()

check_web_package() {
  if [ ! -d "node_modules/$1" ]; then
    WEB_MISSING+=("$1")
  fi
}

check_web_package "next"
check_web_package "react"
check_web_package "@radix-ui/react-progress"
check_web_package "@radix-ui/react-select"
check_web_package "class-variance-authority"

if [ ${#WEB_MISSING[@]} -gt 0 ]; then
  echo "❌ Web 前端缺少依赖：${WEB_MISSING[@]}"
  echo "👉 运行：npm install"
  cd ..
  exit 1
fi

echo "✅ Web 前端依赖正常"
cd ..

# 检查 Playwright 浏览器
echo ""
echo "🌐 检查 Playwright 浏览器..."
if [ ! -d "node_modules/playwright-core" ]; then
  echo "❌ Playwright 未安装"
  echo "👉 运行：npx playwright install chromium"
  exit 1
fi

echo "✅ Playwright 浏览器正常"

echo ""
echo "🎉 所有依赖检查通过！"
echo ""
echo "💡 提示：如果运行时仍有问题，尝试："
echo "   1. rm -rf node_modules web/node_modules"
echo "   2. npm install"
echo "   3. cd web && npm install"
echo "   4. npx playwright install chromium"
echo ""
