# SQLite 数据迁移指南

## 背景

项目已将所有配置数据从 JSON 文件迁移到 SQLite 统一存储，以提升性能和数据一致性。

## 迁移内容

| 原文件 | SQLite 表 | 说明 |
|--------|----------|------|
| `config/user-profile.json` | `settings` 表 (key: 'user_profile') | 用户配置、偏好设置 |
| `config/model-config.json` | `settings` 表 (key: 'model_config') | 模型配置、API Key |
| `config/cookies.json` | `cookies` 表 | 小红书登录 Cookie |

## 迁移步骤

### 1. 备份现有配置（可选但推荐）

```bash
# 创建备份目录
mkdir -p config/backup

# 备份现有配置
cp config/user-profile.json config/backup/
cp config/model-config.json config/backup/
cp config/cookies.json config/backup/
```

### 2. 运行迁移脚本

```bash
npm run migrate
```

迁移脚本会：
- 自动检测 SQLite 数据库中是否已存在数据
- 如果已存在，会跳过该项避免覆盖
- 显示详细的迁移结果（成功/跳过/失败）

### 3. 验证迁移结果

运行健康检查：

```bash
npm run health
```

你应该看到：
```
✅ SQLite 数据库连接正常
✅ 模型配置已设置（SQLite）
✅ Cookie 已保存（SQLite）
```

### 4. 清理原配置文件（可选）

确认迁移成功后，可以删除原 JSON 配置文件：

```bash
# 删除配置文件（保留 *.example.json 示例文件）
rm config/user-profile.json
rm config/model-config.json
rm config/cookies.json
```

## 验证 Web 界面

启动后端和前端，访问 Web 界面检查配置是否正确：

```bash
# 启动后端
npm run server

# 启动前端（新终端）
cd web && npm run dev
```

访问 http://localhost:3000/settings 检查配置是否已加载。

## 技术细节

### 存储结构

**settings 表**：
```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,  -- 'user_profile' | 'model_config' | 'system'
  value TEXT NOT NULL,     -- JSON 字符串
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**cookies 表**：
```sql
CREATE TABLE cookies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,      -- JSON 字符串
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 缓存机制

所有配置读取都带有内存缓存：
- `configCache`: 配置缓存，TTL 10 分钟
- `promptsCache`: 提示词缓存，TTL 30 秒
- `globalCache`: 全局缓存，TTL 5 分钟

文件变更时自动失效（通过 fs.watch 监听）。

### API 端点

迁移后，所有配置通过 REST API 访问：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/model-config` | GET | 获取模型配置 |
| `/api/model-config` | PUT | 更新模型配置 |
| `/api/user-profile` | GET | 获取用户配置 |
| `/api/user-profile` | PUT | 更新用户配置 |
| `/api/user-profile/keywords` | GET | 获取关键词 |
| `/api/user-profile/banned-words` | GET | 获取禁用词 |

## 回滚方案（如有必要）

如果需要回滚到 JSON 文件存储：

1. 从 SQLite 导出数据：
```sql
-- 导出 user_profile
SELECT value FROM settings WHERE key = 'user_profile';

-- 导出 model_config
SELECT value FROM settings WHERE key = 'model_config';

-- 导出 cookies
SELECT data FROM cookies LIMIT 1;
```

2. 将 JSON 写入对应的 config/*.json 文件

3. 修改代码使用原有的文件读写逻辑

## 性能提升

- **读取性能**: 从文件系统读取 → 内存缓存，减少 IO 操作
- **写入性能**: SQLite WAL 模式支持并发写入
- **数据一致性**: 统一存储引擎，避免数据不同步
- **查询能力**: 支持 SQL 查询，便于未来扩展

## 常见问题

**Q: 迁移失败怎么办？**
A: 检查 `data/agent.db` 文件是否有写权限，删除后重新运行迁移。

**Q: 迁移后原来的 JSON 文件还有用吗？**
A: 迁移成功后，JSON 文件不再使用，可以删除或保留作为备份。

**Q: 如何清空 SQLite 数据重新配置？**
A: 删除 `data/agent.db` 文件，然后重新运行迁移或访问 Web 界面配置。
