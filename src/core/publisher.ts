/**
 * 发布模块
 * 负责小红书笔记的自动发布流程
 */

import { Page } from 'playwright';
import { logger } from '../utils/logger.js';
import { BrowserManager } from './browser.js';
import { cookieManager } from './cookie-manager.js';

export interface PublishContent {
  /** 标题 */
  title: string;
  /** 正文内容 */
  content: string;
  /** 话题标签 */
  topics: string[];
  /** 图片路径列表 */
  images: string[];
  /** 发布位置（可选） */
  location?: string;
  /** @好友列表（可选） */
  mentions?: string[];
}

export interface PublishResult {
  success: boolean;
  message: string;
  noteId?: string;
  noteUrl?: string;
  publishedAt?: Date;
}

/**
 * 小红书发布器
 */
export class XiaohongshuPublisher {
  private browserManager: BrowserManager;
  private page: Page | null = null;

  constructor() {
    this.browserManager = new BrowserManager();
  }

  /**
   * 初始化发布器
   */
  async init(headless: boolean = false): Promise<void> {
    this.page = await this.browserManager.launch(headless);
    logger.info('发布器初始化完成，准备加载 Cookie...');
    
    // 优先从文件加载 Cookie
    const cookieLoaded = await this.loadCookiesFromFile();
    
    if (cookieLoaded) {
      logger.info('Cookie 加载成功，直接导航到发布页面');
      // Cookie 有效，直接去发布页面
      await this.navigateToPublishPage('image');
    } else {
      logger.info('Cookie 不存在或已过期，需要登录');
      // Cookie 无效，需要登录
      await this.navigateToLogin();
    }
  }

