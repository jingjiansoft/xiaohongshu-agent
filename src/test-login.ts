/**
 * 测试登录脚本
 * 用于测试小红书登录流程并保存 Cookie
 */

import { BrowserManager } from './core/browser.js';
import { cookieManager } from './core/cookie-manager.js';
import { logger } from './utils/logger.js';

async function testLogin() {
  console.log('🚀 开始测试小红书登录...\n');

  const browserManager = new BrowserManager();

  try {
    // 启动浏览器（有头模式，方便调试）
    const page = await browserManager.launch(false);
    
    console.log('✅ 浏览器已启动');
    console.log('📱 请在浏览器中完成登录...\n');

    // 导航到登录页
    await page.goto('https://creator.xiaohongshu.com/login');
    
    console.log('📍 已打开登录页面');
    console.log('   URL:', page.url());
    
    // 等待用户手动登录
    console.log('\n⏳ 等待用户登录...');
    console.log('   提示：登录完成后等待 3 秒自动保存 Cookie\n');

    // 等待登录（最长 5 分钟）
    await page.waitForFunction(() => {
      return !window.location.href.includes('/login');
    }, { timeout: 5 * 60 * 1000 }).catch(() => {
      console.log('⏱️  等待超时');
    });

    // 等待 3 秒确保登录态稳定
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查是否登录成功
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
      console.log('✅ 登录成功！');
      console.log('📍 当前页面:', currentUrl);

      // 获取所有 Cookie
      const cookies = await page.context().cookies();
      console.log('\n🍪 获取到 Cookie:', cookies.length, '个');
      
      // 使用新的 CookieManager 保存完整 Cookie
      await cookieManager.save(cookies);
      
      console.log('\n💡 Cookie 已保存到:', cookieManager.getPath());
      console.log('   包含完整的', cookies.length, '个 Cookie（含 httpOnly, secure 等属性）');
      console.log('   ⚠️  请妥善保管，不要泄露给他人！');
      console.log('\n✅ 现在可以关闭浏览器，发布时会自动使用保存的 Cookie');
    } else {
      console.log('❌ 登录失败或已取消');
    }

  } catch (error) {
    console.error('❌ 测试失败:', (error as Error).message);
    logger.error('登录测试失败', { error: (error as Error).message });
  } finally {
    // 关闭浏览器
    await browserManager.close();
    console.log('\n👋 浏览器已关闭');
    console.log('✨ 测试完成\n');
    
    process.exit(0);
  }
}

// 运行测试
testLogin().catch(console.error);