# 安全说明

## 敏感信息保护

本项目涉及以下敏感信息，请务必妥善保管：

### 1. API 密钥
- **位置**：SQLite 数据库 (`data/agent.db`) 中的 `settings` 表
- **说明**：包含文本、图片、视频生成模型的 API Key
- **保护措施**：
  - SQLite 数据库已添加到 `.gitignore`，不会被提交到 Git
  - 请勿在代码中硬编码 API Key
  - 可通过环境变量设置：`export TEXT_API_KEY=your_key_here`

### 2. 小红书登录凭证
- **位置**：SQLite 数据库 (`data/agent.db`) 中的 `cookies` 表
- **说明**：小红书登录后的 Cookie 信息
- **保护措施**：
  - SQLite 数据库已添加到 `.gitignore`
  - 通过 `npm run test:login` 自动保存
  - Cookie 会定期过期，需重新登录

### 3. 用户配置
- **位置**：SQLite 数据库 (`data/agent.db`) 中的 `settings` 表
- **说明**：个人信息和偏好设置
- **保护措施**：
  - SQLite 数据库已添加到 `.gitignore`
  - 仅本地存储，不上传

### 4. 会话数据
- **位置**：SQLite 数据库 (`data/agent.db`)
- **说明**：存储对话历史、生成历史等
- **保护措施**：
  - 已添加到 `.gitignore`
  - 仅本地存储，不上传

## 安全最佳实践

### API Key 安全
- 不要在公开场合分享 API Key
- 定期轮换 API Key
- 使用环境变量（可选）：
  ```bash
  export TEXT_API_KEY=your_key_here
  export IMAGE_API_KEY=your_key_here
  ```

### CORS 配置
- 生产环境已限制 CORS 仅允许本地访问
- 如需修改，请谨慎评估安全风险

### 网络安全
- 本工具仅供个人使用，不建议暴露到公网
- 如需远程访问，请使用 VPN 或 SSH 隧道

### 数据库备份
- 定期备份 `data/agent.db` 数据库文件
- 可使用 SQLite 工具查看和编辑数据库内容

## 漏洞报告

如果发现安全漏洞，请通过以下方式报告：
- 提交 GitHub Issue（标记为 Security）
- 或发送邮件至项目维护者

**请勿**在公开场合披露未修复的安全漏洞。

## 免责声明

- 本工具仅供学习和个人使用
- 使用本工具产生的任何后果由使用者自行承担
- 请遵守小红书平台规则和相关法律法规
- 不得用于商业目的或大规模自动化操作
