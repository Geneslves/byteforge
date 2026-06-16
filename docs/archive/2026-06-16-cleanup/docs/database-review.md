# ByteForge 数据库方案评估

## 一、当前 Schema 分析

### 现有表结构

| 表名 | 用途 | 关键字段 | 状态 |
|-----|------|---------|------|
| users | 用户账户 | id, username, email, password_hash, role | ✅ 良好 |
| settings | 系统设置 | key, value | ✅ 良好 |
| sessions | 会话管理 | id, user_id, token_hash | ⚠️ 未使用 |
| feedback | 用户反馈 | id, user_id, document_id, route_path, message | ✅ 良好 |
| content_events | 内容事件 | id, user_id, document_id, route_path, event_type | ⚠️ 需优化 |

---

## 二、识别的问题

### 🔴 严重问题

#### 1. **content_events 表会快速膨胀**
**问题：** 每个页面浏览、点击都记录，数据增长很快
- 1000 访问/天 × 365 天 = 365,000 条记录/年
- 10,000 访问/天 = 3,650,000 条记录/年

**影响：**
- 查询变慢
- 存储成本增加
- D1 可能达到限制

**建议：**
```sql
-- 添加数据保留策略
-- 选项 1: 定期归档旧数据（推荐）
-- 选项 2: 添加 TTL 删除旧数据
-- 选项 3: 聚合历史数据后删除明细
```

#### 2. **缺少数据清理机制**
**问题：** 没有自动清理过期数据的机制
- 过期的 sessions 记录会累积
- 旧的 rate_limits 记录会累积

**建议：** 添加定期清理任务

### ⚠️ 需要优化的地方

#### 3. **user_id 外键约束不一致**
**当前：**
```sql
-- feedback 表
user_id TEXT,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

-- content_events 表
user_id TEXT,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
```

**问题：** 
- `content_events` 是匿名事件追踪，不应该有 user_id
- `feedback` 支持匿名反馈，user_id 可选是合理的

**建议：**
```sql
-- content_events 应该移除 user_id 外键
-- 或明确这是用于已登录用户的行为追踪
```

#### 4. **sessions 表未被使用**
**当前：** 定义了 sessions 表但实际使用无状态 JWT

**选项：**
- **保留** - 未来可能需要服务端会话管理（推荐）
- **删除** - 简化 schema
- **使用** - 实现 token 黑名单/撤销机制

#### 5. **索引可能不够优化**
**当前索引：**
- ✅ `users(username)` - 登录查询
- ✅ `users(email)` - 登录查询  
- ✅ `feedback(created_at)` - 时间排序
- ✅ `content_events(created_at)` - 时间排序

**缺失的索引：**
```sql
-- 高频查询但缺少索引
-- 1. 按事件类型统计（admin/analytics.js）
CREATE INDEX IF NOT EXISTS idx_content_events_type_created 
ON content_events(event_type, created_at);

-- 2. 按文档 ID 聚合（admin/content-stats.js）
-- 已有 idx_content_events_document_id，良好

-- 3. 按路由路径查询（可能的未来需求）
-- 已有 idx_content_events_route_path，良好
```

---

## 三、重构方案中新增的表

### 需要添加的表

#### 1. **rate_limits 表** (必需)
```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);
```

**用途：** API 限流
**增长率：** 中等（每个 IP/用户 一条记录，定期过期）

#### 2. **refresh_tokens 表** (推荐)
```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**用途：** 长期会话，token 刷新
**增长率：** 低（每个活跃用户 1-2 条记录）

---

## 四、性能考虑

### D1 (SQLite) 限制

| 限制项 | 值 | 影响 |
|-------|-----|------|
| 数据库大小 | 10 GB (付费可扩展) | 需要数据归档策略 |
| 单次查询时间 | 30 秒 | 需要优化慢查询 |
| 写入并发 | 有限 | 高并发写入可能瓶颈 |
| 读取并发 | 良好 | 读多写少场景友好 |

### 当前使用模式分析

**写入频率：**
- `content_events` - **高频** (每个页面浏览)
- `feedback` - **低频** (用户主动提交)
- `users` - **低频** (注册/登录)
- `settings` - **极低频** (管理操作)

**读取频率：**
- `content_events` - **高频** (分析查询)
- `users` - **高频** (认证查询)
- `feedback` - **中频** (管理后台)
- `settings` - **高频** (每个请求可能读取)

### 优化建议

#### 1. **content_events 表优化**

**问题：** 高频写入 + 高频聚合查询

**方案 A：分区 + 归档（推荐）**
```sql
-- 保留近期数据用于实时查询
-- 归档历史数据到另一个表或导出

-- 归档表
CREATE TABLE IF NOT EXISTS content_events_archive (
  year_month TEXT NOT NULL,
  document_id TEXT,
  route_path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_count INTEGER NOT NULL,
  PRIMARY KEY (year_month, document_id, route_path, event_type)
);

