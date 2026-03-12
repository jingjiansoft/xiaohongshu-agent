# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

```bash
# Install dependencies
npm install
cd web && npm install && cd ..

# Start development
./start.sh                    # Start both backend (:3001) and web (:3000)
npm run server                # Backend only
npm run web                   # Web only (cd web && npm run dev)

# Build
npm run build                 # TypeScript compile
npm run web:build             # Build Next.js web app

# Test & Debug
npm run migrate               # Migrate config files to SQLite
npm run test:login            # Login to Xiaohongshu and save cookies
npm run test:publish          # Test content generation (no publish)
npm run health                # Health check

# CLI Publish
npm run publish:content -t "主题" -s "风格" -k "关键词"
```

## Architecture Overview

This is a **Xiaohongshu (Little Red Book) auto-publishing Agent** with AI content generation and browser automation.

### System Flow
```
User Input → Orchestrator → TextGenerator (生成文本+图片提示词)
                         → ImageGenerator (使用提示词生成图片)
                         → Publisher → Xiaohongshu
```

### Core Modules

**Backend (`src/`)**
- `agent.ts` - Main entry point, factory for creating Agent instances
- `core/orchestrator.ts` - Coordinates generators and publisher
  - Step 1: 调用 TextGenerator 生成文本内容和图片提示词
  - Step 2: 调用 ImageGenerator，优先使用 TextGenerator 返回的图片提示词
  - Step 3: 整合内容并返回
- `core/publisher.ts` - Browser automation for publishing (Playwright)
- `core/browser.ts` - Browser management, cookie loading
- `core/cookie-manager.ts` - Cookie persistence and validation
- `generators/text.ts` - Text content generation
  - 生成标题、正文、话题标签
  - **同时生成图片提示词** (存储在 metadata.imagePrompts)
  - JSON 解析和降级处理
- `generators/image.ts` - Image generation
  - **优先使用 TextGenerator 提供的图片提示词**
  - 如果没有或数量不足，使用 image-loader 自动生成
  - 支持多张差异化图片生成
  - 降级兜底图片生成
- `adapters/` - Model adapters with unified interface
  - Text: OpenAI, DeepSeek, Qwen, GLM, MiniMax, Anthropic
  - Image: OpenAI (DALL-E), Qwen (万相), GLM (CogView), MiniMax
  - Video: MiniMax
- `prompts/loader.ts` - Text prompt template loader
  - 加载 `prompts/prompts.json` 配置
  - 构建系统提示词和用户提示词
  - **包含图片提示词生成指南**
- `prompts/image-loader.ts` - Image prompt template loader
  - 加载 `prompts/image-prompts.json` 配置
  - 构建图片生成提示词（降级方案）
- `config/` - Configuration loaders for user profile and model settings

**Frontend (`web/`)**
- Next.js 16 app (App Router) with settings page
- shadcn/ui components for UI
- 主页面：内容创建、预览、发布、历史记录（Drawer）
- 设置页面：用户配置、模型配置

### Content Styles (from `prompts/prompts.json`)
清新自然，专业干货，生活分享，种草推荐，情感共鸣，幽默搞笑，文艺复古，旅行游记，美食探店，学习成长，职场进阶

## Key Files

| File | Purpose |
|------|---------|
| `.env` | Server config (PORT, LOG_LEVEL, AUTO_PUBLISH) |
| `data/agent.db` | SQLite database (unified storage for all config) |
| `prompts/prompts.json` | Text style templates and prompt engineering (包含图片提示词生成指南) |
| `prompts/image-prompts.json` | Image style templates and prompt engineering (降级方案) |
| `src/config.ts` | Browser timeouts, paths, publish limits |
| `src/data/unified-storage.ts` | SQLite unified storage helper |
| `src/utils/cache.ts` | Memory cache with TTL management |

## Configuration

### Model Config (SQLite Storage)

Model configuration is now stored in SQLite (`data/agent.db`) for better performance and consistency.

**Via Web UI:** Access http://localhost:3000/settings to configure model providers and API Keys.

