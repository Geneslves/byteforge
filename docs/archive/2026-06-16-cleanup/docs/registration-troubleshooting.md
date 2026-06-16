# 注册失败问题解决方案

## ❌ 问题原因

你只启动了 **Vite 前端服务器** (`pnpm run dev`)，但没有启动 **API 后端服务器**。

前端页面运行在 `http://localhost:5173`，尝试连接 API `http://localhost:8788`，但 API 服务器没有运行，所以注册请求失败。

## ✅ 解决方案

### 方法 1：使用启动脚本（推荐）

双击运行：
```
start-dev-full.bat
```

这会同时启动：
- ✅ Vite 前端服务器 (http://localhost:5173)
- ✅ Wrangler API 服务器 (http://localhost:8788)

### 方法 2：手动启动两个服务

**终端 1 - 启动 Vite (前端)**
```bash
pnpm run dev
```

**终端 2 - 启动 Wrangler (API + 数据库)**
```bash
pnpm run build
pnpm run dev:api
```

### 方法 3：只使用 Wrangler（单一服务）

先构建前端，然后只运行 Wrangler：
```bash
pnpm run build
pnpm run dev:local
```

访问 `http://localhost:8788`（Wrangler 会同时提供前端和 API）

## 🎯 完整开发环境架构

```
┌─────────────────────────────────────────┐
│  开发环境架构                             │
├─────────────────────────────────────────┤
│                                         │
│  前端 (Vite)                            │
│  ├─ http://localhost:5173              │
│  └─ 静态文件 + HMR 热更新               │
│                                         │
│  后端 (Wrangler)                        │
│  ├─ http://localhost:8788              │
│  ├─ API 路由 (/api/*)                  │
│  ├─ D1 数据库                           │
│  └─ Cloudflare Functions               │
│                                         │
└─────────────────────────────────────────┘
```

## 📋 验证服务是否正常

### 1. 检查前端服务
访问：`http://localhost:5173`
- 应该看到 ByteForge 主页

### 2. 检查 API 服务
访问：`http://localhost:8788/api/health`
- 应该返回 JSON：`{"ok": true, "status": "healthy"}`

### 3. 测试注册
访问：`http://localhost:5173/login.html`
- 切换到注册标签
- 填写信息并提交
- 应该成功注册并跳转

## 🔧 常见问题

### Q: 端口被占用
如果 8788 端口被占用，修改 `package.json`:
```json
"dev:api": "wrangler pages dev dist --d1 DB=byteforge --persist-to .wrangler/state --port 8789"
```

然后修改 `public/auth-v2.js` 中的 API_BASE：
```javascript
const API_BASE = location.hostname === 'localhost' ? 'http://localhost:8789' : '';
```

### Q: 构建失败
确保先构建前端：
```bash
pnpm run build
```

### Q: 数据库连接失败
删除旧的数据库状态：
```bash
rm -rf .wrangler/state
pnpm run dev:api
```

## 🎉 测试流程

1. **启动服务**
   ```bash
   start-dev-full.bat
   ```

2. **访问登录页**
   ```
   http://localhost:5173/login.html
   ```

3. **注册新用户**
   - 用户名：admin
   - 邮箱：admin@byteforge.dev
   - 密码：至少 12 个字符

4. **提升为管理员**
   ```bash
   wrangler d1 execute byteforge --command "UPDATE users SET role='admin' WHERE username='admin'"
   ```

5. **登录并测试权限**
   - 访问 `/nav.html`
   - Admin 卡片应该可点击
   - 进入 `/admin-v2.html` 管理后台

---

**现在双击运行 `start-dev-full.bat`，然后重新尝试注册！**