-- 定期任务：聚合旧数据到归档表，删除明细
```

**方案 B：采样记录**
```javascript
// 只记录部分事件（例如 10% 采样）
if (Math.random() < 0.1) {
  await recordEvent(event);
}
```

**方案 C：使用 Cloudflare Analytics（推荐）**
```javascript
// 将页面浏览事件发送到 Cloudflare Analytics
// 而不是存储到 D1
// D1 只存储需要关联的业务事件
```

#### 2. **settings 表优化**

**问题：** 每个请求可能都读取设置

**方案：缓存 + 版本号**
```javascript
// 使用 Workers KV 缓存设置
// 或在内存中缓存（Workers 实例级别）

let cachedSettings = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟

export async function getSettings(env) {
  const now = Date.now();
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }
  
  const settings = await env.DB.prepare(
    'SELECT key, value FROM settings'
  ).all();
  
  cachedSettings = Object.fromEntries(
    settings.results.map(s => [s.key, s.value])
  );
  cacheTime = now;
  
  return cachedSettings;
}
```

#### 3. **复合索引优化**

```sql
-- 优化常见查询模式

-- content_events: 按文档 + 类型 + 时间查询
CREATE INDEX IF NOT EXISTS idx_content_events_doc_type_time 
ON content_events(document_id, event_type, created_at DESC);

-- feedback: 按文档 + 时间查询  
CREATE INDEX IF NOT EXISTS idx_feedback_doc_time 
ON feedback(document_id, created_at DESC);

-- users: 复合查询（已有单列索引足够）
```

---

## 五、最终建议

### ✅ 可以保留的部分

1. **users 表** - 结构良好，无需修改
2. **settings 表** - 结构合理，建议添加缓存
3. **feedback 表** - 设计合理，允许匿名反馈
4. **sessions 表** - 保留作为未来扩展
5. **现有索引** - 基本覆盖，略微调整

### 🔧 必须修改的部分

1. **添加 rate_limits 表**
   ```sql
   -- 见上文定义
   ```

2. **优化 content_events 索引**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_content_events_doc_type_time 
   ON content_events(document_id, event_type, created_at DESC);
   ```

3. **添加数据清理机制**
   ```javascript
   // 定期清理任务（GitHub Actions 或 Workers Cron）
   // 1. 删除 90 天前的 content_events
   // 2. 删除过期的 rate_limits
   // 3. 删除过期的 refresh_tokens
   ```

### 📋 推荐添加的部分

1. **refresh_tokens 表** - 提升用户体验
2. **content_events_archive 表** - 长期数据保留
3. **migrations 版本表** - 追踪 schema 变更

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
```

---

## 六、迁移计划

### 阶段 1：立即实施（不影响现有功能）

```sql
-- migrations/002_add_rate_limits.sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);
```

### 阶段 2：优化索引（不影响现有功能）

```sql
-- migrations/003_optimize_indexes.sql
CREATE INDEX IF NOT EXISTS idx_content_events_doc_type_time 
ON content_events(document_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_doc_time 
ON feedback(document_id, created_at DESC);
```

### 阶段 3：添加 Refresh Token（需要代码配合）

```sql
-- migrations/004_add_refresh_tokens.sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

### 阶段 4：数据归档（需要定期任务）

```sql
-- migrations/005_add_archive.sql
CREATE TABLE IF NOT EXISTS content_events_archive (
  year_month TEXT NOT NULL,
  document_id TEXT,
  route_path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_count INTEGER NOT NULL,
  PRIMARY KEY (year_month, document_id, route_path, event_type)
);
```

---

## 七、结论

### 当前方案评分

| 维度 | 评分 | 说明 |
|-----|------|------|
| 基础结构 | ⭐⭐⭐⭐⭐ | 设计合理，符合规范 |
| 索引优化 | ⭐⭐⭐⭐ | 基本覆盖，可略微增强 |
| 可扩展性 | ⭐⭐⭐⭐ | 结构清晰，易于扩展 |
| 性能考虑 | ⭐⭐⭐ | 需要添加缓存和归档策略 |
| 数据治理 | ⭐⭐⭐ | 缺少清理和归档机制 |

**总体评价：** ⭐⭐⭐⭐ (4/5)

### 最终答案

**✅ 当前数据库方案总体可行，无需大改**

**必须做的修改（P0）：**
1. 添加 `rate_limits` 表（限流必需）
2. 优化 `content_events` 索引
3. 实现数据清理脚本

**建议做的修改（P1）：**
1. 添加 `refresh_tokens` 表
2. 实现 `settings` 缓存
3. 添加 `content_events_archive` 表

**未来考虑（P2）：**
1. 启用 `sessions` 表实现 token 黑名单
2. 引入 Cloudflare Analytics 减轻 D1 压力
3. 使用 Cloudflare KV 缓存热点数据

**优先级建议：**
立即做：rate_limits → 索引优化 → 清理脚本  
一周内：refresh_tokens → settings 缓存  
一个月内：归档机制 → Cloudflare Analytics 集成
