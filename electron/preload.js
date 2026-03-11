/**
 * Electron Preload 脚本
 * 安全地暴露 Electron API 给渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件选择
  selectFile: (options) => ipcRenderer.invoke('select-file', options),

  // 文件保存
  saveFile: (options) => ipcRenderer.invoke('save-file', options),

  // 显示通知
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),

  // 登录相关
  openLogin: () => ipcRenderer.invoke('open-login'),
  checkLoginStatus: () => ipcRenderer.invoke('check-login-status'),
  logout: () => ipcRenderer.invoke('logout'),
  getBrowserPath: () => ipcRenderer.invoke('get-browser-path'),

  // 监听登录结果
  onLoginResult: (callback) => {
    ipcRenderer.on('login-result', (event, result) => callback(result));
  },

  // 移除监听器
  removeLoginResultListener: () => {
    ipcRenderer.removeAllListeners('login-result');
  },

  // 应用信息
  isPackaged: () => ipcRenderer.invoke('is-packaged'),
});

// 添加版本信息
console.log('✅ Electron Preload 已加载');

