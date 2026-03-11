# 模型配置使用指南

## 📖 概述

从 v2.0 开始，小红书自动发布 Agent 支持通过 Web 界面可视化配置 AI 模型，不再需要手动编辑 `.env` 文件。

## 🚀 快速开始

### 方式 1：Web 界面配置（推荐）

1. **启动应用**
   ```bash
   ./start.sh
   ```

2. **访问配置页面**
   打开浏览器访问：http://localhost:3000/settings

3. **配置模型**
   - 点击"模型配置"标签页
   - 选择文本模型提供商（如：通义千问、DeepSeek、OpenAI 等）
   - 填写 API Key
   - 选择图片模型提供商
   - 填写图片 API Key（可选，留空则使用文本模型的 API Key）
   - 点击"保存配置"

4. **测试配置**
   - 点击"测试配置"按钮验证 API Key 是否有效

### 方式 2：手动创建配置文件

1. **复制示例文件**
   ```bash
   cp config/model-config.example.json config/model-config.json
   ```

2. **编辑配置文件**
   ```json
   {
     "textProvider": "qwen",
     "textApiKey": "your_qwen_api_key",
     "imageProvider": "qwen",
     "imageApiKey": "your_qwen_api_key"
   }
   ```

## 📋 支持的模型提供商

### 文本模型
- `qwen` - 通义千问（阿里云）
- `deepseek` - 深度求索
- `openai` - OpenAI GPT 系列
- `glm` - 智谱 AI
- `minimax` - MiniMax
- `anthropic` - Anthropic Claude

### 图片模型
- `qwen` - 通义万相（阿里云）
- `openai` - DALL-E 3
- `glm` - 智谱 AI CogView
- `minimax` - MiniMax

### 视频模型
- `minimax` - MiniMax 视频生成

## 🔒 安全性

- 配置文件 `config/model-config.json` 已添加到 `.gitignore`，不会被提交到 Git
- Web 界面显示 API Key 时会隐藏中间部分（如：`sk-proj...abc123`）
- 建议妥善保管配置文件，不要分享给他人

## 📁 文件结构

```
xiaohongshu-agent/
├── config/
│   ├── model-config.example.json  # 配置模板（提交到 Git）
│   └── model-config.json          # 实际配置（不提交）
├── src/
│   ├── config/
│   │   └── model-config.ts        # 配置管理器
│   └── routes/
│       └── model-config.ts        # REST API 路由
└── web/
    └── src/app/settings/
        └── page.tsx               # 配置页面 UI
```

## 🛠️ API 接口

### GET /api/model-config
获取当前模型配置（API Key 会脱敏显示）

响应示例：
```json
{
  "success": true,
  "data": {
    "textProvider": "qwen",
    "textApiKey": "sk-proj...abc1",
    "textApiKeySet": true,
    "imageProvider": "qwen",
    "imageApiKey": "sk-proj...xyz9",
    "imageApiKeySet": true
  }
}
```

### PUT /api/model-config
更新模型配置

请求体：
```json
{
  "textProvider": "qwen",
  "textApiKey": "your_api_key",
  "imageProvider": "qwen",
  "imageApiKey": "your_api_key"
}
```

### POST /api/model-config/test
测试模型配置是否有效

## ⚠️ 注意事项

1. **首次使用必须先配置**
   - 未配置 API Key 时，生成内容功能会提示先配置

2. **图片 API Key 可选**
   - 如果不填写，会自动使用文本模型的 API Key
   - 适合使用同一提供商的情况

3. **配置即时生效**
   - 保存配置后立即生效，无需重启服务

4. **向后兼容**
   - 如果 `.env` 文件中配置了 `TEXT_API_KEY` 等环境变量
   - 环境变量会覆盖配置文件（不推荐）

## 🐛 故障排除

### 问题：保存配置失败
**解决：** 检查 `config/` 目录是否存在，确保有写入权限

### 问题：API Key 测试失败
**解决：** 
1. 检查 API Key 是否正确（无多余空格）
2. 确认模型提供商选择正确
3. 检查网络连接

### 问题：生成内容提示"未配置 API Key"
**解决：** 
1. 访问 http://localhost:3000/settings 配置模型
2. 或手动创建 `config/model-config.json` 文件

## 📞 获取帮助

如有问题，请查看：
- GitHub Issues: https://github.com/jingjiansoft/xiaohongshu-agent/issues
- README.md: 完整使用文档
