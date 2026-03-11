# 安全说明

## 敏感信息保护

本项目涉及以下敏感信息，请务必妥善保管：

### 1. API 密钥
- **位置**：`config/model-config.json`
- **说明**：包含文本、图片、视频生成模型的 API Key
- **保护措施**：
  - 已添加到 `.gitignore`，不会被提交到 Git
  - 提供 `model-config.example.json` 作为模板
  - 请勿在代码中硬编码 API Key

### 2. 小红书登录凭证
- **位置**：`config/cookies.json`
- **说明**：小红书登录后的 Cookie 信息
- **保护措施**：
  - 已添加到 `.gitignore`
  - 自动生成，无需手动创建
  - 定期过期，需重新登录

### 3. 用户配置
- **位置**：`config/user-profile.json`
- **说明**：个人信息和偏好设置
- **保护措施**：
  - 已添加到 `.gitignore`
  - 提供 `user-profile.example.json` 作为模板

### 4. 会话数据
- **位置**：`data/` 目录
- **说明**：SQLite 数据库，存储对话历史
- **保护措施**：
  - 已添加到 `.gitignore`
  - 仅本地存储，不上传

## 安全最佳实践

### 配置文件管理
1. 首次使用时，复制示例配置文件：
   ```bash
   cp config/model-config.example.json config/model-config.json
   cp config/user-profile.example.json config/user-profile.json
   ```

2. 填写真实的 API Key 和个人信息

3. **切勿**将真实配置文件提交到 Git

### API Key 安全
- 不要在公开场合分享 API Key
- 定期轮换 API Key
- 使用环境变量（可选）：
  ```bash
  export TEXT_API_KEY=your_key_here
  ```

### CORS 配置
- 生产环境已限制 CORS 仅允许本地访问
- 如需修改，请谨慎评估安全风险

### 网络安全
- 本工具仅供个人使用，不建议暴露到公网
- 如需远程访问，请使用 VPN 或 SSH 隧道

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
