# 对话式需求收集 - 改动评估报告

> 评估集成 Vercel AI SDK 实现对话功能的改动范围

---

## 当前代码规模

- **后端文件数**: 31 个 TypeScript 文件
- **后端代码量**: ~3600 行
- **前端代码量**: ~2000 行（估算）
- **总代码量**: ~5600 行

---

## 改动评估

### 📊 改动规模总览

| 类型 | 新增文件 | 修改文件 | 新增代码行 | 修改代码行 | 改动比例 |
|------|---------|---------|-----------|-----------|---------|
| 后端 | 5-6 个 | 3-4 个 | ~800 行 | ~200 行 | **~28%** |
| 前端 | 2-3 个 | 2 个 | ~600 行 | ~150 行 | **~38%** |
| 配置 | 1 个 | 2 个 | ~50 行 | ~20 行 | - |
| **总计** | **8-10 个** | **7-8 个** | **~1450 行** | **~370 行** | **~32%** |

### 结论

**改动规模**: 中等偏大
- 新增代码约占现有代码的 **26%**
- 修改代码约占现有代码的 **7%**
- 总体改动约 **32%**

---

## 详细改动清单

### 1. 后端改动 (Backend)

#### 新增文件 (5-6 个)

```
src/
├── conversation/                          # 新增目录
│   ├── conversation-manager.ts           # 对话管理器 (~200 行)
│   ├── requirement-extractor.ts          # 需求提取器 (~150 行)
│   ├── readiness-checker.ts              # 准备度检查 (~100 行)
│   ├── session-store.ts                  # 会话存储 (~150 行)
│   └── types.ts                          # 类型定义 (~100 行)
└── routes/
    └── conversation.ts                    # 对话 API 路由 (~200 行)
```

**新增代码量**: ~900 行

#### 修改文件 (3-4 个)

1. **`src/server.ts`** (~20 行改动)
   ```typescript
   // 新增对话路由
   import conversationRoutes from './routes/conversation.js';
   app.use('/api/conversation', conversationRoutes);
   ```

2. **`src/core/orchestrator.ts`** (~50 行改动)
   ```typescript
   // 新增从对话会话创建生成任务的方法
   async executeFromConversation(sessionId: string): Promise<PublishResult> {
     const requirements = await conversationManager.getRequirements(sessionId);
     return this.execute({
       topic: requirements.topic,
       style: requirements.style,
       keywords: requirements.keywords,
       // ...
     });
   }
   ```

3. **`src/agent.ts`** (~30 行改动)
   ```typescript
   // 导出 ConversationManager
   export { ConversationManager } from './conversation/conversation-manager.js';
   ```

4. **`src/adapters/base.ts`** (~20 行改动)
   ```typescript
   // 可能需要扩展适配器接口支持流式响应
   interface TextModelAdapter {
     chatCompletion(...): Promise<ModelResponse>;
     chatCompletionStream?(...): AsyncIterator<string>; // 新增
   }
   ```

**修改代码量**: ~120 行

---

### 2. 前端改动 (Frontend)

#### 新增文件 (2-3 个)

```
web/src/
├── app/
│   └── conversation/
│       └── page.tsx                      # 对话页面 (~300 行)
├── components/
│   ├── conversation/
│   │   ├── chat-interface.tsx           # 对话界面组件 (~200 行)
│   │   ├── requirement-card.tsx         # 需求信息卡片 (~100 行)
│   │   └── message-bubble.tsx           # 消息气泡 (~50 行)
└── hooks/
    └── use-conversation.ts               # 对话 Hook (~150 行)
```

**新增代码量**: ~800 行

#### 修改文件 (2 个)

1. **`web/src/app/page.tsx`** (~50 行改动)
   ```typescript
   // 添加"对话模式"入口
   <Button onClick={() => router.push('/conversation')}>
     💬 对话模式
   </Button>
   ```

