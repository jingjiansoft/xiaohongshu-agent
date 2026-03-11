# 小红书自动发布 Agent - 系统架构文档 V3

> 最后更新：2026-03-08
> 版本：3.0

---

## 📋 目录

1. [系统概述](#系统概述)
2. [核心架构](#核心架构)
3. [模块详解](#模块详解)
4. [数据流程](#数据流程)
5. [技术栈](#技术栈)
6. [目录结构](#目录结构)
7. [配置系统](#配置系统)
8. [扩展指南](#扩展指南)

---

## 系统概述

### 项目定位

小红书自动发布 Agent 是一个**多模型接入的 AI 内容生成与自动发布系统**，支持：
- 🤖 多种 AI 模型（文本、图片、视频）
- 📝 智能内容生成（标题、正文、话题、图片提示词）
- 🎨 7 种内容风格
- 🌐 Web UI + 桌面应用
- 🤖 浏览器自动化发布

### 核心能力

```
输入：主题 + 风格 + 关键词
  ↓
AI 生成：标题 + 正文 + 话题标签 + 图片提示词
  ↓
图片生成：基于提示词生成配图
  ↓
自动发布：浏览器自动化发布到小红书
```

---

## 核心架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户界面层                               │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Web UI         │         │  Desktop App     │             │
│  │  (Next.js)       │         │  (Electron)      │             │
│  │  - 内容创建      │         │  - 跨平台        │             │
│  │  - 配置管理      │         │  - 独立运行      │             │
│  │  - 历史记录      │         │  - 内置环境      │             │
│  └────────┬─────────┘         └────────┬─────────┘             │
└───────────┼──────────────────────────┼─────────────────────────┘
            │                          │
            └──────────┬───────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 服务层 (Express)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ /api/generate│  │ /api/publish │  │ /api/config  │         │
│  │ 内容生成接口 │  │ 发布接口     │  │ 配置接口     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       核心业务层                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Orchestrator (统筹者)                    │      │
│  │  - 协调各个生成器                                     │      │
│  │  - 管理生成流程                                       │      │
│  │  - 处理错误和降级                                     │      │
│  └────┬──────────────────────────────────────┬──────────┘      │
│       │                                      │                  │
│       ▼                                      ▼                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  TextGenerator   │              │  ImageGenerator  │        │
│  │  - 文本内容生成  │              │  - 图片生成      │        │
│  │  - 图片提示词生成│              │  - 提示词优先    │        │
│  │  - JSON 解析     │              │  - 降级兜底      │        │
│  └────┬─────────────┘              └────┬─────────────┘        │
│       │                                 │                       │
│       ▼                                 ▼                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              XiaohongshuPublisher                     │      │
│  │  - 浏览器自动化                                       │      │
│  │  - Cookie 管理                                        │      │
│  │  - 内容填充与发布                                     │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      模型适配层                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ OpenAI   │  │ DeepSeek │  │  Qwen    │  │   GLM    │       │
│  │ GPT+DALL-E│  │          │  │ 千问+万相│  │ GLM+CogView│     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐                                    │
│  │ MiniMax  │  │ Anthropic│                                    │
│  │文本+图片+视频│ │  Claude  │                                    │
│  └──────────┘  └──────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      配置与数据层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ 提示词配置   │  │ 用户配置     │  │ Cookie 存储  │         │
│  │prompts.json  │  │user-profile  │  │cookies.json  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 架构特点

1. **分层清晰**：界面层、API 层、业务层、适配层、数据层
2. **职责单一**：每个模块只负责一个核心功能
3. **易于扩展**：新增模型只需添加适配器
4. **配置驱动**：提示词和用户配置独立管理
5. **降级策略**：AI 失败时自动使用兜底方案

---

## 模块详解

### 1. 用户界面层

#### Web UI (Next.js)
- **位置**: `web/src/app/`
- **功能**:
  - 主页面 (`page.tsx`): 内容创建、预览、发布
  - 设置页面 (`settings/`): 用户配置、模型配置
  - 历史记录 (Drawer): 生成历史管理
- **技术**: Next.js 16 + React + shadcn/ui + Tailwind CSS

#### Desktop App (Electron)
- **位置**: `electron/`
- **功能**:
  - 跨平台桌面应用
  - 内置 Node.js 和 Playwright
  - 登录管理器
- **技术**: Electron + electron-builder

### 2. API 服务层

#### Express Server
- **位置**: `src/server.ts`
- **端口**: 3001
- **路由**:
  - `POST /api/generate`: 生成内容
  - `POST /api/publish`: 发布内容
  - `GET /api/model-config`: 获取模型配置
  - `POST /api/model-config`: 保存模型配置
  - `GET /api/user-profile`: 获取用户配置
  - `POST /api/user-profile`: 保存用户配置
  - `POST /api/login`: 登录小红书
  - `GET /api/health`: 健康检查

### 3. 核心业务层

#### Orchestrator (统筹者)
- **位置**: `src/core/orchestrator.ts`
- **职责**:
  - 协调 TextGenerator 和 ImageGenerator
  - 管理内容生成流程
  - 处理错误和降级
- **核心方法**:
  - `execute(task)`: 执行完整的生成和发布流程
  - `generateContent(task)`: 仅生成内容不发布

#### TextGenerator (文本生成器)
- **位置**: `src/generators/text.ts`
- **职责**:
  - 调用文本模型生成标题、正文、话题
  - 同时生成图片提示词
  - 解析 JSON 格式输出
- **核心方法**:
  - `generate(request)`: 生成文本内容
  - `parseJSONContent(text)`: 解析 AI 返回的 JSON
  - `generateMockContent(request)`: 降级兜底

#### ImageGenerator (图片生成器)
- **位置**: `src/generators/image.ts`
- **职责**:
  - 优先使用文本生成器提供的图片提示词
  - 如果没有提示词，自动生成
  - 生成多张差异化图片
  - 降级生成兜底图片
- **核心方法**:
  - `generate(request)`: 生成图片
  - `generateImages(request, count)`: 生成多张图片
  - `generateFallbackImage(topic)`: 生成兜底图片

#### XiaohongshuPublisher (发布器)
- **位置**: `src/core/publisher.ts`
- **职责**:
  - 浏览器自动化
  - Cookie 管理和登录态维护
  - 内容填充和发布
- **核心方法**:
  - `init(headless)`: 初始化浏览器
  - `publishImageNote(content)`: 发布图文笔记
  - `fillContent(content)`: 填充内容
  - `close()`: 关闭浏览器

### 4. 模型适配层

#### 适配器基类
- **位置**: `src/adapters/base.ts`
- **接口**:
  - `TextModelAdapter`: 文本模型接口
  - `ImageModelAdapter`: 图片模型接口
  - `VideoModelAdapter`: 视频模型接口

#### 具体适配器
- **OpenAI** (`openai.ts`): GPT + DALL-E
- **DeepSeek** (`deepseek.ts`): DeepSeek 文本模型
- **Qwen** (`qwen.ts`): 通义千问 + 通义万相
- **GLM** (`glm.ts`): 智谱 GLM + CogView
- **MiniMax** (`minimax.ts`): 文本 + 图片 + 视频
- **Anthropic** (`anthropic.ts`): Claude

### 5. 提示词系统

#### 文本提示词
- **位置**: `src/prompts/loader.ts` + `prompts/prompts.json`
- **功能**:
  - 加载风格配置
  - 构建系统提示词和用户提示词
  - 包含图片提示词生成指南
- **核心类**: `PromptsManager`

#### 图片提示词
- **位置**: `src/prompts/image-loader.ts` + `prompts/image-prompts.json`
- **功能**:
  - 加载图片风格配置
  - 构建图片生成提示词
  - 支持多图差异化
- **核心类**: `ImagePromptsManager`

### 6. 配置系统

#### 模型配置
- **位置**: `src/config/model-config.ts` + `config/model-config.json`
- **内容**:
  - 文本模型提供商和 API Key
  - 图片模型提供商和 API Key
  - 视频模型提供商和 API Key

#### 用户配置
- **位置**: `src/config/user-profile.ts` + `config/user-profile.json`
- **内容**:
  - 个人背景（博主名称、定位、目标受众）
  - 内容偏好（常用话题、关键词、禁用词）
  - 发布设置（发布时间、频率、自动发布）

#### Cookie 管理
- **位置**: `src/core/cookie-manager.ts` + `config/cookies.json`
- **功能**:
  - Cookie 持久化存储
  - 登录态检测
  - 自动加载和保存

---

## 数据流程

### 完整生成和发布流程

```
1. 用户输入
   ├─ 主题: "健康早餐"
   ├─ 风格: "清新自然"
   ├─ 关键词: ["营养", "简单", "快手"]
   └─ 图片数量: 3

2. API 层接收请求
   └─ POST /api/generate

3. Orchestrator 协调
   ├─ Step 1: 调用 TextGenerator
   │   ├─ 加载风格配置 (prompts.json)
   │   ├─ 加载用户配置 (user-profile.json)
   │   ├─ 构建提示词
   │   ├─ 调用文本模型 API
   │   ├─ 解析 JSON 输出
   │   └─ 返回: {title, content, topics, metadata: {imagePrompts}}
   │
   ├─ Step 2: 调用 ImageGenerator
   │   ├─ 优先使用 TextGenerator 返回的 imagePrompts
   │   ├─ 如果没有，使用 image-loader 生成提示词
   │   ├─ 调用图片模型 API
   │   └─ 返回: {images: [url1, url2, url3]}
   │
   └─ Step 3: 整合内容
       └─ 返回: {title, content, topics, images}

4. 用户预览内容
   └─ Web UI 展示生成结果

5. 用户点击"发布"
   └─ POST /api/publish

6. Orchestrator 调用 Publisher
   ├─ 初始化浏览器
   ├─ 加载 Cookie
   ├─ 导航到创作者平台
   ├─ 上传图片
   ├─ 填充标题和正文
   ├─ 添加话题标签
   ├─ 点击发布
   └─ 返回: {success, noteUrl}

7. 返回结果给用户
   └─ 显示发布成功，打开笔记链接
```

### 图片提示词生成流程

```
文本生成阶段:
  ├─ AI 根据正文内容生成 image_prompts 数组
  ├─ 每个提示词包含：主体、视角、构图、光线、氛围、风格
  └─ 存储在 GeneratedContent.metadata.imagePrompts

图片生成阶段:
  ├─ ImageGenerator 检查 request.extra.imagePrompts
  ├─ 如果有，优先使用
  ├─ 如果没有或数量不足，使用 image-loader 补充
  └─ 调用图片模型 API 生成图片
```

---

## 技术栈

### 后端
- **运行时**: Node.js 18+
- **语言**: TypeScript
- **框架**: Express
- **浏览器自动化**: Playwright
- **日志**: Winston
- **HTTP 客户端**: Axios

### 前端
- **框架**: Next.js 16 (App Router)
- **UI 库**: React 19
- **组件库**: shadcn/ui
- **样式**: Tailwind CSS
- **图标**: Lucide React

### 桌面应用
- **框架**: Electron
- **打包**: electron-builder
- **浏览器**: Playwright (内置 Chromium)

### AI 模型
- **文本**: OpenAI GPT, DeepSeek, Qwen, GLM, MiniMax, Claude
- **图片**: DALL-E, 通义万相, CogView, MiniMax
- **视频**: MiniMax Video

---

## 目录结构

```
xiaohongshu-agent/
├── src/                          # 后端源码
│   ├── core/                     # 核心模块
│   │   ├── orchestrator.ts       # 统筹者
│   │   ├── publisher.ts          # 发布器
│   │   ├── browser.ts            # 浏览器管理
│   │   ├── cookie-manager.ts     # Cookie 管理
│   │   └── cookies.ts            # Cookie 工具
│   ├── generators/               # 生成器
│   │   ├── base.ts               # 基类和接口
│   │   ├── text.ts               # 文本生成器
│   │   └── image.ts              # 图片生成器
│   ├── adapters/                 # 模型适配器
│   │   ├── base.ts               # 适配器接口
│   │   ├── openai.ts             # OpenAI
│   │   ├── deepseek.ts           # DeepSeek
│   │   ├── qwen.ts               # 通义千问
│   │   ├── glm.ts                # 智谱 GLM
│   │   ├── minimax.ts            # MiniMax
│   │   └── anthropic.ts          # Anthropic
│   ├── prompts/                  # 提示词系统
│   │   ├── loader.ts             # 文本提示词加载器
│   │   └── image-loader.ts       # 图片提示词加载器
│   ├── config/                   # 配置管理
│   │   ├── model-config.ts       # 模型配置加载器
│   │   └── user-profile.ts       # 用户配置加载器
│   ├── routes/                   # API 路由
│   │   ├── login.ts              # 登录路由
│   │   └── model-config.ts       # 配置路由
│   ├── utils/                    # 工具函数
│   │   └── logger.ts             # 日志工具
│   ├── agent.ts                  # Agent 工厂
│   ├── server.ts                 # Express 服务器
│   ├── cli.ts                    # 命令行工具
│   └── test-login.ts             # 登录测试
├── web/                          # Web 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # 主页面
│   │   │   ├── settings/         # 设置页面
│   │   │   └── api/              # API 路由
│   │   ├── components/ui/        # UI 组件
│   │   └── lib/                  # 工具函数
│   └── package.json
├── electron/                     # Electron 应用
│   ├── main.js                   # 主进程
│   ├── preload.js                # 预加载脚本
│   └── login-manager.js          # 登录管理器
├── config/                       # 配置文件
│   ├── model-config.json         # 模型配置
│   ├── user-profile.json         # 用户配置
│   └── cookies.json              # Cookie 存储
├── prompts/                      # 提示词配置
│   ├── prompts.json              # 文本提示词
│   └── image-prompts.json        # 图片提示词
├── docs/                         # 文档
├── scripts/                      # 脚本
├── ARCHITECTURE_V3.md            # 本文档
├── CLAUDE.md                     # Claude Code 指南
├── README.md                     # 项目说明
└── package.json                  # 项目配置
```

---

## 配置系统

### 1. 模型配置 (`config/model-config.json`)

```json
{
  "textProvider": "qwen",
  "textApiKey": "sk-xxx",
  "imageProvider": "qwen",
  "imageApiKey": "sk-xxx",
  "videoProvider": "minimax",
  "videoApiKey": "sk-xxx"
}
```

### 2. 用户配置 (`config/user-profile.json`)

```json
{
  "user": {
    "name": "博主名称",
    "brand": "生活美学博主",
    "description": "热爱生活的创业公司老板",
    "targetAudience": "25-35岁都市白领",
    "tone": "亲切自然",
    "preferences": {
      "styles": ["生活分享", "清新自然"],
      "topics": ["日常生活", "好物推荐"],
      "emojiUsage": "适量"
    }
  },
  "content": {
    "keywords": ["生活", "美学", "品质"],
    "bannedWords": ["最", "第一", "绝对"],
    "recommendedPhrases": ["分享", "推荐", "真实"]
  },
  "publishing": {
    "preferredTimes": ["09:00", "12:00", "18:00"],
    "frequency": "每天1-3篇",
    "autoPublish": false,
    "requireReview": true
  }
}
```

### 3. 提示词配置 (`prompts/prompts.json`)

```json
{
  "version": "1.1.0",
  "styles": {
    "清新自然": {
      "name": "清新自然",
      "description": "温柔治愈，如春风拂面",
      "tone": ["温柔", "治愈", "轻松"],
      "emojis": ["✨", "🌸", "🍃"],
      "systemPrompt": "你是一位温柔治愈的小红书博主...",
      "userPromptTemplate": "请根据以下背景信息...",
      "structure": {
        "title": {"length": [15, 20], "requireEmoji": true},
        "content": {"length": [300, 600], "paragraphs": [3, 5]},
        "topics": {"count": [3, 5], "includeTopic": true}
      }
    }
  }
}
```

---

## 扩展指南

### 添加新的 AI 模型

1. **创建适配器**

```typescript
// src/adapters/custom.ts
import { TextModelAdapter, ModelResponse } from './base.js';

export class CustomAdapter implements TextModelAdapter {
  async chatCompletion(messages, options) {
    // 实现 API 调用
    return {
      success: true,
      content: '生成的内容'
    };
  }
}
```

2. **注册适配器**

```typescript
// src/adapters/index.ts
import { CustomAdapter } from './custom.js';

export function createTextAdapter(provider: string, apiKey: string) {
  switch (provider) {
    case 'custom':
      return new CustomAdapter(apiKey);
    // ...
  }
}
```

3. **更新配置**

```json
{
  "textProvider": "custom",
  "textApiKey": "your-api-key"
}
```

### 添加新的内容风格

1. **编辑提示词配置**

```json
// prompts/prompts.json
{
  "styles": {
    "新风格": {
      "name": "新风格",
      "description": "风格描述",
      "systemPrompt": "系统提示词",
      "userPromptTemplate": "用户提示词模板",
      "structure": {
        "title": {"length": [15, 20]},
        "content": {"length": [300, 600]},
        "topics": {"count": [3, 5]}
      }
    }
  }
}
```

2. **无需重启，自动生效**

### 自定义图片提示词

1. **编辑图片提示词配置**

```json
// prompts/image-prompts.json
{
  "styles": {
    "新风格": {
      "name": "新风格",
      "visualElements": ["元素1", "元素2"],
      "colorPalette": ["颜色1", "颜色2"],
      "shootingStyle": "拍摄风格",
      "mood": "氛围"
    }
  }
}
```

---

## 总结

### 架构优势

1. **模块化设计**: 每个模块职责单一，易于维护
2. **配置驱动**: 提示词和用户配置独立管理，灵活调整
3. **多模型支持**: 统一的适配器接口，轻松接入新模型
4. **降级策略**: AI 失败时自动使用兜底方案，保证可用性
5. **图片提示词智能生成**: 文本生成阶段同时生成图片提示词，确保内容一致性

### 核心创新

1. **图片提示词由文本生成器生成**: 确保图片和文字内容高度相关
2. **提示词工程系统化**: JSON 配置 + 热更新
3. **用户配置系统**: 个性化内容生成
4. **多端支持**: Web UI + 桌面应用

---

**文档维护者**: 项目维护者
**最后更新**: 2026-03-08
**版本**: 3.0
