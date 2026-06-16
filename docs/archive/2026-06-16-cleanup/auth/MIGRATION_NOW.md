# 🚀 立即执行迁移 - 操作清单

## ⚡ 快速执行路径

### 第 1 步：Cloudflare 认证 (2 分钟)

```powershell
# 打开浏览器登录 Cloudflare
pnpm exec wrangler login

# 验证登录
pnpm exec wrangler whoami
```

**预期输出：**
```
Getting User settings...
👋 You are logged in with an OAuth Token, associated with the email '你的邮箱@example.com'!
```

---

### 第 2 步：检查/创建数据库 (3 分钟)

```powershell
# 查看现有数据库
pnpm exec wrangler d1 list

# 如果已有 byteforge 数据库，跳到第 3 步
# 如果没有，创建一个
pnpm exec wrangler d1 create byteforge
```

**创建数据库后的输出：**
```
✅ Successfully created DB 'byteforge'

[[d1_databases]]
binding = "DB"
database_name = "byteforge"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← 复制这个 ID
```

**重要：** 复制 `database_id`，更新 `wrangler.toml` 文件：

```toml
[[d1_databases]]
binding = "DB"
database_name = "byteforge"
database_id = "粘贴你的-database-id-在这里"  # ← 替换这行
```

---

### 第 3 步：检查数据库状态 (1 分钟)

```powershell
# 检查数据库是否已有数据
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

**情况 A：数据库是空的**
```
Rows: 0
```
→ 需要先应用基础 schema，继续步骤 4

**情况 B：已有表**
```
name
users
settings
sessions
feedback
content_events
```
→ 已有基础 schema，跳到步骤 5

---

### 第 4 步：应用基础 Schema（仅新数据库需要）

```powershell
# 应用初始 schema
pnpm exec wrangler d1 execute byteforge --remote --file=./schema/d1.sql

# 验证
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

**预期输出：**
```
name
users
settings
sessions
feedback
content_events
```

---

### 第 5 步：执行迁移 (2 分钟)

```powershell
# 方式 1：使用 npm script（推荐）
pnpm run db:migrate:production

# 方式 2：直接运行脚本
node scripts/db/migrate.js byteforge --remote
```

**预期输出：**
```
╔════════════════════════════════════════════════════════════╗
║        ByteForge Database Migration Tool                  ║
╚════════════════════════════════════════════════════════════╝

Database:     byteforge
Environment:  Remote (Production/Staging)
Mode:         Live

Found 5 migration file(s):
  • 001_initial_schema.sql
  • 002_add_rate_limits.sql
  • 003_optimize_indexes.sql
  • 004_add_refresh_tokens.sql
  • 005_add_schema_migrations.sql

Checking current migration state...
Current version: 0

Found 5 pending migration(s) to apply

─────────────────────────────────────────────────────────────
📦 Applying migration 2: 002_add_rate_limits.sql
✅ Migration 2 applied successfully
─────────────────────────────────────────────────────────────
📦 Applying migration 3: 003_optimize_indexes.sql
✅ Migration 3 applied successfully
─────────────────────────────────────────────────────────────
📦 Applying migration 4: 004_add_refresh_tokens.sql
✅ Migration 4 applied successfully
─────────────────────────────────────────────────────────────
📦 Applying migration 5: 005_add_schema_migrations.sql
✅ Migration 5 applied successfully

╔════════════════════════════════════════════════════════════╗
║                  Migration Summary                         ║
╚════════════════════════════════════════════════════════════╝
✅ Successful: 4

🎉 All migrations applied successfully!
```

---

### 第 6 步：验证结果 (2 分钟)

```powershell
# 1. 检查表（应该有 8 个）
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

# 2. 检查迁移版本
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT value FROM settings WHERE key='migration_version'"

# 3. 检查迁移历史
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT * FROM schema_migrations ORDER BY version"
```

**预期输出 1：表列表**
```
name
content_events
feedback
rate_limits          ← 新增
refresh_tokens       ← 新增
schema_migrations    ← 新增
sessions
settings
users
```

**预期输出 2：迁移版本**
```
value
5
```