2. **`web/src/app/api/` 路由** (~100 行改动)
   ```typescript
   // 新增对话相关的 API 代理路由
   // app/api/conversation/start/route.ts
   // app/api/conversation/message/route.ts
   // app/api/conversation/generate/route.ts
   ```

**修改代码量**: ~150 行

---

### 3. 配置改动

#### 新增文件 (1 个)

```
prompts/
└── conversation-prompts.json             # 对话提示词配置 (~50 行)
```

#### 修改文件 (2 个)

1. **`package.json`** (~10 行)
   ```json
   {
     "dependencies": {
       "ai": "^3.0.0",              // Vercel AI SDK
       "@ai-sdk/openai": "^0.0.24"  // OpenAI provider
     }
   }
   ```

2. **`web/package.json`** (~10 行)
   ```json
   {
     "dependencies": {
       "ai": "^3.0.0"  // 前端也需要
     }
   }
   ```

---

## 核心改动分析

### 🟢 低风险改动 (不影响现有功能)

1. **新增独立模块** (conversation/)
   - 完全独立的新模块
   - 不影响现有生成流程
   - 可以逐步开发和测试

2. **新增 API 路由** (routes/conversation.ts)
   - 独立的路由，不影响现有 API
   - 可以并行开发

3. **新增前端页面** (conversation/page.tsx)
   - 独立页面，不影响现有 UI
   - 可以通过路由切换

### 🟡 中风险改动 (需要小心处理)

1. **Orchestrator 扩展**
   - 需要新增方法，但不修改现有方法
   - 风险：需要确保新方法与现有流程兼容

2. **适配器接口扩展**
   - 可能需要支持流式响应
   - 风险：需要确保向后兼容

### 🔴 高风险改动 (需要重点关注)

**无高风险改动** - 所有改动都是增量式的，不破坏现有功能

---

## 开发工作量评估

### 按模块划分

| 模块 | 工作量 | 复杂度 | 优先级 |
|------|--------|--------|--------|
| ConversationManager | 1-2 天 | 中 | P0 |
| RequirementExtractor | 0.5-1 天 | 低 | P0 |
| ReadinessChecker | 0.5 天 | 低 | P0 |
| SessionStore | 0.5 天 | 低 | P1 |
| API 路由 | 0.5-1 天 | 低 | P0 |
| 前端对话界面 | 1-2 天 | 中 | P0 |
| 需求卡片组件 | 0.5 天 | 低 | P1 |
| 集成测试 | 1 天 | 中 | P0 |
| 文档更新 | 0.5 天 | 低 | P1 |

**总工作量**: 6-9 天（1-1.5 周）

### 按阶段划分

**Phase 1: 核心功能** (3-4 天)
- ✅ ConversationManager
- ✅ RequirementExtractor
- ✅ ReadinessChecker
- ✅ API 路由
- ✅ 基础前端界面

**Phase 2: 完善功能** (2-3 天)
- ✅ SessionStore (持久化)
- ✅ 流式响应
- ✅ 需求卡片优化
- ✅ 错误处理

**Phase 3: 优化和测试** (1-2 天)
- ✅ 集成测试
- ✅ 用户体验优化
- ✅ 文档更新

---

## 技术风险评估

### 低风险 ✅

1. **架构兼容性**: 新功能完全独立，不影响现有架构
2. **代码隔离**: 新代码在独立目录，易于管理
3. **渐进式开发**: 可以分阶段开发和上线

### 中风险 ⚠️

1. **AI 模型调用成本**: 对话会增加 API 调用次数
   - **缓解**: 实现会话缓存，减少重复调用

2. **会话管理**: 需要管理多个并发会话
   - **缓解**: 使用 Redis 或内存存储，设置过期时间

3. **需求提取准确性**: AI 提取的需求可能不准确
   - **缓解**: 提供用户手动修正功能

### 高风险 ❌

**无高风险项**

---

## 依赖变更

### 新增依赖

