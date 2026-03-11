# 对话式需求收集 - 架构设计

> 支持 AI 对话了解需求背景后再生成内容

---

## 设计目标

1. **对话式交互**: 用户可以和 AI 对话，逐步明确需求
2. **需求提取**: AI 从对话中提取关键信息（主题、风格、关键词等）
3. **智能判断**: AI 判断信息是否足够，决定是否可以开始生成
4. **无缝衔接**: 对话阶段结束后，自动进入内容生成阶段

---

## 架构设计

### 整体流程

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 对话阶段 (Conversation Phase)                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ConversationManager                                   │ │
│  │  - 管理对话历史                                        │ │
│  │  - 调用 AI 进行对话                                    │ │
│  │  - 提取需求信息 (RequirementExtractor)                │ │
│  │  │  ├─ 主题 (topic)                                   │ │
│  │  │  ├─ 风格 (style)                                   │ │
│  │  │  ├─ 关键词 (keywords)                              │ │
│  │  │  ├─ 目标受众 (audience)                            │ │
│  │  │  └─ 特殊要求 (requirements)                        │ │
│  │  - 判断是否可以开始生成 (ReadinessChecker)            │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼ (信息充足，用户确认)
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 生成阶段 (Generation Phase)                       │
│  Orchestrator → TextGenerator → ImageGenerator              │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. ConversationManager (对话管理器)

**职责**:
- 管理对话历史
- 调用 AI 模型进行对话
- 协调需求提取和准备度检查

**接口**:
```typescript
interface ConversationManager {
  // 开始新对话
  startConversation(): ConversationSession;

  // 发送用户消息
  sendMessage(sessionId: string, message: string): Promise<ConversationResponse>;

  // 获取当前提取的需求
  getExtractedRequirements(sessionId: string): ExtractedRequirements;

  // 检查是否准备好生成
  checkReadiness(sessionId: string): ReadinessStatus;

  // 结束对话，进入生成阶段
  finalize(sessionId: string): GenerationRequest;
}
```

#### 2. RequirementExtractor (需求提取器)

**职责**:
- 从对话历史中提取结构化需求信息
- 使用 AI 进行信息提取

**实现方式**:
```typescript
interface ExtractedRequirements {
  topic?: string;           // 主题
  style?: string;           // 风格
  keywords?: string[];      // 关键词
  audience?: string;        // 目标受众
  tone?: string;            // 语气
  requirements?: string[];  // 特殊要求
  confidence: number;       // 提取置信度 (0-1)
}

class RequirementExtractor {
  async extract(messages: Message[]): Promise<ExtractedRequirements> {
    // 使用 AI 提取需求
    const prompt = `
从以下对话中提取小红书笔记的需求信息，返回 JSON 格式：
{
  "topic": "主题",
  "style": "风格（清新自然/专业干货/生活分享等）",
  "keywords": ["关键词1", "关键词2"],
  "audience": "目标受众",
  "tone": "语气",
  "requirements": ["特殊要求1", "特殊要求2"],
  "confidence": 0.8
}

对话历史：
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
`;

    const result = await this.aiModel.generate(prompt);
    return JSON.parse(result);
  }
}
```

#### 3. ReadinessChecker (准备度检查器)

**职责**:
- 判断提取的需求信息是否足够开始生成
- 生成下一步的引导问题

**实现**:
```typescript
interface ReadinessStatus {
  ready: boolean;           // 是否准备好
  missingFields: string[];  // 缺失的字段
  nextQuestion?: string;    // 下一个引导问题
  confidence: number;       // 准备度置信度
}

class ReadinessChecker {
  check(requirements: ExtractedRequirements): ReadinessStatus {
    const required = ['topic'];  // 必需字段
    const optional = ['style', 'keywords', 'audience'];  // 可选但建议有的字段

    const missing = required.filter(field => !requirements[field]);
    const optionalMissing = optional.filter(field => !requirements[field]);

    if (missing.length > 0) {
      return {
        ready: false,
        missingFields: missing,
        nextQuestion: this.generateQuestion(missing[0]),
        confidence: 0
      };
    }

    if (optionalMissing.length > 0 && requirements.confidence < 0.8) {
      return {
        ready: false,
        missingFields: optionalMissing,
        nextQuestion: this.generateQuestion(optionalMissing[0]),
        confidence: 0.5
      };
    }

    return {
      ready: true,
      missingFields: [],
      confidence: 1
    };
  }

  private generateQuestion(field: string): string {
    const questions = {
      topic: "你想写什么主题的笔记呢？",
      style: "你希望是什么风格？（清新自然、专业干货、生活分享等）",
      keywords: "有什么关键词需要突出吗？",
      audience: "目标读者是谁呢？"
    };
    return questions[field] || "还有其他要求吗？";
  }
}
```

---

## 数据结构

### ConversationSession (对话会话)

```typescript
interface ConversationSession {
  id: string;
  userId: string;
  messages: Message[];
  extractedRequirements: ExtractedRequirements;
  status: 'active' | 'ready' | 'generating' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
```

### ConversationResponse (对话响应)

```typescript
interface ConversationResponse {
  message: string;                    // AI 回复
  extractedRequirements: ExtractedRequirements;  // 当前提取的需求
  readinessStatus: ReadinessStatus;   // 准备度状态
  suggestions?: string[];             // 建议（可选）
}
```

