# ByteForge 数据库查看指南

## 📊 数据库信息

- **数据库类型**: Cloudflare D1 (SQLite)
- **数据库名称**: `byteforge`
- **数据库 ID**: `b13f12cf-e2de-4d48-b918-f6c1446a5b6a`

## 🔍 查看数据库数据的方法

### 方法 1：使用 Wrangler CLI（推荐）

#### 1.1 查看所有用户
```bash
wrangler d1 execute byteforge --command "SELECT * FROM users"
```

#### 1.2 查看特定用户
```bash
wrangler d1 execute byteforge --command "SELECT id, username, email, role, status FROM users WHERE username='admin'"
```

#### 1.3 查看反馈数据
```bash
wrangler d1 execute byteforge --command "SELECT * FROM feedback ORDER BY created_at DESC LIMIT 10"
```

#### 1.4 查看所有表
```bash
wrangler d1 execute byteforge --command "SELECT name FROM sqlite_master WHERE type='table'"
```

#### 1.5 查看表结构
```bash
wrangler d1 execute byteforge --command "PRAGMA table_info(users)"
```

### 方法 2：使用本地开发数据库

本地开发时数据存储在：
```
.wrangler/state/v3/d1/miniflare-D1DatabaseObject/
```

#### 2.1 启动本地开发服务器
```bash
pnpm run dev:local
```

#### 2.2 查询本地数据库
```bash
wrangler d1 execute byteforge --local --command "SELECT * FROM users"
```

### 方法 3：使用 SQL 文件批量查询

#### 3.1 创建查询文件
创建 `scripts/db/query-users.sql`:
```sql
SELECT 
  id,
  username,
  email,
  role,
  status,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC;
```

#### 3.2 执行查询文件
```bash
wrangler d1 execute byteforge --file=./scripts/db/query-users.sql
```

### 方法 4：创建数据库查看脚本

我可以为你创建一个方便的 Node.js 脚本来查看数据库数据。

## 📋 常用查询命令

### 查看用户表
```bash
# 查看所有用户
wrangler d1 execute byteforge --command "SELECT id, username, email, role, status FROM users"

# 查看管理员用户
wrangler d1 execute byteforge --command "SELECT id, username, email, role FROM users WHERE role='admin'"

# 统计用户数量
wrangler d1 execute byteforge --command "SELECT COUNT(*) as total_users FROM users"

# 统计管理员数量
wrangler d1 execute byteforge --command "SELECT COUNT(*) as admin_count FROM users WHERE role='admin'"
```

### 查看反馈表
```bash
# 查看最新 10 条反馈
wrangler d1 execute byteforge --command "SELECT * FROM feedback ORDER BY created_at DESC LIMIT 10"

# 统计反馈数量
wrangler d1 execute byteforge --command "SELECT COUNT(*) as total_feedback FROM feedback"

# 按页面分组统计
wrangler d1 execute byteforge --command "SELECT page_url, COUNT(*) as count FROM feedback GROUP BY page_url"
```

### 查看设置表
```bash
# 查看所有系统设置
wrangler d1 execute byteforge --command "SELECT * FROM settings"

# 查看注册状态
wrangler d1 execute byteforge --command "SELECT value FROM settings WHERE key='registration_enabled'"
```

## 🎨 格式化输出

### JSON 格式
```bash
wrangler d1 execute byteforge --json --command "SELECT * FROM users"
```

### 表格格式（默认）
```bash
wrangler d1 execute byteforge --command "SELECT * FROM users"
```

## 🛠️ 数据库管理操作

### 插入测试管理员
```bash
wrangler d1 execute byteforge --command "
INSERT INTO users (username, email, password, role, status) 
VALUES ('admin', 'admin@byteforge.dev', 'hashed_password_here', 'admin', 'active')
"
```

### 修改用户角色为管理员
```bash
wrangler d1 execute byteforge --command "
UPDATE users SET role='admin' WHERE username='your_username'
"
```

### 查看用户的哈希密码（调试用）
```bash
wrangler d1 execute byteforge --command "
SELECT username, password FROM users WHERE username='admin'
"
```

## 📁 本地数据库文件位置

开发环境数据库文件：
```
.wrangler/state/v3/d1/miniflare-D1DatabaseObject/[hash].sqlite
```

你可以使用 SQLite 客户端工具打开这个文件：
- [DB Browser for SQLite](https://sqlitebrowser.org/) (免费)
- [TablePlus](https://tableplus.com/) (付费，有免费版)
- [DBeaver](https://dbeaver.io/) (免费)

## 🚀 快速开始

运行这些命令快速查看数据：

```bash
# 1. 查看所有表
wrangler d1 execute byteforge --command "SELECT name FROM sqlite_master WHERE type='table'"

# 2. 查看用户数据
wrangler d1 execute byteforge --command "SELECT id, username, email, role, status FROM users"

# 3. 查看反馈数据
wrangler d1 execute byteforge --command "SELECT id, type, message, created_at FROM feedback LIMIT 10"
```

## 💡 提示

- 使用 `--local` 标志查询本地开发数据库
- 使用 `--json` 标志获取 JSON 格式输出
- 生产环境查询会消耗 D1 配额
- 本地查询不消耗配额

## ⚠️ 注意事项

1. **密码安全**：数据库中存储的是哈希后的密码，不是明文
2. **生产环境**：在生产环境执行查询时要小心，避免意外修改数据
3. **备份**：修改数据前建议先备份

---

想要我创建一个方便的数据库查看脚本吗？
