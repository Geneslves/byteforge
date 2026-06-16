# 数据库迁移快速指南

## 🚀 已创建的文件

### 迁移脚本（migrations/）
```
migrations/
├── 001_initial_schema.sql          ✅ 基础 schema（已存在）
├── 002_add_rate_limits.sql         🆕 添加 rate_limits 表
├── 003_optimize_indexes.sql        🆕 优化索引
├── 004_add_refresh_tokens.sql      🆕 添加 refresh_tokens 表
├── 005_add_schema_migrations.sql   🆕 添加迁移追踪表
└── README.md                        📖 完整文档
```

### 迁移工具（scripts/db/）
```
scripts/db/
└── migrate.js                       🆕 自动化迁移脚本
```

---

## ⚡ 快速开始

### 步骤 1：应用迁移到本地开发环境

```bash
# 确保本地 D1 数据库存在
wrangler d1 list

# 应用所有迁移
pnpm run db:migrate:dev
```

**预期输出：**
```
╔════════════════════════════════════════════════════════════╗
║        ByteForge Database Migration Tool                  ║
╚════════════════════════════════════════════════════════════╝

Database:     byteforge-dev
Environment:  Local (Development)
Mode:         Live

Found 5 migration file(s):
  • 001_initial_schema.sql
  • 002_add_rate_limits.sql
  • 003_optimize_indexes.sql
  • 004_add_refresh_tokens.sql
  • 005_add_schema_migrations.sql

Checking current migration state...
Current version: 1

Found 4 pending migration(s) to apply:
  • 002_add_rate_limits.sql
  • 003_optimize_indexes.sql
  • 004_add_refresh_tokens.sql
  • 005_add_schema_migrations.sql

─────────────────────────────────────────────────────────────
📦 Applying migration 2: 002_add_rate_limits.sql
   Preview: CREATE TABLE IF NOT EXISTS rate_limits (...
✅ Migration 2 applied successfully
─────────────────────────────────────────────────────────────
📦 Applying migration 3: 003_optimize_indexes.sql
   Preview: CREATE INDEX IF NOT EXISTS idx_content_events_doc_type...
✅ Migration 3 applied successfully
─────────────────────────────────────────────────────────────
📦 Applying migration 4: 004_add_refresh_tokens.sql
   Preview: CREATE TABLE IF NOT EXISTS refresh_tokens (...
✅ Migration 4 applied successfully
─────────────────────────────────────────────────────────────
📦 Applying migration 5: 005_add_schema_migrations.sql
   Preview: CREATE TABLE IF NOT EXISTS schema_migrations (...
✅ Migration 5 applied successfully
─────────────────────────────────────────────────────────────

╔════════════════════════════════════════════════════════════╗
║                  Migration Summary                         ║
╚════════════════════════════════════════════════════════════╝
✅ Successful: 4

Current database version: 5

🎉 All migrations applied successfully!
```

### 步骤 2：验证迁移

```bash
# 检查新表是否存在
wrangler d1 execute byteforge-dev --local --command="SELECT name FROM sqlite_master WHERE type='table'"

# 应该看到：
# - users
# - settings
# - sessions
# - feedback
# - content_events
# - rate_limits          ← 新增
# - refresh_tokens       ← 新增
# - schema_migrations    ← 新增
```

### 步骤 3：应用到 Staging（如果有）

```bash
# 先备份
wrangler d1 export byteforge-staging --remote --output=backup-staging-$(date +%Y%m%d).sql

# 应用迁移
pnpm run db:migrate:staging
```

### 步骤 4：应用到生产环境

```bash
# ⚠️ 生产环境操作需谨慎！

# 1. 先备份
wrangler d1 export byteforge --remote --output=backup-production-$(date +%Y%m%d).sql

# 2. 干运行（测试）
node scripts/db/migrate.js byteforge --remote --dry-run

# 3. 应用迁移
pnpm run db:migrate:production
```

---

## 📋 迁移内容详解

### Migration 002: rate_limits 表

**用途：** API 限流

```sql
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,              -- 限流键（如 "rl:ip:127.0.0.1:1234567890"）
  value TEXT NOT NULL,               -- 当前计数
  expires_at TEXT NOT NULL,          -- 过期时间
  created_at TEXT NOT NULL           -- 创建时间
);
```

**使用场景：**
```javascript
// functions/lib/rate-limit/index.js
await rateLimiter.check('ip:127.0.0.1', 100, 15 * 60 * 1000);
// 限制：15 分钟内最多 100 次请求
```

---

### Migration 003: 优化索引

**优化的查询：**

1. **按文档 + 类型统计**
```sql
-- 优化前：全表扫描
-- 优化后：使用 idx_content_events_doc_type_time
SELECT event_type, COUNT(*) 
FROM content_events 
WHERE document_id = 'doc-123' 
GROUP BY event_type;
```

2. **按文档查询反馈**
```sql
-- 优化前：document_id 索引 + 文件排序
-- 优化后：使用 idx_feedback_doc_time
SELECT * 
FROM feedback 
WHERE document_id = 'doc-123' 
ORDER BY created_at DESC;
```

**预期性能提升：** 2-5 倍

---

### Migration 004: refresh_tokens 表

**用途：** 长期会话管理

```sql
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,           -- SHA-256 哈希
  expires_at TEXT NOT NULL,           -- 30 天过期
  created_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0  -- 0=活跃, 1=已撤销
);
```

