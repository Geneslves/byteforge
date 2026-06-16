# 数据库快速查看指南

## ✅ 已完成设置

你的数据库查看工具已经配置完成！

## 🚀 快速使用

### 常用命令

```bash
# 查看所有用户
pnpm run db:users

# 查看管理员用户
pnpm run db:admins

# 查看反馈数据
pnpm run db:feedback

# 查看完整统计
pnpm run db:stats

# 查看所有表
node scripts/db/view-db.js --tables

# 查看系统设置
node scripts/db/view-db.js --settings
```

## 📊 当前数据库状态

根据刚才的查询结果：

- ✅ **总用户数**: 1 个
- ✅ **管理员数**: 0 个（需要提升一个用户为管理员）
- ✅ **反馈数**: 0 个
- ✅ **过去 7 天新用户**: 1 个

## 📝 现有用户

```json
{
  "id": "test-id-123",
  "username": "testuser99",
  "email": "test99@test.com",
  "role": "user",
  "is_active": 1,
  "created_at": "2026-06-16T00:00:00Z",
  "last_login": null
}
```

## 🔧 如何创建管理员

### 方法 1：提升现有用户为管理员

```bash
wrangler d1 execute byteforge --command "UPDATE users SET role='admin' WHERE username='testuser99'"
```

### 方法 2：直接使用 SQL 命令

```bash
wrangler d1 execute byteforge --local --command "UPDATE users SET role='admin' WHERE email='test99@test.com'"
```

### 方法 3：通过登录页注册新的管理员

1. 访问 `http://127.0.0.1:5173/login.html`
2. 注册一个新账号
3. 使用上面的命令提升为管理员

## 🔍 更多查询示例

### 查看特定用户
```bash
wrangler d1 execute byteforge --command "SELECT * FROM users WHERE username='testuser99'"
```

### 查看用户密码哈希（验证注册）
```bash
wrangler d1 execute byteforge --command "SELECT username, password_hash FROM users"
```

### 查看所有会话
```bash
wrangler d1 execute byteforge --command "SELECT * FROM sessions"
```

### 查看系统设置
```bash
wrangler d1 execute byteforge --command "SELECT * FROM settings"
```

## 📍 数据库位置

**本地开发数据库：**
```
.wrangler/state/v3/d1/miniflare-D1DatabaseObject/
```

**生产数据库：**
- Cloudflare Dashboard
- 或使用 `wrangler d1 execute byteforge --remote --command "..."`

## 💡 提示

### 本地 vs 远程

- **默认**：查询本地数据库（开发环境）
- **远程**：使用 `--remote` 标志查询生产数据库

```bash
# 本地（默认）
pnpm run db:users

# 远程生产环境
wrangler d1 execute byteforge --remote --command "SELECT * FROM users"
```

### JSON 格式输出

```bash
wrangler d1 execute byteforge --json --command "SELECT * FROM users"
```

## 🎯 下一步

1. **创建管理员账号**：
   ```bash
   wrangler d1 execute byteforge --command "UPDATE users SET role='admin' WHERE username='testuser99'"
   ```

2. **验证管理员权限**：
   ```bash
   pnpm run db:admins
   ```

3. **登录测试**：
   - 访问 `/login.html`
   - 使用管理员账号登录
   - 访问 `/nav.html` 查看权限变化
   - 进入 `/admin-v2.html` 管理后台

## 🛠️ 工具脚本位置

- 查看脚本：`scripts/db/view-db.js`
- 数据库 Schema：`schema/d1.sql`
- 配置文件：`wrangler.toml`

---

**需要帮助？** 查看完整文档：`docs/database-viewing-guide.md`
