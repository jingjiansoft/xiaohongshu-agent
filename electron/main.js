const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const loginManager = require('./login-manager');

console.log('🔍 Electron 主进程开始加载...');
console.log('📁 __dirname:', __dirname);
console.log('📦 process.env.NODE_ENV:', process.env.NODE_ENV);

let mainWindow;
let serverProcess;
let webProcess;

// 获取应用根目录
const getAppRoot = () => {
  if (process.resourcesPath) {
    return path.dirname(process.resourcesPath);
  }
  return path.join(__dirname, '..');
};

// 启动后端 API 服务器
function startServer() {
  const appRoot = getAppRoot();
  const serverPath = path.join(appRoot, 'dist', 'server.js');

  console.log('📡 启动后端服务:', serverPath);
  console.log('当前是否打包版本:', app.isPackaged);

  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: app.isPackaged ? 'production' : 'development',
    },
    cwd: appRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`\x1b[32m[API]\x1b[0m ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`\x1b[31m[API Error]\x1b[0m ${data}`);
  });

  serverProcess.on('error', (err) => {
    console.error('❌ 启动后端服务失败:', err.message);
  });

  serverProcess.on('exit', (code) => {
    console.log(`\x1b[33m[API]\x1b[0m 后端服务已退出，代码：${code}`);
  });

  console.log('✅ 后端服务进程已启动，PID:', serverProcess.pid);
}

// 启动 Web 开发服务器（仅开发模式）
function startWebDev() {
  if (app.isPackaged) {
    return; // 打包版本不需要
  }

  const appRoot = getAppRoot();
  const webRoot = path.join(appRoot, 'web');

  console.log('🌐 启动 Web 开发服务器:', webRoot);
  console.log('Web 根目录:', webRoot);

  // 使用 npm 而不是 npx
  webProcess = spawn('npm', ['run', 'dev'], {
    cwd: webRoot,
    shell: true,
    env: { ...process.env, PORT: '3000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  webProcess.stdout.on('data', (data) => {
    console.log(`\x1b[36m[Web]\x1b[0m ${data}`);
  });

  webProcess.stderr.on('data', (data) => {
    console.error(`\x1b[31m[Web Error]\x1b[0m ${data}`);
  });

  webProcess.on('error', (err) => {
    console.error('❌ 启动 Web 服务失败:', err.message);
  });

  webProcess.on('exit', (code) => {
    console.log(`\x1b[33m[Web]\x1b[0m Web 服务已退出，代码：${code}`);
  });

  console.log('✅ Web 服务进程已启动，PID:', webProcess.pid);
}

function createWindow() {
  const appRoot = getAppRoot();

  console.log('🪟 创建窗口...');
  console.log('应用根目录:', appRoot);
  console.log('是否打包版本:', app.isPackaged);

  // 尝试加载打包后的 web 文件，如果不存在则使用开发模式
  let webPath;
  let isDevelopment = false;

  // 检查打包后的 web 文件
  const packagedWebPath = path.join(appRoot, 'web', 'out', 'index.html');
  const devWebPath = path.join(appRoot, 'web', 'out', 'index.html');

  if (fs.existsSync(packagedWebPath)) {
    webPath = packagedWebPath;
    console.log('✅ 加载打包的 Web 文件:', webPath);
  } else {
    // 开发模式下使用远程 URL
    webPath = 'http://localhost:3000';
    isDevelopment = true;
    console.log('🔧 使用开发模式 Web:', webPath);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 允许加载本地文件
      webSecurity: !isDevelopment,
    },
    icon: path.join(appRoot, 'build', 'icon.png'),
    title: 'xiaohongshu-agent',
    center: true, // 窗口居中显示
    show: false, // 先不显示
  });

  // 强制窗口显示在前面
  mainWindow.setAlwaysOnTop(true, 'normal');
  setTimeout(() => {
    mainWindow.setAlwaysOnTop(false);
  }, 1000);

  // 页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    console.log('✅ 窗口准备就绪');
    mainWindow.show();
  });

  // 加载 Web 应用
  if (isDevelopment) {
    console.log('🔗 加载 URL:', webPath);
    mainWindow.loadURL(webPath).catch(err => {
      console.error('❌ 加载 URL 失败:', err);
    });
  } else {
    console.log('📁 加载文件:', webPath);
    mainWindow.loadFile(webPath).catch(err => {
      console.error('❌ 加载文件失败:', err);
    });
  }

  // 监听加载事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ 页面加载失败:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ 页面加载完成');
  });

  // 开发模式下打开 DevTools
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('🚀 Electron 已就绪，isPackaged:', app.isPackaged);

  // 只在打包模式下启动服务
  if (app.isPackaged) {
    // 先启动后端服务
    console.log('📡 启动后端服务...');
    startServer();

    // 等待服务启动
    const waitTime = 2000;
    console.log(`⏳ 等待 ${waitTime}ms 让服务启动...`);

    setTimeout(() => {
      console.log('⏰ 创建窗口时间到');
      createWindow();
    }, waitTime);
  } else {
    // 开发模式：假设服务已手动启动，直接创建窗口
    console.log('🔧 开发模式：假设服务已在 http://localhost:3001 和 http://localhost:3000 运行');
    console.log('⏰ 直接创建窗口');
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 关闭后端服务
  if (serverProcess) {
    serverProcess.kill();
  }

  // 关闭 Web 服务
  if (webProcess) {
    webProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // 确保后端服务关闭
  if (serverProcess) {
    serverProcess.kill();
  }

  // 确保 Web 服务关闭
  if (webProcess) {
    webProcess.kill();
  }

  // 关闭登录管理器
  if (loginManager && loginManager.close) {
    loginManager.close().catch(console.error);
  }
});

// IPC 处理：选择文件
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// IPC 处理：选择保存路径
ipcMain.handle('save-file', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// IPC 处理：显示通知
ipcMain.handle('show-notification', async (event, title, body) => {
  new Notification(title, { body });
});

// IPC 处理：打开登录窗口
ipcMain.handle('open-login', async () => {
  try {
    const result = await loginManager.openLoginWindow();
    // 通知前端登录结果
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('login-result', result);
    }
    return result;
  } catch (error) {
    console.error('打开登录窗口失败:', error);
    return { success: false, message: error.message };
  }
});

// IPC 处理：检查登录状态
ipcMain.handle('check-login-status', async () => {
  try {
    return await loginManager.checkLoginStatus();
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return {
      success: false,
      isLoggedIn: false,
      error: error.message,
    };
  }
});

// IPC 处理：退出登录
ipcMain.handle('logout', async () => {
  try {
    return await loginManager.logout();
  } catch (error) {
    console.error('退出登录失败:', error);
    return { success: false, message: error.message };
  }
});

// 处理浏览器路径错误
ipcMain.handle('get-browser-path', async () => {
  try {
    await loginManager.init();
    const path = await loginManager.getBrowserExecutablePath();
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 检查是否打包版本
ipcMain.handle('is-packaged', () => {
  return app.isPackaged;
});

console.log('🚀 小红书自动发布 Agent 启动...');
console.log('应用根目录:', getAppRoot());
console.log('是否打包版本:', app.isPackaged);