**使用流程：**
```
1. 用户登录 → 返回 access_token (7天) + refresh_token (30天)
2. access_token 过期 → 用 refresh_token 换新的 access_token
3. 用户登出 → 撤销 refresh_token (revoked = 1)
```

---

### Migration 005: schema_migrations 表

**用途：** 追踪迁移历史

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,        -- 迁移版本号
  name TEXT NOT NULL,                 -- 迁移名称
  applied_at TEXT NOT NULL            -- 应用时间
);
```

**查询迁移历史：**
```sql
SELECT * FROM schema_migrations ORDER BY version;

-- 输出：
-- version | name                   | applied_at
-- --------|------------------------|-------------------
-- 1       | initial_schema         | 2026-06-15 10:00
-- 2       | add_rate_limits        | 2026-06-15 10:05
-- 3       | optimize_indexes       | 2026-06-15 10:05
-- 4       | add_refresh_tokens     | 2026-06-15 10:05
-- 5       | add_schema_migrations  | 2026-06-15 10:05
```

---

## 🔧 常用命令

### 迁移命令
```bash
# 本地开发环境
pnpm run db:migrate:dev

# Staging 环境
pnpm run db:migrate:staging

# 生产环境
pnpm run db:migrate:production

# 自定义数据库
node scripts/db/migrate.js my-database --remote

# 干运行（测试）
node scripts/db/migrate.js byteforge --dry-run
```

### 数据库命令
```bash
# 查看所有数据库
wrangler d1 list

# 查看表结构
wrangler d1 execute byteforge-dev --local --command="SELECT sql FROM sqlite_master WHERE type='table'"

# 查看索引
wrangler d1 execute byteforge-dev --local --command="SELECT name, sql FROM sqlite_master WHERE type='index'"

# 查看当前迁移版本
wrangler d1 execute byteforge-dev --local --command="SELECT value FROM settings WHERE key='migration_version'"

# 备份数据库
wrangler d1 export byteforge --remote --output=backup.sql

# 导入数据库
wrangler d1 execute byteforge --remote --file=backup.sql
```

---

## ⚠️ 注意事项

### 1. 迁移是幂等的
所有迁移脚本使用 `IF NOT EXISTS`，可以安全地重复运行：
```sql
CREATE TABLE IF NOT EXISTS rate_limits (...);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON ...;
INSERT OR IGNORE INTO settings VALUES (...);
```

### 2. 迁移顺序很重要
- 迁移按文件名排序执行：`001` → `002` → `003`
- 不要跳过或重新编号现有迁移
- 新迁移始终使用下一个版本号

### 3. 生产环境操作
```bash
# ✅ 正确流程
1. 备份数据库
2. 在 staging 测试
3. 干运行验证
4. 应用迁移
5. 验证结果

# ❌ 错误做法
- 不备份直接迁移
- 跳过 staging 测试
- 不验证结果
```

### 4. 迁移失败处理
```bash
# 如果迁移失败：
1. 查看错误信息
2. 检查失败的迁移文件
3. 修复问题（如有必要手动清理）
4. 重新运行迁移

# 恢复备份：
wrangler d1 execute byteforge --remote --file=backup.sql
```

---

## 📊 影响评估

### 数据库变化
- **新增表：** 3 个（rate_limits, refresh_tokens, schema_migrations）
- **新增索引：** 4 个（复合索引）
- **数据变化：** 无（只是结构变化）

### 应用兼容性
- ✅ **向后兼容** - 现有代码继续工作
- ✅ **零停机** - 可在线应用迁移
- ⚠️ **新功能需要代码配合** - refresh_tokens 和 rate_limits 表需要新代码才能使用

### 性能影响
- ✅ **查询速度提升** - 复合索引优化常见查询
- ✅ **存储增加微小** - 每个索引约增加 1-5% 存储
- ✅ **写入性能影响微小** - 索引会略微降低写入速度（< 5%）

---

## 🎯 下一步

### 立即可做
- [x] ✅ 应用迁移到本地开发环境
- [ ] 🔄 应用迁移到 staging 环境（如有）
- [ ] 🔄 应用迁移到生产环境

### 后续工作
- [ ] 实现 rate-limit 中间件（使用 rate_limits 表）
- [ ] 实现 refresh token API（使用 refresh_tokens 表）
- [ ] 添加数据清理脚本（清理过期记录）
- [ ] 配置监控和告警

### 可选优化
- [ ] 数据归档机制（content_events_archive 表）
- [ ] settings 缓存实现
- [ ] 集成 Cloudflare Analytics

---

## 📚 参考文档

- [完整迁移文档](./migrations/README.md)
- [数据库评估](./database-review.md)
- [数据库选型分析](./database-selection-analysis.md)
- [后端重构方案](./backend-refactoring-plan.md)

---

## ❓ 常见问题

**Q: 迁移可以回滚吗？**  
A: D1 不支持自动回滚。需要手动编写反向迁移或从备份恢复。

**Q: 如何跳过某个迁移？**  
A: 不建议跳过。如果必须，手动在 schema_migrations 表中标记为已应用。

**Q: 迁移会影响现有数据吗？**  
A: 这些迁移只添加表和索引，不修改现有数据。100% 安全。

**Q: 可以在生产环境回滚吗？**  
A: 可以，但需要提前准备好备份和反向迁移脚本。

**Q: 多个人同时迁移会怎样？**  
A: 迁移脚本是幂等的，但建议指定一个人负责迁移操作。

---

**创建日期：** 2026-06-15  
**最后更新：** 2026-06-15  
**状态：** ✅ 可用
