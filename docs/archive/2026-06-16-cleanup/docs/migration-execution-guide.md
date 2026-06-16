# 数据库迁移执行指南

## 🎯 当前状态

根据你的项目配置：
- **数据库名称：** `byteforge`
- **数据库 ID：** 需要在 `wrangler.toml` 中配置
- **迁移文件：** 5 个迁移已准备就绪

---

## 📋 执行前检查清单

### 1. Cloudflare 认证配置

你需要配置 Cloudflare API Token 才能执行远程操作。有两种方式：

#### 方式 A：交互式登录（推荐）
```powershell
# 打开浏览器登录 Cloudflare
pnpm exec wrangler login
```

#### 方式 B：使用 API Token
```powershell
# 1. 创建 API Token：
# https://dash.cloudflare.com/profile/api-tokens
# 需要权限：Account > D1 > Edit

# 2. 设置环境变量
$env:CLOUDFLARE_API_TOKEN = "your-api-token-here"

# 或者添加到 .dev.vars 文件（不要提交到 git）
```

### 2. 数据库配置检查

检查 `wrangler.toml` 中的数据库配置：

```toml
[[d1_databases]]
binding = "DB"
database_name = "byteforge"
database_id = "YOUR_D1_DATABASE_ID_HERE"  # ← 需要替换
```

**如果还没有创建数据库：**

```powershell
# 创建生产数据库
pnpm exec wrangler d1 create byteforge

# 创建开发数据库（可选）
pnpm exec wrangler d1 create byteforge-dev

# 创建 staging 数据库（可选）
pnpm exec wrangler d1 create byteforge-staging
```

创建后，将返回的 `database_id` 填入 `wrangler.toml`。

---

## 🚀 执行迁移步骤

### 步骤 1：登录 Cloudflare

```powershell
# 交互式登录
pnpm exec wrangler login

# 验证登录状态
pnpm exec wrangler whoami
```

### 步骤 2：创建数据库（如果还没有）

```powershell
# 列出现有数据库
pnpm exec wrangler d1 list

# 如果没有，创建一个
pnpm exec wrangler d1 create byteforge

# 输出示例：
# ✅ Successfully created DB 'byteforge'
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "byteforge"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 复制 database_id 到 wrangler.toml
```

### 步骤 3：应用基础 Schema（首次）

如果是全新数据库，先应用基础 schema：

```powershell
# 应用初始 schema
pnpm exec wrangler d1 execute byteforge --remote --file=./schema/d1.sql

# 验证表已创建
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

### 步骤 4：运行迁移脚本

```powershell
# 干运行（测试，不实际执行）
node scripts/db/migrate.js byteforge --remote --dry-run

# 实际执行迁移
pnpm run db:migrate:production

# 或者直接运行
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

Found 5 pending migration(s) to apply:
  • 001_initial_schema.sql
  • 002_add_rate_limits.sql
  • 003_optimize_indexes.sql
  • 004_add_refresh_tokens.sql
  • 005_add_schema_migrations.sql

─────────────────────────────────────────────────────────────
📦 Applying migration 1: 001_initial_schema.sql
   Preview: PRAGMA foreign_keys = ON;...
✅ Migration 1 applied successfully
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
✅ Successful: 5

Current database version: 5

🎉 All migrations applied successfully!
```

### 步骤 5：验证迁移结果

```powershell
# 1. 检查所有表
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

# 2. 检查迁移版本
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT value FROM settings WHERE key='migration_version'"

# 3. 检查迁移历史
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT * FROM schema_migrations ORDER BY version"

# 4. 检查 rate_limits 表结构
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT sql FROM sqlite_master WHERE name='rate_limits'"

# 5. 检查 refresh_tokens 表结构
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT sql FROM sqlite_master WHERE name='refresh_tokens'"

