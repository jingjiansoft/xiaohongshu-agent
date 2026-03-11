# 贡献指南

感谢你对本项目的关注！欢迎提交 Issue 和 Pull Request。

## 开发环境

### 前置要求
- Node.js >= 18
- npm >= 9

### 安装依赖
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd web && npm install && cd ..

# 安装 Playwright 浏览器
npm run install:browser
```

### 配置
1. 复制配置文件：
   ```bash
   cp config/model-config.example.json config/model-config.json
   cp config/user-profile.example.json config/user-profile.json
   ```

2. 填写 API Key 和个人信息

### 开发模式
```bash
# 启动后端和前端
./start.sh

# 或分别启动
npm run server  # 后端 (3001)
npm run web     # 前端 (3000)

# Electron 开发
npm run electron:dev
```

## 代码规范

### TypeScript
- 使用 TypeScript 编写所有代码
- 启用严格模式
- 添加类型注解

### 命名规范
- 文件名：kebab-case（如 `user-profile.ts`）
- 类名：PascalCase（如 `UserProfile`）
- 函数/变量：camelCase（如 `getUserProfile`）
- 常量：UPPER_SNAKE_CASE（如 `API_URL`）

### 注释
- 为复杂逻辑添加注释
- 使用 JSDoc 注释公共 API
- 中文注释优先

## 提交规范

### Commit Message 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

### 示例
```
feat(conversation): 添加对话历史导出功能

- 支持导出为 JSON 格式
- 支持导出为 Markdown 格式
- 添加导出按钮到 UI

Closes #123
```

## Pull Request 流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交代码：`git commit -m 'feat: add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### PR 检查清单
- [ ] 代码通过 TypeScript 编译
- [ ] 遵循代码规范
- [ ] 添加必要的注释
- [ ] 更新相关文档
- [ ] 测试通过

## 问题反馈

### 提交 Issue 前
1. 搜索是否已有类似 Issue
2. 确认是否为最新版本
3. 准备复现步骤

### Issue 模板
```markdown
**问题描述**
简要描述问题

**复现步骤**
1. 步骤 1
2. 步骤 2
3. ...

**期望行为**
描述期望的结果

**实际行为**
描述实际发生的情况

**环境信息**
- OS: [如 macOS 14.0]
- Node.js: [如 v20.0.0]
- 版本: [如 v1.0.0]

**截图/日志**
如有必要，添加截图或日志
```

## 功能建议

欢迎提出新功能建议！请在 Issue 中说明：
- 功能描述
- 使用场景
- 预期效果
- 实现思路（可选）

## 许可证

提交代码即表示同意以 MIT 许可证开源。