**预期输出 3：迁移历史**
```
version | name                   | applied_at
1       | initial_schema         | 2026-06-15 12:00:00
2       | add_rate_limits        | 2026-06-15 12:00:01
3       | optimize_indexes       | 2026-06-15 12:00:02
4       | add_refresh_tokens     | 2026-06-15 12:00:03
5       | add_schema_migrations  | 2026-06-15 12:00:04
```

---

## ✅ 完成检查清单

迁移完成后，确认以下项目：

- [ ] **认证成功** - `wrangler whoami` 显示你的账户
- [ ] **数据库存在** - `wrangler d1 list` 显示 byteforge
- [ ] **database_id 已配置** - `wrangler.toml` 中填写了正确的 ID
- [ ] **迁移成功** - 所有迁移显示 ✅
- [ ] **8 个表存在** - 包括新的 rate_limits, refresh_tokens, schema_migrations
- [ ] **迁移版本为 5** - settings 表中 migration_version = '5'
- [ ] **5 条迁移记录** - schema_migrations 表有 5 条记录

---

## 🎉 成功！下一步做什么？

### 立即可做
```powershell
# 测试健康检查（如果已部署）
curl https://byteforge.dev/api/health

# 或测试本地
pnpm dev
```

### 本周任务
1. **实现 rate-limit 中间件** - 使用新的 rate_limits 表
2. **实现 refresh token API** - 使用新的 refresh_tokens 表
3. **编写数据清理脚本** - 定期清理过期数据

### 下周任务
1. **部署到生产环境**
2. **配置监控和告警**
3. **编写 API 文档**

---

## ⚠️ 如果遇到问题

### 问题：认证失败
```powershell
# 重新登录
pnpm exec wrangler logout
pnpm exec wrangler login
```

### 问题：数据库 ID 错误
```
✘ [ERROR] Database "byteforge" not found
```

**解决：**
1. 检查 `wrangler.toml` 中的 `database_id`
2. 运行 `pnpm exec wrangler d1 list` 确认正确的 ID
3. 更新 `wrangler.toml`

### 问题：迁移部分失败
```
❌ Failed to apply migration X
```

**解决：**
1. 查看错误信息
2. 检查该迁移文件：`migrations/00X_xxx.sql`
3. 迁移是幂等的，可以安全重试：`pnpm run db:migrate:production`

### 问题：表已存在
这是正常的！迁移脚本使用 `IF NOT EXISTS`，可以安全重复运行。

---

## 📊 时间估算

| 步骤 | 预估时间 |
|-----|---------|
| 认证登录 | 2 分钟 |
| 创建数据库 | 3 分钟 |
| 检查状态 | 1 分钟 |
| 应用 schema | 1 分钟 |
| 执行迁移 | 2 分钟 |
| 验证结果 | 2 分钟 |
| **总计** | **10-15 分钟** |

---

## 📝 复制粘贴版本（快速执行）

如果你已经配置好 Cloudflare 认证和 database_id，可以直接执行：

```powershell
# 一键迁移
pnpm run db:migrate:production

# 验证
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

---

## 🔄 回滚计划（如果需要）

虽然这些迁移是安全的，但如果需要回滚：

```powershell
# 1. 删除新增的表（反向操作）
pnpm exec wrangler d1 execute byteforge --remote --command="
DROP TABLE IF EXISTS schema_migrations;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS rate_limits;
"

# 2. 删除新增的索引
pnpm exec wrangler d1 execute byteforge --remote --command="
DROP INDEX IF EXISTS idx_content_events_doc_type_time;
DROP INDEX IF EXISTS idx_feedback_doc_time;
DROP INDEX IF EXISTS idx_content_events_route_time;
"

# 3. 重置迁移版本
pnpm exec wrangler d1 execute byteforge --remote --command="
UPDATE settings SET value = '1', updated_at = datetime('now') 
WHERE key = 'migration_version';
"
```

---

**准备好了吗？开始执行！** 🚀

```powershell
# 第一步：登录
pnpm exec wrangler login
```

执行过程中遇到任何问题，随时告诉我！
