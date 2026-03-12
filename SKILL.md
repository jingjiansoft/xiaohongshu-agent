---
name: xiaohongshu-agent
description: |
  小红书自动化发布 Agent。支持 AI 内容生成、图文发布、登录管理、模型配置。
  当用户要求操作小红书（发布笔记、生成内容、登录、配置模型）时触发。
---

# 小红书自动化 Agent

你是"小红书自动发文助手"。根据用户意图路由到对应的功能模块完成任务。

## 输入判断

按优先级判断用户意图，路由到对应功能：

1. **内容生成**（"生成笔记/写文案/创作内容"）→ 执行内容生成流程。
2. **内容发布**（"发布笔记/上传图片/发帖"）→ 执行发布流程。
3. **登录管理**（"登录/检查登录状态/退出"）→ 执行登录检查。
4. **模型配置**（"配置模型/设置 API Key/修改配置"）→ 引导至配置页面。
5. **状态查询**（"查看配置/当前设置/模型信息"）→ 显示当前配置状态。

## 全局约束

- 所有操作前应确认登录状态（访问 `/login` 检查）。
- 发布操作必须经过用户确认后才能执行。
- 图片路径必须使用绝对路径。
- 生成内容前必须配置模型 API Key。
- 操作频率不宜过高，保持合理间隔。

## 功能模块

### 1. AI 内容生成

根据主题自动生成小红书笔记内容。

**支持：**
- 标题生成（自动限制 20 字以内）
- 正文创作（带 emoji 和话题标签）
- 图片生成（AI 绘图或兜底渐变色图片）
- 多风格选择（清新自然、专业干货、生活分享等）

**使用方式：**
```bash
# CLI 方式
npm run publish:content -- -t "主题" -s "风格"

# Web 方式
访问 http://localhost:3000，输入主题后点击"生成内容"
```

### 2. 内容发布

将生成的内容发布到小红书。

**支持：**
- 图文笔记发布（最多 9 张图片）
- 自动填写标题、正文、话题
- 自动上传图片
- 发布状态跟踪

**使用方式：**
```bash
# 生成并发布
npm run publish:content -- -t "主题" -s "风格"

# Web 方式
生成内容后点击"发布到小红书"
```

### 3. 登录管理

管理小红书登录状态。

**支持：**
- 登录状态检查
- 浏览器自动登录
- Cookie 持久化保存

**使用方式：**
```bash
# 命令行登录
npm run test:login

# Web 方式
访问 http://localhost:3000/login 检查登录状态
```

### 4. 模型配置

配置 AI 模型的 API Key 和提供商。

**支持：**
- 文本模型配置（OpenAI, DeepSeek, Qwen, GLM, MiniMax, Anthropic）
- 图片模型配置（Qwen, OpenAI, GLM, MiniMax）
- 配置验证和测试
- 可视化配置界面

**使用方式：**
```bash
# Web 配置（推荐）
访问 http://localhost:3000/settings

# 手动配置
cp config/model-config.example.json config/model-config.json
编辑 config/model-config.json 填入 API Key
```

## 快速开始

### 1. 首次使用

```bash
# 安装依赖
npm install

# 配置模型（二选一）
# 方式 1：Web 界面配置
访问 http://localhost:3000/settings

# 方式 2：手动配置
cp config/model-config.example.json config/model-config.json
编辑配置文件填入 API Key

# 登录小红书
npm run test:login
```

### 2. 生成并发布内容

```bash
# 一键生成并发布
npm run publish:content -- -t "健康早餐" -s "生活分享"

# 只生成不发布
npm run publish:content -- -t "健康早餐" -s "生活分享" --no-publish
```

### 3. Web 界面操作

```bash
# 启动应用
./start.sh

# 访问 Web 界面
http://localhost:3000

# 功能入口：
# - 首页：生成和发布内容
# - 用户配置：管理个人偏好
# - 模型配置：配置 AI 模型
# - 登录管理：检查登录状态
```

## 复合操作示例

用户可以用自然语言下达复合指令，Agent 会自动执行多步骤操作：

**示例 1：内容创作流程**
> "帮我创作一条关于露营的笔记，要清新自然的风格，然后发布"

Agent 执行：
1. 检查登录状态
2. 检查模型配置
3. 生成内容（标题 + 正文 + 图片）
4. 用户预览确认
5. 发布到小红书

**示例 2：配置检查**
> "我想发布笔记，但不知道配置好了没有"

Agent 执行：
1. 检查模型 API Key 配置
2. 检查小红书登录状态
3. 显示配置状态
4. 引导完成缺失的配置

**示例 3：批量操作**
> "帮我生成 3 条不同风格的旅行攻略"

Agent 执行：
1. 检查模型配置
2. 生成第 1 条（清新自然风格）
3. 生成第 2 条（专业干货风格）
4. 生成第 3 条（生活分享风格）
5. 展示所有生成的内容供选择

## 文件结构

```
xiaohongshu-agent/
├── src/
│   ├── core/           # 核心模块
│   │   ├── browser.ts      # 浏览器管理
│   │   ├── cookies.ts      # Cookie 管理
│   │   ├── publisher.ts    # 发布器
│   │   └── orchestrator.ts # 统筹者
│   ├── generators/     # 内容生成器
│   │   ├── text.ts         # 文本生成
│   │   └── image.ts        # 图片生成
│   ├── adapters/       # 模型适配器
│   │   ├── openai.ts       # OpenAI
│   │   ├── qwen.ts         # 通义千问
│   │   └── deepseek.ts     # DeepSeek
│   ├── routes/         # API 路由
│   │   ├── model-config.ts # 模型配置
│   │   └── login.ts        # 登录状态
│   └── server.ts       # API 服务器
├── web/                # Web 前端
│   └── src/app/
│       ├── page.tsx        # 首页
│       ├── settings/       # 配置页面
│       └── login/          # 登录管理
├── config/             # 配置文件
│   ├── model-config.example.json
│   └── user-profile.json
└── scripts/            # 脚本工具
    └── cli.ts          # CLI 工具
```

## 环境变量

```bash
# 服务器配置
PORT=3001

# 日志级别
LOG_LEVEL=info

# 模型配置（已迁移到 config/model-config.json）
# TEXT_PROVIDER=qwen
# TEXT_API_KEY=your_api_key
# IMAGE_PROVIDER=qwen
# IMAGE_API_KEY=your_api_key
```

## 常见问题

### Q: 如何切换账号？
A: 访问 `/login` 页面，清除 Cookie 后重新登录。

### Q: 图片生成失败怎么办？
A: 系统会自动生成兜底图片（渐变色背景 + 标题文字）。

### Q: 标题太长会被截断吗？
A: 会自动截断到 20 字以内，符合小红书规范。

### Q: 支持视频发布吗？
A: 目前仅支持图文发布，视频发布功能开发中。

## 技术栈

- **后端**: TypeScript, Node.js, Express, Playwright
- **前端**: Next.js, React, TailwindCSS, shadcn/ui
- **AI 模型**: OpenAI, DeepSeek, Qwen, GLM, MiniMax, Anthropic
- **浏览器自动化**: Playwright CDP

## 许可证

MIT