# 6. 检查所有索引
pnpm exec wrangler d1 execute byteforge --remote --command="SELECT name FROM sqlite_master WHERE type='index' ORDER BY name"
```

---

## 📊 验证清单

执行完成后，确认以下内容：

### 表（应有 8 个）
- [x] users
- [x] settings
- [x] sessions
- [x] feedback
- [x] content_events
- [x] rate_limits ← 新增
- [x] refresh_tokens ← 新增
- [x] schema_migrations ← 新增

### 索引（应新增 7 个）
- [x] idx_rate_limits_expires_at ← 新增
- [x] idx_content_events_doc_type_time ← 新增
- [x] idx_feedback_doc_time ← 新增
- [x] idx_content_events_route_time ← 新增
- [x] idx_refresh_tokens_user_id ← 新增
- [x] idx_refresh_tokens_token_hash ← 新增
- [x] idx_refresh_tokens_expires_at ← 新增
- [x] idx_refresh_tokens_revoked ← 新增

### 迁移记录
```sql
SELECT * FROM schema_migrations ORDER BY version;
-- 应返回 5 条记录（version 1-5）
```

### 迁移版本
```sql
SELECT value FROM settings WHERE key='migration_version';
-- 应返回 "005"
```

---

## 🔄 本地开发环境迁移（可选）

如果你想在本地测试：

```powershell
# 1. 创建本地数据库（首次）
pnpm exec wrangler d1 create byteforge-dev

# 2. 应用基础 schema
pnpm exec wrangler d1 execute byteforge-dev --local --file=./schema/d1.sql

# 3. 运行迁移
pnpm run db:migrate:dev

# 或者
node scripts/db/migrate.js byteforge-dev
```

---

## ⚠️ 故障排查

### 问题 1：认证失败
```
✘ [ERROR] In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN
```

**解决方案：**
```powershell
# 方式 1：交互式登录
pnpm exec wrangler login

# 方式 2：设置 API Token
$env:CLOUDFLARE_API_TOKEN = "your-token"
```

### 问题 2：数据库不存在
```
✘ [ERROR] Database "byteforge" not found
```

**解决方案：**
```powershell
# 创建数据库
pnpm exec wrangler d1 create byteforge

# 更新 wrangler.toml 中的 database_id
```

### 问题 3：迁移脚本报错
```
Migration failed: ...
```

**解决方案：**
```powershell
# 1. 检查错误信息
# 2. 查看迁移文件内容
# 3. 手动执行失败的 SQL
pnpm exec wrangler d1 execute byteforge --remote --file=./migrations/00X_xxx.sql

# 4. 如果需要回滚，恢复备份
pnpm exec wrangler d1 execute byteforge --remote --file=backup.sql
```

### 问题 4：表已存在
```
Error: table "rate_limits" already exists
```

**原因：** 迁移已部分应用  
**解决方案：** 迁移脚本使用 `IF NOT EXISTS`，可以安全重新运行

---

## 🔒 备份建议

### 迁移前备份（推荐）

```powershell
# 备份生产数据库
pnpm exec wrangler d1 export byteforge --remote --output=backup-before-migration-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql

# 验证备份文件
Get-Item backup-*.sql
```

### 恢复备份（如果需要）

```powershell
# 恢复数据库
pnpm exec wrangler d1 execute byteforge --remote --file=backup-20260615-120000.sql
```

---

## 📝 执行记录模板

建议记录每次迁移的执行情况：

```markdown
## 迁移执行记录

**日期：** 2026-06-15
**执行人：** [你的名字]
**数据库：** byteforge (生产环境)
**迁移版本：** 0 → 5

### 执行步骤
- [x] 备份数据库
- [x] 干运行测试
- [x] 执行迁移
- [x] 验证结果
- [x] 测试 API

### 结果
- ✅ 5 个迁移全部成功
- ✅ 8 个表存在
- ✅ 15 个索引正常
- ✅ API 健康检查通过

### 问题
- 无

### 备份文件
- backup-before-migration-20260615-120000.sql
```

---

## 🎯 下一步

迁移完成后：

1. **验证 API**
   ```powershell
   # 测试健康检查
   curl https://byteforge.dev/api/health
   
   # 测试认证 API
   curl https://byteforge.dev/api/auth/me
   ```

2. **实现新功能**
   - [ ] Rate-limit 中间件
   - [ ] Refresh token API
   - [ ] 数据清理脚本

3. **配置监控**
   - [ ] Cloudflare Analytics
   - [ ] 日志查询
   - [ ] 告警规则

---

## 📞 需要帮助？

如果遇到任何问题：

1. 查看错误日志：`C:\Users\Kong\AppData\Roaming\xdg.config\.wrangler\logs\`
2. 检查迁移文件：`migrations/README.md`
3. 参考文档：`docs/migration-quickstart.md`

---

**准备好了吗？执行以下命令开始迁移：**

```powershell
# 1. 登录 Cloudflare
pnpm exec wrangler login

# 2. 查看数据库
pnpm exec wrangler d1 list

# 3. 执行迁移
pnpm run db:migrate:production
```

祝你迁移顺利！🚀
