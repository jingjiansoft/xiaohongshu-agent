# 架构总结 - 小红书自动发布 Agent

> 快速了解系统架构和核心流程

---

## 核心架构（5 层）

```
┌─────────────────────────────────────────┐
│  1. 用户界面层                           │
│     Web UI (Next.js) + Desktop (Electron)│
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  2. API 服务层                           │
│     Express Server (Port 3001)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  3. 核心业务层                           │
│     Orchestrator → TextGenerator        │
│                 → ImageGenerator        │
│                 → Publisher             │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  4. 模型适配层                           │
│     OpenAI, DeepSeek, Qwen, GLM,        │
│     MiniMax, Anthropic                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  5. 配置与数据层                         │
│     prompts.json, user-profile.json,    │
│     model-config.json, cookies.json     │
└─────────────────────────────────────────┘
```

---

## 核心流程

### 1. 内容生成流程

```
用户输入（主题 + 风格 + 关键词）
  ↓
Orchestrator.execute()
  ↓
Step 1: TextGenerator.generate()
  ├─ 加载提示词配置 (prompts.json)
  ├─ 加载用户配置 (user-profile.json)
  ├─ 调用文本模型 API
  ├─ 解析 JSON 输出
  └─ 返回: {title, content, topics, metadata: {imagePrompts}}
  ↓
Step 2: ImageGenerator.generate()
  ├─ 优先使用 TextGenerator 返回的 imagePrompts
  ├─ 如果没有，使用 image-loader 生成
  ├─ 调用图片模型 API
  └─ 返回: {images: [url1, url2, url3]}
  ↓
Step 3: 整合内容
  └─ 返回: {title, content, topics, images}
```

### 2. 发布流程

```
用户点击"发布"
  ↓
Orchestrator 调用 Publisher
  ├─ 初始化浏览器 (Playwright)
  ├─ 加载 Cookie (cookies.json)
  ├─ 导航到创作者平台
  ├─ 上传图片
  ├─ 填充标题和正文
  ├─ 添加话题标签
  ├─ 点击发布
  └─ 返回: {success, noteUrl}
```

---

## 核心创新

### 1. 图片提示词智能生成

**传统方式**：
```
文本生成 → 图片生成（基于主题自动生成提示词）
问题：图片和文字内容可能不一致
```

**我们的方式**：
```
文本生成（同时生成图片提示词）→ 图片生成（使用文本生成的提示词）
优势：图片和文字内容高度相关
```

**实现细节**：
1. 在 `prompts/loader.ts` 的 JSON 格式中增加 `image_prompts` 字段
2. 提供详细的图片提示词生成指南（主体、视角、构图、光线、氛围、风格）
3. TextGenerator 解析 JSON 时提取 `image_prompts`，存储在 `metadata.imagePrompts`
4. ImageGenerator 优先使用 `metadata.imagePrompts`，如果没有则自动生成

### 2. 配置驱动的提示词系统

- 提示词配置独立于代码 (`prompts/prompts.json`)
- 支持热更新，无需重启
- 7+ 种内容风格，易于扩展
- 用户配置系统 (`user-profile.json`)

### 3. 多模型统一接口

- 适配器模式，统一的 `TextModelAdapter` 和 `ImageModelAdapter` 接口
- 轻松接入新模型，只需实现适配器
- 支持 6 种文本模型，4 种图片模型

---

## 关键模块

### Orchestrator (统筹者)
- **职责**: 协调各个生成器，管理流程
- **位置**: `src/core/orchestrator.ts`
- **核心方法**: `execute(task)`, `generateContent(task)`

### TextGenerator (文本生成器)
- **职责**: 生成文本内容 + 图片提示词
- **位置**: `src/generators/text.ts`
- **核心方法**: `generate(request)`, `parseJSONContent(text)`
- **输出**: `{title, content, topics, metadata: {imagePrompts}}`

### ImageGenerator (图片生成器)
- **职责**: 生成图片，优先使用文本生成器的提示词
- **位置**: `src/generators/image.ts`
- **核心方法**: `generate(request)`, `generateImages(request, count)`
- **输出**: `{images: [url1, url2, url3]}`

### XiaohongshuPublisher (发布器)
- **职责**: 浏览器自动化发布
- **位置**: `src/core/publisher.ts`
- **核心方法**: `publishImageNote(content)`, `fillContent(content)`
- **技术**: Playwright

---

## 配置文件

| 文件 | 用途 | 示例 |
|------|------|------|
| `config/model-config.json` | 模型配置 | `{textProvider: "qwen", textApiKey: "xxx"}` |
| `config/user-profile.json` | 用户配置 | `{user: {name: "博主名称", brand: "博主定位"}}` |
| `config/cookies.json` | Cookie 存储 | 自动保存，无需手动编辑 |
| `prompts/prompts.json` | 文本提示词 | 7+ 种风格配置 |
| `prompts/image-prompts.json` | 图片提示词 | 图片风格配置（降级方案） |

---

## 技术栈

- **后端**: Node.js + TypeScript + Express
- **前端**: Next.js 16 + React 19 + shadcn/ui + Tailwind CSS
- **桌面**: Electron + electron-builder
- **自动化**: Playwright
- **AI 模型**: OpenAI, DeepSeek, Qwen, GLM, MiniMax, Anthropic

---

## 扩展指南

### 添加新模型

1. 创建适配器 `src/adapters/custom.ts`
2. 实现 `TextModelAdapter` 或 `ImageModelAdapter` 接口
3. 在 `src/adapters/index.ts` 注册
4. 更新 `config/model-config.json`

### 添加新风格

1. 编辑 `prompts/prompts.json`
2. 在 `styles` 中添加新风格配置
3. 无需重启，自动生效

---

## 常见问题

**Q: 图片提示词是如何生成的？**
A: 在文本生成阶段，AI 根据正文内容同时生成图片提示词，存储在 `metadata.imagePrompts` 中。图片生成阶段优先使用这些提示词。

**Q: 如果 AI 没有返回图片提示词怎么办？**
A: ImageGenerator 会自动使用 `image-loader` 生成提示词作为降级方案。

**Q: 如何自定义提示词？**
A: 编辑 `prompts/prompts.json`，修改 `systemPrompt` 和 `userPromptTemplate`，保存后自动生效。

**Q: 如何添加新的 AI 模型？**
A: 在 `src/adapters/` 创建新适配器，实现统一接口，然后在 `index.ts` 注册即可。

---

## 相关文档

- **完整架构文档**: `ARCHITECTURE_V3.md`
- **Claude Code 指南**: `CLAUDE.md`
- **项目说明**: `README.md`
- **旧版架构**: `ARCHITECTURE.md`

---

**最后更新**: 2026-03-08
**版本**: 3.0