```json
{
  "dependencies": {
    "ai": "^3.0.0",              // Vercel AI SDK (核心)
    "@ai-sdk/openai": "^0.0.24", // OpenAI provider
    "uuid": "^9.0.0"             // 会话 ID 生成
  }
}
```

**依赖大小**: ~500KB (gzipped)
**影响**: 包体积增加约 5%

---

## 性能影响评估

### API 响应时间

| 操作 | 当前 | 新增对话 | 影响 |
|------|------|---------|------|
| 开始对话 | - | ~200ms | 新增 |
| 发送消息 | - | ~1-2s | 新增 |
| 需求提取 | - | ~500ms | 新增 |
| 内容生成 | ~10-30s | ~10-30s | 无变化 |

### 资源消耗

- **内存**: 每个会话约 1-2MB，100 个并发会话约 100-200MB
- **存储**: 会话历史约 10-50KB/会话
- **API 调用**: 每次对话约 2-5 次额外调用

---

## 回滚方案

### 如果需要回滚

1. **删除新增文件** (conversation/ 目录)
2. **移除路由注册** (server.ts 中的一行)
3. **移除前端入口** (page.tsx 中的按钮)
4. **卸载依赖** (npm uninstall ai @ai-sdk/openai)

**回滚时间**: < 10 分钟
**回滚风险**: 极低（新功能完全独立）

---

## 对比：方案一 vs 方案二

| 维度 | 方案一（纯自研） | 方案二（Vercel AI SDK） |
|------|----------------|----------------------|
| 改动规模 | ~30% | ~32% |
| 开发时间 | 8-12 天 | 6-9 天 |
| 代码复杂度 | 高 | 中 |
| 依赖增加 | 0 | 2 个 |
| 流式响应 | 需要自己实现 | 内置支持 |
| 维护成本 | 高 | 低 |
| 灵活性 | 高 | 中 |
| 学习曲线 | 低（使用现有代码） | 中（需要学习 SDK） |

---

## 推荐方案

### 🎯 推荐：方案二（Vercel AI SDK）

**理由**:
1. **开发效率高**: 节省 2-3 天开发时间
2. **代码质量好**: SDK 经过充分测试
3. **功能完善**: 内置流式响应、错误处理
4. **维护成本低**: 不需要维护底层实现
5. **改动可控**: 32% 的改动规模可接受
6. **风险低**: 新功能完全独立，易于回滚

**适合场景**:
- ✅ 快速上线对话功能
- ✅ 需要流式响应体验
- ✅ 团队规模小，维护成本敏感

### 备选：方案一（纯自研）

**适合场景**:
- ✅ 需要完全自定义对话逻辑
- ✅ 不想引入外部依赖
- ✅ 有充足的开发时间

---

## 实施建议

### 1. 分阶段实施

**Week 1**: 核心功能
- Day 1-2: ConversationManager + API
- Day 3-4: 前端对话界面
- Day 5: 集成测试

**Week 2**: 优化和上线
- Day 1-2: 功能完善
- Day 3: 测试和修复
- Day 4-5: 文档和上线

### 2. 并行开发

- **后端**: 一人负责对话管理和 API
- **前端**: 一人负责对话界面
- **测试**: 并行进行单元测试

### 3. 灰度发布

1. 先在内部测试环境验证
2. 小范围用户灰度（10%）
3. 逐步扩大到全量

---

## 总结

### 改动规模

- **新增代码**: ~1450 行 (26%)
- **修改代码**: ~370 行 (7%)
- **总体改动**: ~32%
- **新增文件**: 8-10 个
- **修改文件**: 7-8 个

### 开发成本

- **时间**: 6-9 天 (1-1.5 周)
- **人力**: 1-2 人
- **风险**: 低

### 结论

✅ **改动规模适中，风险可控，建议实施**

使用 Vercel AI SDK 可以显著降低开发复杂度，提高开发效率，同时保持代码质量。新功能完全独立，不影响现有功能，回滚成本低。

---

**评估日期**: 2026-03-08
**评估人**: 项目维护者
