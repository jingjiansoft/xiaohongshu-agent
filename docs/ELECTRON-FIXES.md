# Electron 打包问题修复总结

## 修复的问题

### 1. ✅ Playwright 浏览器打包问题

**问题**: `electron-builder.json` 只打包了 `playwright-core` 模块，没有包含浏览器二进制文件。

**修复**: 更新 `electron-builder.json` 配置，包含 Chromium 浏览器缓存：

```json
"extraResources": [
  {
    "from": "node_modules/playwright-core",
    "to": "playwright-core"
  },
  {
    "from": "node_modules/.cache/ms-playwright",
    "to": "ms-playwright",
    "filter": "**/{chromium,chrome-linux,chrome-win,chrome-mac}/**/*"
  }
]
```

---

### 2. ✅ 路径问题 - 硬编码路径

**问题**: `login-manager.js` 和 `main.js` 使用硬编码的相对路径，打包后会失效。

**修复**: 添加动态路径获取函数：

```javascript
const getAppRoot = () => {
  if (process.resourcesPath) {
    return path.dirname(process.resourcesPath);
  }
  return path.join(__dirname, '..');
};
```

---

### 3. ✅ Playwright 浏览器加载

**问题**: 打包后 Playwright 可能找不到浏览器可执行文件。

**修复**: 在 `login-manager.js` 中添加浏览器路径检测：

```javascript
async getBrowserExecutablePath() {
  const browserPaths = [
    // macOS
    path.join(appRoot, 'ms-playwright', 'chromium-*/chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    // Windows
    path.join(appRoot, 'ms-playwright', 'chromium-*/chrome-win', 'chrome.exe'),
    // Linux
    path.join(appRoot, 'ms-playwright', 'chromium-*/chrome-linux', 'chrome'),
  ];
  // 查找并返回浏览器路径
}
```

---

### 4. ✅ CSP 和安全限制

**问题**: Electron 默认有严格的内容安全策略。

**修复**: 在 `main.js` 中根据环境配置安全策略：

```javascript
webPreferences: {
  webSecurity: !isDevelopment,  // 开发模式禁用 CSP
}
```

---

### 5. ✅ 浏览器启动冲突

**问题**: Electron 内置 Chromium 与 Playwright 的 Chromium 可能冲突。

**修复**: 在 `login-manager.js` 中明确指定浏览器启动参数：

```javascript
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
```

---

### 6. ✅ 内存和资源优化

**问题**: 多个 Chromium 实例可能导致内存占用过高。

**修复**:
- 使用 `app.on('quit')` 确保浏览器正确关闭
- 在 `login-manager.js` 中实现单例模式
- 复用浏览器上下文

---

### 7. ✅ window 对象引用错误

**问题**: TypeScript 编译错误 `Cannot find name 'window'`。

**修复**: 更新 `tsconfig.json` 添加 DOM 库支持：

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"]
  }
}
```

---

## 新增文件

| 文件 | 用途 |
|------|------|
| `scripts/install-browser.js` | 浏览器安装脚本 |
| `docs/ELECTRON-FIXES.md` | 本文档 |

---

## 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `electron-builder.json` | 添加浏览器缓存打包配置 |
| `electron/login-manager.js` | 重写，支持动态路径和浏览器检测 |
| `electron/main.js` | 重写，支持动态路径和错误处理 |
| `electron/preload.js` | 添加新的 IPC 处理器 |
| `package.json` | 添加 Electron 相关脚本和依赖 |
| `tsconfig.json` | 添加 DOM 库支持 |
| `docs/electron-packaging.md` | 更新文档说明 |

---

## 使用方式

### 开发模式

```bash
# 1. 安装依赖
npm install

# 2. 安装浏览器
npm run install:browser

# 3. 启动开发环境
npm run server        # 启动后端
cd web && npm run dev # 启动 Web
npm run electron:dev  # 启动 Electron
```

### 打包构建

```bash
# 完整构建流程
npm run build              # 编译 TypeScript
cd web && npm run build    # 构建 Web
cd ..
npm run electron:build     # 打包 Electron
```

### 打包产物

构建完成后，产物位于：

```
dist-electron/
├── 小红书自动发布 Agent.dmg      # macOS
├── 小红书自动发布 Agent Setup.exe # Windows
└── 小红书自动发布 Agent.deb       # Linux
```

---

## 测试检查清单

- [ ] 开发模式运行正常
- [ ] 打包后应用可以启动
- [ ] 登录功能正常工作
- [ ] Cookie 保存和加载正常
- [ ] 发布功能正常工作
- [ ] 各平台安装包可以安装
- [ ] 应用关闭后进程正确退出

---

## 后续优化

1. **浏览器按需下载**: 首次运行时提示下载浏览器（减小初始包体积）
2. **代码签名**: macOS 和 Windows 代码签名，避免安全警告
3. **自动更新**: 集成 electron-updater 实现自动更新
4. **系统托盘**: 添加系统托盘图标，支持后台运行
5. **日志查看器**: 内置日志查看器，方便调试

---

## 常见问题解答

### Q: 打包后应用无法启动？

A: 检查：
1. 是否运行 `npm run install:browser` 安装浏览器
2. `dist-electron/` 目录是否包含 `ms-playwright` 文件夹
3. 查看应用日志获取详细错误信息

### Q: 如何减小包体积？

A:
1. 使用 `electron-builder` 的 ASAR 压缩
2. 移除不必要的依赖
3. 考虑浏览器作为可选下载

### Q: macOS 提示"无法打开"？

A:
1. 右键点击应用，选择"打开"
2. 或在系统偏好设置 -> 安全性与隐私中允许
3. 最佳方案：进行代码签名

### Q: Windows 提示"未知发布者"？

A: 这是未签名的正常提示，点击"仍要运行"即可。建议购买 EV 证书进行签名。