**Via API:**
```bash
# Get model config
curl http://localhost:3001/api/model-config

# Update model config
curl -X PUT http://localhost:3001/api/model-config \
  -H "Content-Type: application/json" \
  -d '{
    "textProvider": "qwen",
    "textApiKey": "xxx",
    "imageProvider": "qwen",
    "imageApiKey": "xxx",
    "videoProvider": "minimax",
    "videoApiKey": "xxx"
  }'
```

**Supported model providers:**
- Text: `openai`, `deepseek`, `qwen`, `glm`, `minimax`, `anthropic`
- Image: `openai`, `qwen`, `glm`, `minimax`
- Video: `minimax`

### Environment Variables (`.env`)
```bash
PORT=3001
LOG_LEVEL=info
AUTO_PUBLISH=false
```

### Legacy Config Files (Deprecated)

If you have existing `config/*.json` files from before the SQLite migration, run:
```bash
npm run migrate
```

This will migrate your data to SQLite. See [docs/SQLITE_MIGRATION.md](docs/SQLITE_MIGRATION.md) for details.

## Development Notes

- **Cookie Flow**: Run `npm run test:login` once to authenticate and save cookies to SQLite (`data/agent.db`)
- **Publish Flow**:
  1. Orchestrator 调用 TextGenerator 生成文本内容和图片提示词
  2. Orchestrator 调用 ImageGenerator，优先使用 TextGenerator 返回的图片提示词
  3. Orchestrator 调用 Publisher 进行浏览器自动化发布
- **Prompt System**: JSON-based templates in `prompts/prompts.json` support hot reload
- **Image Prompt Generation**:
  - 文本生成阶段，AI 同时生成图片提示词（包含主体、视角、构图、光线、氛围、风格）
  - 图片生成阶段，优先使用文本生成器返回的提示词
  - 如果没有或数量不足，使用 `image-loader` 自动生成
- **User Config**: Web UI at `/settings` or via `/api/user-profile` endpoint
- **Cache System**: Memory cache with TTL (configCache: 10min, promptsCache: 30s, globalCache: 5min)
- **SQLite WAL Mode**: Write-Ahead Logging enabled for concurrent writes

## Type System

### PublishResult Types
There are two `PublishResult` interfaces:
- `src/core/publisher.ts::PublishResult` - Used by `XiaohongshuPublisher` (has `noteUrl`)
- `src/core/orchestrator.ts::PublishResult` - Used by `Orchestrator` (has nested `publishResult`)

When using `publishContent()` from `agent.ts`, the return type is from `publisher.ts`.
Use type assertion `(result as any).noteUrl` if TypeScript complains about ambiguity.

### GeneratedContent Interface
- `src/generators/base.ts::GeneratedContent` - Base interface for generated content
- Fields: `title`, `content`, `topics`, `images`, `video`, `metadata`
- `metadata.imagePrompts` - 图片提示词数组（由 TextGenerator 生成）
- Content field is `content` (string), not `body`

## Image Prompt Generation Flow

```
1. 文本生成阶段 (TextGenerator):
   ├─ AI 根据正文内容生成 image_prompts 数组
   ├─ 每个提示词包含：主体、视角、构图、光线、氛围、风格
   ├─ 示例："温馨的早餐场景，桌上摆放着咖啡和面包，Close-up shot，浅景深突出主体，warm morning light，cozy and inviting atmosphere，lifestyle photography style"
   └─ 存储在 GeneratedContent.metadata.imagePrompts

2. 图片生成阶段 (ImageGenerator):
   ├─ 检查 request.extra.imagePrompts
   ├─ 如果有，优先使用（来自 TextGenerator）
   ├─ 如果没有或数量不足，使用 image-loader 自动生成
   └─ 调用图片模型 API 生成图片

3. 优势:
   └─ 图片提示词和文字内容高度相关，确保内容一致性
```

## Architecture Documents

- `ARCHITECTURE_V3.md` - 完整的系统架构文档（最新）
- `README.md` - 项目说明和使用指南
