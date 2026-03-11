#!/usr/bin/env node
/**
 * 安装 Playwright Chromium 浏览器
 * 用于 Electron 应用
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appRoot = path.join(__dirname, '..');
const cacheDir = path.join(appRoot, 'node_modules', '.cache', 'ms-playwright');

console.log('🔍 检查 Playwright Chromium 浏览器...');

// 检查是否已安装
function isBrowserInstalled() {
  if (!fs.existsSync(cacheDir)) {
    return false;
  }

  const entries = fs.readdirSync(cacheDir);
  return entries.some(entry => entry.startsWith('chromium-'));
}

// 安装浏览器
function installBrowser() {
  console.log('📦 开始安装 Playwright Chromium...');
  console.log('⏳ 这可能需要几分钟，请耐心等待...\n');

  try {
    // 使用 playwright-core 安装，避免安装不必要的浏览器
    execSync('npx playwright-core install chromium', {
      cwd: appRoot,
      stdio: 'inherit',
    });

    console.log('\n✅ Chromium 安装完成！');

    // 验证安装
    if (isBrowserInstalled()) {
      console.log('✅ 浏览器已安装到:', cacheDir);
    } else {
      console.warn('⚠️  浏览器安装完成但未找到缓存目录');
    }
  } catch (error) {
    console.error('❌ 安装失败:', error.message);
    console.log('\n请尝试手动安装:');
    console.log('  npx playwright install chromium');
    process.exit(1);
  }
}

// 主函数
function main() {
  if (isBrowserInstalled()) {
    console.log('✅ Chromium 浏览器已安装');
    console.log('📂 缓存目录:', cacheDir);

    // 询问是否重新安装
    const args = process.argv.slice(2);
    if (args.includes('--force') || args.includes('-f')) {
      console.log('\n🔄 强制重新安装...\n');
      installBrowser();
    } else {
      console.log('\n如需重新安装，请使用：npm run install:browser -- --force');
    }
  } else {
    console.log('❌ Chromium 浏览器未安装');
    installBrowser();
  }
}

main();