---

## API 设计

### 1. 开始对话

```
POST /api/conversation/start
Response: {
  sessionId: string;
  message: string;  // AI 的开场白
}
```

### 2. 发送消息

```
POST /api/conversation/message
Body: {
  sessionId: string;
  message: string;
}
Response: {
  message: string;              // AI 回复
  extractedRequirements: {...}; // 当前提取的需求
  readinessStatus: {
    ready: boolean;
    nextQuestion?: string;
  }
}
```

### 3. 确认生成

```
POST /api/conversation/generate
Body: {
  sessionId: string;
}
Response: {
  generatedContent: {...}  // 生成的内容
}
```

---

## 前端交互设计

### UI 组件

```
┌─────────────────────────────────────────────────┐
│  对话区域                                        │
│  ┌───────────────────────────────────────────┐ │
│  │ AI: 你好！我可以帮你创作小红书笔记。      │ │
│  │     你想写什么主题的内容呢？              │ │
│  └───────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────┐ │
│  │ 用户: 我想写一篇关于健康早餐的笔记       │ │
│  └───────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────┐ │
│  │ AI: 很好！你希望是什么风格？              │ │
│  │     清新自然、专业干货还是生活分享？      │ │
│  └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  需求信息卡片（实时更新）                       │
│  ✅ 主题: 健康早餐                              │
│  ⏳ 风格: 待确定                                │
│  ⏳ 关键词: 待确定                              │
├─────────────────────────────────────────────────┤
│  输入框                                          │
│  [                                    ] [发送]  │
│                                                  │
│  [开始生成内容] (准备好后显示)                  │
└─────────────────────────────────────────────────┘
```

### 状态管理

```typescript
interface ConversationState {
  sessionId: string | null;
  messages: Message[];
  extractedRequirements: ExtractedRequirements;
  isReady: boolean;
  isGenerating: boolean;
}
```

---

## 实现步骤

### Phase 1: 核心功能（1-2天）

1. ✅ 创建 `ConversationManager` 类
2. ✅ 实现 `RequirementExtractor`
3. ✅ 实现 `ReadinessChecker`
4. ✅ 添加 API 路由
5. ✅ 对话历史存储（内存或 Redis）

### Phase 2: 前端集成（1天）

1. ✅ 创建对话 UI 组件
2. ✅ 实时显示提取的需求
3. ✅ 准备度指示器
4. ✅ 与现有生成流程集成

### Phase 3: 优化（1天）

1. ✅ 对话历史持久化
2. ✅ 多轮对话优化
3. ✅ 智能引导问题
4. ✅ 用户体验优化

---

## 提示词设计

### 对话 AI 的系统提示词

```
你是一个小红书内容创作助手，负责通过对话了解用户的需求。

你的任务：
1. 友好地与用户对话，了解他们想创作的内容
2. 提取关键信息：主题、风格、关键词、目标受众
3. 如果信息不足，引导用户提供更多细节
4. 当信息充足时，总结需求并询问是否开始生成

对话风格：
- 友好、自然、不啰嗦
- 一次只问一个问题
- 提供选项帮助用户选择
- 适时给出建议

可用的风格：
- 清新自然：温柔治愈，如春风拂面
- 专业干货：结构清晰，信息密度高
- 生活分享：真实接地气，像朋友聊天
- 种草推荐：真诚推荐，突出亮点
- 情感共鸣：细腻走心，引发共鸣
- 幽默搞笑：轻松有趣，段子手风格
- 文艺复古：文艺范儿，复古调调
```

### 需求提取的提示词

```
从以下对话中提取小红书笔记的需求信息。

要求：
1. 提取主题（topic）：用户想写什么内容
2. 提取风格（style）：从可用风格中选择最匹配的
3. 提取关键词（keywords）：用户强调的重点
4. 提取目标受众（audience）：内容面向谁
5. 提取特殊要求（requirements）：其他需求

返回 JSON 格式，包含置信度（0-1）。

对话历史：
{conversation}

可用风格：清新自然、专业干货、生活分享、种草推荐、情感共鸣、幽默搞笑、文艺复古
```

---

## 优势

1. **更好的用户体验**: 对话式交互更自然
2. **更准确的需求**: 通过对话澄清需求
3. **灵活性**: 用户可以随时调整需求
4. **智能引导**: AI 主动引导用户提供必要信息
5. **无缝衔接**: 对话结束后自动进入生成阶段

---

## 技术选型

### 方案 A: 纯自研（推荐）

- 使用现有的适配器系统
- 轻量级，完全可控
- 适合当前架构

### 方案 B: 集成 Vercel AI SDK

```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4'),
  messages: conversationHistory,
  system: conversationSystemPrompt,
});
```

### 方案 C: 集成 LangChain

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ConversationChain } from "langchain/chains";

const chain = new ConversationChain({
  llm: new ChatOpenAI(),
  memory: new BufferMemory(),
});
```

---

## 下一步

1. 选择实现方案（推荐方案 A）
2. 创建核心模块
3. 实现 API 路由
4. 开发前端 UI
5. 测试和优化

---

**文档创建**: 2026-03-08
**状态**: 设计阶段
