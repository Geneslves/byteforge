# 数据库查询不到新用户的问题

## ❌ 问题现象

1. 通过浏览器或 API 注册了新用户
2. 注册成功返回 token
3. 但运行 `pnpm run db:users` 查询不到新用户
4. 只能看到旧的测试用户

## 🔍 问题原因

**多个数据库实例问题**

Wrangler 在不同时间创建了多个数据库文件：
```
.wrangler/state/v3/d1/miniflare-D1DatabaseObject/
├── 530f...sqlite  (旧实例)
├── e72d...sqlite  (当前使用)
└── metadata.sqlite
```

- **Wrangler 运行时**使用其中一个数据库
- **查询脚本**可能读取另一个数据库
- 导致看到的是不同的数据

## ✅ 解决方案

### 方案 1：重启开发环境（推荐）

1. **完全停止所有服务**
   - 关闭所有 Wrangler 进程
   - 关闭所有终端窗口
   - 等待 5 秒

2. **删除数据库状态**
   ```powershell
   Remove-Item -Recurse -Force .wrangler\state
   ```

3. **重新初始化数据库**
   ```bash
   pnpm exec wrangler d1 execute byteforge --local --file=./schema/d1.sql
   ```

4. **重新启动服务**
   ```bash
   pnpm run build
   pnpm run dev:local
   ```

5. **重新注册用户**
   访问 `http://localhost:8788/login.html` 注册

### 方案 2：手动查询 Wrangler 使用的数据库

找出 Wrangler 正在使用的数据库文件：

```powershell
# 查看最新修改的数据库
Get-ChildItem -Path ".wrangler\state\v3\d1\miniflare-D1DatabaseObject" -Filter "*.sqlite" | 
  Where-Object { $_.Name -notmatch 'metadata' } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
```

然后直接查询：
```powershell
sqlite3 "路径到数据库文件.sqlite" "SELECT * FROM users"
```

### 方案 3：通过 API 验证用户存在

创建一个简单的测试脚本：

```bash
# 登录测试
curl -X POST http://localhost:8788/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"newadmin","password":"NewAdmin123456"}'
```

如果登录成功，说明用户确实存在，只是查询工具指向了错误的数据库。

## 🎯 根本解决方案

### 修改查询脚本使用运行时数据库

创建新的查询命令：

**在 package.json 添加：**
```json
"db:query": "pnpm exec wrangler d1 execute byteforge --local --command"
```

**使用方式：**
```bash
pnpm run db:query "SELECT * FROM users"
pnpm run db:query "SELECT * FROM users WHERE role='admin'"
```

## 📋 验证步骤

### 1. 验证用户是否真的创建成功

```powershell
# 尝试登录
$body = @{
    username = "newadmin"
    password = "NewAdmin123456"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8788/api/auth/login" -Method Post -Body $body -ContentType "application/json"
```

**如果返回 token** → 用户存在，是查询问题
**如果返回错误** → 用户不存在，是注册问题

### 2. 检查数据库文件

```powershell
# 查看所有数据库文件及修改时间
Get-ChildItem -Path ".wrangler\state\v3\d1\miniflare-D1DatabaseObject" -Filter "*.sqlite*" |
  Sort-Object LastWriteTime -Descending |
  Select-Object Name, Length, LastWriteTime |
  Format-Table -AutoSize
```

最新的文件应该是 Wrangler 正在使用的。

## 🔧 预防措施

### 1. 使用统一的数据库查询方式

**推荐方式：**
```bash
# 通过 wrangler 查询（总是使用正确的数据库）
pnpm exec wrangler d1 execute byteforge --local --command "SELECT * FROM users"
```

**不推荐：**
```bash
# 自定义脚本可能指向错误的数据库
node scripts/db/view-db.js --users
```

### 2. 定期清理数据库状态

在开发过程中，定期清理旧的数据库文件：

```bash
# 停止所有服务
# 然后删除
Remove-Item -Recurse -Force .wrangler\state

# 重新初始化
pnpm exec wrangler d1 execute byteforge --local --file=./schema/d1.sql
```

### 3. 使用远程数据库进行重要测试

对于重要的测试，使用 Cloudflare 的远程数据库：

```bash
# 迁移到远程数据库
pnpm exec wrangler d1 execute byteforge --remote --file=./schema/d1.sql

# 查询远程数据库
pnpm exec wrangler d1 execute byteforge --remote --command "SELECT * FROM users"
```

## 💡 快速诊断命令

```bash
# 1. 查看 Wrangler 日志
# 在运行 Wrangler 的终端查看是否有数据库写入日志

# 2. 测试 API 是否正常
curl http://localhost:8788/api/health

# 3. 尝试登录验证用户存在
curl -X POST http://localhost:8788/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"你的用户名","password":"你的密码"}'

# 4. 直接查询 Wrangler 的数据库
pnpm exec wrangler d1 execute byteforge --local --command "SELECT COUNT(*) as count FROM users"
```

## 🎯 当前建议

**基于你的情况，建议：**

1. **先验证用户是否真的创建了**
   ```bash
   # 尝试登录你注册的账号
   # 如果成功 → 用户存在，是查询问题
   # 如果失败 → 重新注册
   ```

2. **重启整个开发环境**
   - 关闭所有终端
   - 删除 `.wrangler/state`
   - 重新初始化数据库
   - 重新启动服务
   - 重新注册

3. **使用正确的查询命令**
   ```bash
   pnpm exec wrangler d1 execute byteforge --local --command "SELECT * FROM users"
   ```

---

**现在试试用新注册的账号登录，看能否成功！如果能登录，说明用户确实存在。**