  /**
   * 从文件加载 Cookie
   */
  private async loadCookiesFromFile(): Promise<boolean> {
    try {
      // 使用 Cookie 管理器加载
      const cookies = await cookieManager.load();
      
      if (cookies.length === 0) {
        logger.debug('Cookie 文件为空');
        return false;
      }

      // 验证 Cookie
      const isValid = await cookieManager.validate(cookies);
      if (!isValid) {
        logger.warn('Cookie 验证失败');
        return false;
      }

      // 设置 Cookie
      if (this.page) {
        await this.page.context().addCookies(cookies);
        
        // 等待一下让 Cookie 生效
        await this.browserManager.randomDelay(2000, 3000);
        
        // 验证 Cookie 是否有效（访问首页检查）
        await this.page.goto('https://creator.xiaohongshu.com/new/home', {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        
        await this.browserManager.randomDelay(3000, 5000);
        
        const currentUrl = this.page.url();
        logger.info('Cookie 验证结果', { url: currentUrl });
        
        if (!currentUrl.includes('/login')) {
          logger.info('Cookie 验证成功，已登录');
          return true;
        } else {
          logger.warn('Cookie 已过期或无效，需要重新登录');
          // 清除过期的 Cookie
          await cookieManager.clear();
        }
      }
      
      return false;
    } catch (error) {
      logger.debug('加载 Cookie 失败', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 导航到登录页并等待用户登录
   */
  private async navigateToLogin(): Promise<void> {
    if (!this.page) throw new Error('页面未初始化');

    logger.info('导航到登录页...');
    
    await this.page.goto('https://creator.xiaohongshu.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    
    // 等待 3 秒让登录页完全加载
    await this.browserManager.randomDelay(3000, 5000);
    
    // 检查是否已经登录（可能浏览器记住了登录态）
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/login')) {
      logger.info('检测到已登录状态，直接去发布页面', { url: currentUrl });
      // 已经登录，直接去发布页面
      await this.navigateToPublishPage('image');
      return;
    }
    
    logger.info('请在浏览器中完成登录...');
    logger.info('提示：登录完成后等待 3 秒自动继续');
    
    // 等待用户登录（最长 2 分钟）
    try {
      await this.page.waitForFunction(
        () => !window.location.href.includes('/login'),
        { timeout: 2 * 60 * 1000 }
      );
      
      // 登录成功后等待 3 秒让登录态稳定
      await this.browserManager.randomDelay(3000, 5000);
      
      logger.info('登录成功！');
      
      // 导航到发布页面
      await this.navigateToPublishPage('image');
    } catch (error) {
      logger.error('等待登录超时', { error: (error as Error).message });
      throw new Error('登录超时，请重新运行发布命令');
    }
  }

  /**
   * 发布图文笔记
   */
  async publishImageNote(content: PublishContent): Promise<PublishResult> {
    try {
      if (!this.page) {
        throw new Error('页面未初始化');
      }

      logger.info('开始发布图文笔记', { title: content.title });

      // 1. 检查并处理标题长度（小红书限制 20 字）
      const processedContent = { ...content };
      if (processedContent.title.length > 20) {
        logger.warn(`标题过长 (${processedContent.title.length}字)，自动截断到 20 字`, { 
          original: processedContent.title 
        });
        processedContent.title = processedContent.title.substring(0, 18) + '...';
        logger.info(`截断后标题：${processedContent.title}`);
      }

      // 此时已经在发布页面（init 中已完成登录和导航）
      // 等待页面稳定
      await this.browserManager.randomDelay(1000, 2000);

      // 2. 上传图片
      await this.uploadImages(processedContent.images);

      // 3. 填写标题和正文（带话题标签）
      await this.fillContent(processedContent.title, processedContent.content, processedContent.topics);

      // 5. 发布
      const result = await this.submitPublish();

      logger.info('笔记发布成功', result);
      return result;
    } catch (error) {
      logger.error('笔记发布失败', { error: (error as Error).message });
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  /**
   * 导航到发布页面
   */
  private async navigateToPublishPage(type: 'image' | 'video'): Promise<void> {
    if (!this.page) throw new Error('页面未初始化');

    const url = `https://creator.xiaohongshu.com/publish/publish?target=${type}`;
    await this.page.goto(url);
    await this.browserManager.randomDelay(1000, 2000);
    
    logger.info('已导航到发布页面', { type });
  }

  /**
   * 上传图片（支持多图）
   */
  private async uploadImages(imagePaths: string[]): Promise<void> {
    if (!this.page) throw new Error('页面未初始化');
    if (imagePaths.length === 0) {
      throw new Error('至少需要上传一张图片');
    }

    logger.info('开始上传图片', { count: imagePaths.length });

    // 下载网络图片到本地临时目录
    const localPaths: string[] = [];
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];

      // 如果是网络 URL，需要先下载
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        try {
          logger.info(`下载网络图片 [${i + 1}/${imagePaths.length}]: ${imagePath.substring(0, 50)}...`);
          const localPath = await this.downloadImage(imagePath, i);
          if (localPath) {
            localPaths.push(localPath);
            logger.info(`图片下载成功：${localPath}`);
          } else {
            logger.warn(`图片下载失败，跳过：${imagePath}`);
          }
        } catch (error) {
          logger.error(`图片下载失败：${imagePath}`, { error: (error as Error).message });
        }
      } else {
        // 本地文件直接使用
        localPaths.push(imagePath);
      }
    }

    if (localPaths.length === 0) {
      throw new Error('没有可用的图片进行上传');
    }

    // 查找文件输入元素
    const fileInput = this.page.locator('input[type="file"]').first();

    // 上传第一张图片
    logger.info('上传第 1 张图片', { path: localPaths[0] });
    await fileInput.setInputFiles(localPaths[0]);
    await this.browserManager.randomDelay(3000, 4000);

    // 上传剩余图片（如果有）
    if (localPaths.length > 1) {
      for (let i = 1; i < localPaths.length; i++) {
        logger.info(`上传第 ${i + 1} 张图片`, { path: localPaths[i] });

        // 查找"添加图片"按钮
        const addImageBtn = this.page.locator('button:has-text("添加图片"), button:has-text("+"), .add-image-btn').first();

        if (await addImageBtn.count() > 0) {
          await addImageBtn.click();
          await this.browserManager.randomDelay(1000, 2000);

          // 等待文件输入框出现并上传
          const newFileInput = this.page.locator('input[type="file"]').first();
          await newFileInput.setInputFiles(localPaths[i]);
          await this.browserManager.randomDelay(2000, 3000);
        } else {
          // 如果没有找到添加按钮，尝试直接设置多文件
          logger.warn('未找到添加图片按钮，尝试批量上传');
          const remainingImages = localPaths.slice(i);
          await fileInput.setInputFiles(remainingImages);
          await this.browserManager.randomDelay(3000, 4000);
          break;
        }
      }
    }

    // 等待图片预览加载完成
    await this.browserManager.randomDelay(2000, 3000);

    // 检查已上传的图片数量
    const imagePreviews = this.page.locator('.image-item, .upload-item, [class*="image-preview"]').first();
    const previewCount = await imagePreviews.count();
    logger.info('图片上传完成', { uploaded: localPaths.length, previewCount });

    // 清理临时文件
    this.cleanupTempImages(localPaths);
  }

  /**
   * 下载网络图片到本地临时目录
   */
  private async downloadImage(url: string, index: number): Promise<string | null> {
    try {
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');

      // 创建临时目录
      const tempDir = join(process.cwd(), 'temp');
      await mkdir(tempDir, { recursive: true });

      // 生成文件名
      const filename = `image-${Date.now()}-${index}.png`;
      const localPath = join(tempDir, filename);

      // 下载图片
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(localPath, buffer);

      return localPath;
    } catch (error) {
      logger.error('下载图片失败', { url, error: (error as Error).message });
      return null;
    }
  }

  /**
   * 清理临时图片文件
   */
  private async cleanupTempImages(paths: string[]): Promise<void> {
    try {
      const { unlink } = await import('fs/promises');
      for (const path of paths) {
        // 只删除 temp 目录下的文件
        if (path.includes('temp') && path.includes('image-')) {
          await unlink(path).catch(() => {});
        }
      }
      logger.debug('临时图片文件已清理');
    } catch (error) {
      logger.debug('清理临时文件失败', { error: (error as Error).message });
    }
  }

  /**
   * 填写标题和正文，并在正文中添加话题标签
   */
  private async fillContent(title: string, content: string, topics: string[] = []): Promise<void> {
    if (!this.page) throw new Error('页面未初始化');

    logger.info('填写内容', { title, contentLength: content.length, topicsCount: topics.length });

    // 等待编辑器加载
    await this.browserManager.randomDelay(1000, 2000);

    // 点击正文区域（激活编辑器）
    const editorArea = this.page.locator('.editor-area, .ql-editor, [contenteditable="true"]').first();
    await editorArea.click();
    await this.browserManager.randomDelay(500, 1000);

    // 先输入正文内容
    await editorArea.type(content);
    await this.browserManager.randomDelay(800, 1200);

    // 如果有话题标签，在正文末尾逐个添加
    if (topics.length > 0) {
      logger.info('开始在正文中添加话题标签');

      // 先换行，然后逐个添加话题
      await editorArea.press('Enter');
      await this.browserManager.randomDelay(500, 800);

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const topicText = topic.startsWith('#') ? topic.substring(1) : topic;

        logger.info(`添加话题标签 [${i + 1}/${topics.length}]: ${topicText}`);

        // 输入 # 号触发话题选择器
        await editorArea.type('#');
        await this.browserManager.randomDelay(300, 500);

        // 输入话题文本
        await editorArea.type(topicText);
        await this.browserManager.randomDelay(500, 800);

        // 按空格触发并选择第一个建议
        await editorArea.press('Space');
        await this.browserManager.randomDelay(800, 1200);

        // 按回车确认选择
        await editorArea.press('Enter');
        await this.browserManager.randomDelay(500, 800);

        // 如果是最后一个话题，不需要后面的空格
        if (i < topics.length - 1) {
          // 话题之间加空格
          await editorArea.type(' ');
          await this.browserManager.randomDelay(300, 500);
        }
      }

      logger.info('话题标签添加完成');
    }

    // 填写标题（如果有标题输入框）
    const titleInput = this.page.locator('input[placeholder*="标题"], input[placeholder*="填写标题"]').first();
    if (await titleInput.count() > 0) {
      await titleInput.fill(title);
      await this.browserManager.randomDelay(500, 1000);
    }

    logger.info('正文内容填写完成');
  }

  /**
   * 提交发布 - 优化版
   */
  private async submitPublish(): Promise<PublishResult> {
    if (!this.page) throw new Error('页面未初始化');

    logger.info('提交发布');

    try {
      // 记录发布前的 URL
      const beforeUrl = this.page.url();
      logger.info('发布前 URL', { url: beforeUrl });

      // 等待发布按钮出现
      const publishBtn = this.page.locator('button:has-text("发布"), button:has-text("发布笔记")').first();

      const isVisible = await publishBtn.isVisible().catch(() => false);
      logger.info('发布按钮可见性', { isVisible });

      if (!isVisible) {
        logger.warn('发布按钮不可见');
        try {
          await this.page.screenshot({ path: 'debug-publish-page.png' });
          logger.info('截图已保存到 debug-publish-page.png');
        } catch (e) {
          logger.debug('截图失败', { error: (e as Error).message });
        }
        throw new Error('发布按钮不可见，可能页面未正确加载');
      }

      // 点击发布按钮
      logger.info('点击发布按钮');
      await publishBtn.click();

      // 等待发布完成 - 分阶段等待
      logger.info('等待发布完成...');

      // 第 1 阶段：等待 3 秒让请求发送
      await this.browserManager.randomDelay(3000, 4000);

      // 第 2 阶段：等待页面跳转或 loading 消失（最多 30 秒）
      try {
        // 等待 URL 变化（表示跳转到成功页面）
        await this.page.waitForFunction(
          (beforeUrl) => window.location.href !== beforeUrl,
          beforeUrl,
          { timeout: 30000, polling: 'raf' }
        );
        logger.info('页面已跳转');
      } catch (e) {
        logger.debug('等待 URL 变化超时，尝试等待 loading 消失');
        // 如果没有跳转，尝试等待 loading 消失
        await this.page.waitForSelector('.ant-spin, .loading, [class*="loading"]', {
          state: 'detached',
          timeout: 10000
        }).catch(() => {
          logger.debug('未检测到 loading');
        });
      }

      // 再等待 2 秒让页面稳定
      await this.browserManager.randomDelay(2000, 3000);

      // 获取发布后状态
      const afterUrl = this.page.url();
      logger.info('发布后状态', {
        beforeUrl,
        afterUrl,
        urlChanged: beforeUrl !== afterUrl
      });

      // ========== 成功检测逻辑 ==========
      let isSuccess = false;
      let noteUrl: string | undefined;
      let message = '笔记发布成功';

      // 检测 1: URL 变化 - 跳转到笔记页面
      if (afterUrl.includes('/explore/') || afterUrl.includes('/discovery/item/')) {
        logger.info('✅ 检测到笔记页面跳转');
        isSuccess = true;
        noteUrl = afterUrl;
      }

      // 检测 2: URL 变化 - 回到首页
      if (!isSuccess && afterUrl.includes('/new/home') && !beforeUrl.includes('/new/home')) {
        logger.info('✅ 检测到回到首页');
        isSuccess = true;
        message = '笔记发布成功，已回到首页';
      }

      // 检测 3: URL 是否跳转到 /publish/success（最高优先级）
      if (afterUrl.includes('/publish/success')) {
        logger.info('✅ URL 跳转到 /publish/success');
        isSuccess = true;
        message = '笔记发布成功';
      }

      // 检测 4: URL 是否跳转到 /publish/publish?published=true（发布成功页面）
      if (afterUrl.includes('/publish/publish') && afterUrl.includes('published=true')) {
        logger.info('✅ URL 跳转到 /publish/publish?published=true');
        isSuccess = true;
        message = '笔记发布成功';
      }

      // 检测 5: 查找成功提示文本
      if (!isSuccess) {
        try {
          const successText = await this.page.locator('text="发布成功"').first();
          if (await successText.count() > 0) {
            const text = await successText.textContent();
            logger.info(`✅ 检测到"发布成功"文本：${text?.trim()}`);
            isSuccess = true;
            message = text?.trim() || '笔记发布成功';
          }
        } catch (e) {
          logger.debug('未找到"发布成功"文本');
        }
      }

      // 检测 6: URL 跳转到笔记页面
      if (!isSuccess && (afterUrl.includes('/explore/') || afterUrl.includes('/discovery/item/'))) {
        logger.info('✅ 检测到笔记页面跳转');
        isSuccess = true;
        noteUrl = afterUrl;
      }

      // 检测 7: 查找笔记链接
      if (!noteUrl) {
        try {
          const noteLink = await this.page.locator('a[href*="/explore/"]').first();
          if (await noteLink.count() > 0) {
            const href = await noteLink.getAttribute('href');
            noteUrl = href ?? undefined;
            logger.info('✅ 找到笔记链接', { noteUrl });
            if (!isSuccess) {
              isSuccess = true;
              message = '笔记发布成功';
            }
          }
        } catch (e) {
          logger.debug('未找到笔记链接');
        }
      }

      // ========== 失败检测 ==========
      let hasError = false;
      let errorMsg: string | null = null;

      // 检查错误提示
      try {
        const errorText = await this.page.locator('text="失败"').first();
        if (await errorText.count() > 0) {
          const text = await errorText.textContent();
          logger.warn(`❌ 检测到错误提示：${text?.trim()}`);
          hasError = true;
          errorMsg = text?.trim() || '发布失败';
        }
      } catch (e) {
        logger.debug('未找到错误提示');
      }

      // 综合判断
      if (hasError && !isSuccess) {
        logger.error('发布确认失败', { errorMsg });
        return {
          success: false,
          message: errorMsg || '发布失败',
        };
      }

      if (isSuccess) {
        logger.info('✅ 发布确认成功', { noteUrl, message });
        return {
          success: true,
          message,
          noteUrl: noteUrl || afterUrl,
          publishedAt: new Date(),
        };
      }

      // 无法确定状态时的处理
      logger.warn('⚠️ 无法确定发布状态，假设成功');
      logger.info('建议：请手动检查小红书后台确认发布状态');

      return {
        success: true,
        message: '笔记可能已发布成功，请检查小红书后台确认',
        noteUrl: afterUrl,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error('提交发布失败', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 关闭发布器
   */
  async close(): Promise<void> {
    await this.browserManager.close();
  }
}