/**
 * Electron 登录管理器
 * 在桌面应用中提供图形化登录功能
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// 动态获取应用根目录
const getAppRoot = () => {
  // 在打包后的环境中
  if (process.resourcesPath) {
    return path.dirname(process.resourcesPath);
  }
  // 在开发环境中
  return path.join(__dirname, '..');
};

const getCookieManager = () => {
  const appRoot = getAppRoot();
  const cookieManagerPath = path.join(appRoot, 'dist', 'core', 'cookie-manager.js');

  if (fs.existsSync(cookieManagerPath)) {
    return require(cookieManagerPath).cookieManager;
  }

  throw new Error(`找不到 cookie-manager 模块：${cookieManagerPath}`);
};

// 延迟加载 cookieManager，确保 app 已初始化
let _cookieManager = null;
const getCookieManagerInstance = () => {
  if (!_cookieManager) {
    _cookieManager = getCookieManager();
  }
  return _cookieManager;
};

// 动态导入 Playwright
let chromium;
const loadPlaywright = async () => {
  if (chromium) return chromium;

  const playwrightPath = path.join(getAppRoot(), 'node_modules', 'playwright-core');

  if (fs.existsSync(playwrightPath)) {
    const playwright = require(playwrightPath);
    chromium = playwright.chromium;
  } else {
    // 回退到全局 playwright
    const playwright = require('playwright');
    chromium = playwright.chromium;
  }

  return chromium;
};

class LoginManager {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * 初始化 Playwright
   */
  async init() {
    await loadPlaywright();
  }

  /**
   * 获取浏览器可执行路径
   */
  async getBrowserExecutablePath() {
    const appRoot = getAppRoot();

    // 检查打包后的浏览器路径
    const browserPaths = [
      // macOS
      path.join(appRoot, 'ms-playwright', 'chromium-*/chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      path.join(appRoot, 'node_modules', '.cache', 'ms-playwright', 'chromium-*/chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      // Windows
      path.join(appRoot, 'ms-playwright', 'chromium-*/chrome-win', 'chrome.exe'),
      path.join(appRoot, 'node_modules', '.cache', 'ms-playwright', 'chromium-*/chrome-win', 'chrome.exe'),
      // Linux
      path.join(appRoot, 'ms-playwright', 'chromium-*/chrome-linux', 'chrome'),
      path.join(appRoot, 'node_modules', '.cache', 'ms-playwright', 'chromium-*/chrome-linux', 'chrome'),
    ];

    for (const browserPath of browserPaths) {
      // 使用 glob 模式查找
      const found = await this.findBrowserPath(browserPath);
      if (found) {
        console.log('找到浏览器:', found);
        return found;
      }
    }

    // 如果没有找到，使用默认的 Playwright 浏览器
    console.log('使用默认 Playwright 浏览器');
    return undefined;
  }

  /**
   * 查找浏览器路径（支持 glob 模式）
   */
  async findBrowserPath(pattern) {
    try {
      const baseDir = pattern.split('*')[0];
      if (!fs.existsSync(baseDir)) return null;

      const parts = pattern.split(path.sep);
      const wildcardIndex = parts.findIndex(p => p.includes('*'));

      if (wildcardIndex === -1) {
        return fs.existsSync(pattern) ? pattern : null;
      }

      const baseParts = parts.slice(0, wildcardIndex);
      const base = baseParts.join(path.sep) || '/';
      const remaining = parts.slice(wildcardIndex);

      // 读取目录并匹配
      const entries = fs.readdirSync(base);
      for (const entry of entries) {
        const fullPath = path.join(base, entry, ...remaining.slice(1));
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    } catch (e) {
      console.debug('查找浏览器路径失败:', e.message);
    }

    return null;
  }

  /**
   * 打开登录窗口
   */
  async openLoginWindow() {
    try {
      console.log('🚀 启动登录窗口...');

      // 初始化 Playwright
      await this.init();

      // 获取浏览器路径
      const executablePath = await this.getBrowserExecutablePath();

      // 启动浏览器（有头模式，用户可以看到）
      const launchOptions = {
        headless: false,
        slowMo: 100,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      this.browser = await chromium.launch(launchOptions);

      // 创建页面
      this.page = await this.browser.newPage({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      // 导航到登录页
      console.log('📍 打开登录页面...');
      await this.page.goto('https://creator.xiaohongshu.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      console.log('⏳ 等待用户扫码登录...（最长 5 分钟）');

      // 等待登录（最长 5 分钟）
      await this.page.waitForFunction(
        () => !globalThis.location.href.includes('/login'),
        { timeout: 5 * 60 * 1000 }
      );

      // 等待 3 秒确保登录态稳定
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 检查是否登录成功
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        console.log('❌ 登录已取消或失败');
        await this.close();
        return { success: false, message: '登录已取消' };
      }

      console.log('✅ 登录成功！');
      console.log('📍 当前页面:', currentUrl);

      // 获取 Cookie
      const cookies = await this.page.context().cookies();
      console.log('🍪 获取到', cookies.length, '个 Cookie');

      // 保存 Cookie
      const cookieManager = getCookieManagerInstance();
      await cookieManager.save(cookies);
      console.log('💾 Cookie 已保存到:', cookieManager.getPath());

      // 关闭浏览器
      await this.close();

      return {
        success: true,
        message: '登录成功',
        cookieCount: cookies.length,
      };
    } catch (error) {
      console.error('❌ 登录失败:', error.message);
      await this.close();
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    try {
      await this.init();

      const executablePath = await this.getBrowserExecutablePath();
      const launchOptions = { headless: true };
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      const browser = await chromium.launch(launchOptions);
      const page = await browser.newPage();

      try {
        // 加载 Cookie
        const cookieManager = getCookieManagerInstance();
        const cookies = await cookieManager.load();
        if (cookies.length > 0) {
          await page.context().addCookies(cookies);
        }

        // 访问首页检查
        await page.goto('https://creator.xiaohongshu.com/new/home', {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const currentUrl = page.url();
        const isLoggedIn = !currentUrl.includes('/login');

        return {
          success: true,
          isLoggedIn,
          url: currentUrl,
        };
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error('检查登录状态失败:', error.message);
      return {
        success: false,
        isLoggedIn: false,
        error: error.message,
      };
    }
  }

  /**
   * 关闭浏览器
   */
  async close() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.log('👋 浏览器已关闭');
    } catch (error) {
      console.error('关闭浏览器失败:', error.message);
    }
  }

  /**
   * 清除 Cookie（退出登录）
   */
  async logout() {
    const cookieManager = getCookieManagerInstance();
    await cookieManager.clear();
    console.log('🗑️ 已清除 Cookie');
    return { success: true, message: '已退出登录' };
  }
}

// 导出单例
module.exports = new LoginManager();
