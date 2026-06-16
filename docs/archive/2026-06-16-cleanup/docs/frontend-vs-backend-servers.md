# 前端服务器 vs API 服务器 - 完整说明

## 🎯 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    用户浏览器                                 │
│                   (http://localhost:5173)                   │
└─────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────────┐          ┌────────────────────┐
│   Vite 服务器      │          │  Wrangler 服务器    │
│ localhost:5173    │          │  localhost:8788    │
│                   │          │                    │
│ • HTML 页面       │          │ • API 路由         │
│ • CSS 样式        │          │ • 数据库操作        │
│ • JavaScript      │          │ • 认证逻辑         │
│ • 图片资源        │          │ • 业务逻辑         │
│ • 热更新 (HMR)    │          │                    │
└───────────────────┘          └────────────────────┘
    前端资源                        后端 API
```

## 1️⃣ Vite 前端服务器 (localhost:5173)

### 作用
**提供静态资源和前端页面**

### 负责
- ✅ 提供 HTML 页面（`index.html`, `login.html`, `nav.html` 等）
- ✅ 提供 CSS 样式文件（`auth-v2.css`, `nav.css` 等）
- ✅ 提供 JavaScript 文件（`auth-v2.js`, `nav.js` 等）
- ✅ 提供图片、字体等静态资源
- ✅ **热模块替换 (HMR)** - 修改代码立即看到效果，无需刷新
- ✅ **开发体验优化** - 快速构建、源码映射

### 技术栈
- **Vite** - 现代前端构建工具
- **原生 JavaScript** - 无框架，纯 JS
- **HTML/CSS** - 页面结构和样式

### 示例文件
```
public/
├── login.html          ← Vite 提供
├── nav.html            ← Vite 提供
├── auth-v2.css         ← Vite 提供
├── auth-v2.js          ← Vite 提供
└── nav.js              ← Vite 提供
```

### 运行命令
```bash
pnpm run dev
```

---

## 2️⃣ Wrangler API 服务器 (localhost:8788)

### 作用
**提供后端 API 和数据库访问**

### 负责
- ✅ 处理 API 请求（`/api/*` 路由）
- ✅ 用户注册 (`/api/auth/register`)
- ✅ 用户登录 (`/api/auth/login`)
- ✅ 数据库操作（D1 SQLite）
- ✅ JWT 令牌生成和验证
- ✅ 权限检查
- ✅ 反馈数据存储

### 技术栈
- **Cloudflare Workers** - 边缘计算平台
- **Cloudflare D1** - SQLite 数据库
- **Functions** - 服务器端逻辑

### 示例 API 端点
```
http://localhost:8788/api/health
http://localhost:8788/api/auth/login
http://localhost:8788/api/auth/register
http://localhost:8788/api/auth/me
http://localhost:8788/api/admin/users
http://localhost:8788/api/feedback
```

### 示例文件
```
functions/
├── api/
│   ├── auth/
│   │   ├── login.js       ← Wrangler 执行
│   │   ├── register.js    ← Wrangler 执行
│   │   └── me.js          ← Wrangler 执行
│   ├── admin/
│   │   └── users.js       ← Wrangler 执行
│   └── feedback.js        ← Wrangler 执行
└── lib/
    └── auth.js            ← 认证工具
```

### 运行命令
```bash
pnpm run build           # 先构建前端
pnpm run dev:api         # 启动 API 服务器
```

---

## 🔄 它们如何协同工作？

### 场景：用户注册流程

```
1. 用户访问浏览器
   → http://localhost:5173/login.html

2. Vite 服务器返回 HTML 页面
   ← 包含注册表单

3. 用户填写表单并提交
   → JavaScript 发送 POST 请求到:
      http://localhost:8788/api/auth/register

4. Wrangler 服务器处理请求
   → 验证输入
   → 哈希密码
   → 存入 D1 数据库
   → 生成 JWT token
   ← 返回 JSON 响应

5. 前端接收响应
   → 存储 token 到 localStorage
   → 显示成功消息
   → 跳转到主页
```

### 代码示例

**前端 (auth-v2.js) - 运行在 Vite**
```javascript
// 在浏览器中执行
const API_BASE = 'http://localhost:8788';

async function handleRegister(e) {
  e.preventDefault();
  
  // 发送请求到 API 服务器
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  
  const data = await res.json();
  // 处理响应...
}
```

**后端 (functions/api/auth/register.js) - 运行在 Wrangler**
```javascript
// 在服务器端执行
export async function onRequestPost({ request, env }) {
  const body = await request.json();
  
  // 访问数据库
  const result = await env.DB.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).bind(body.username, body.email, hashedPassword, 'user').run();
  
  // 返回响应
  return new Response(JSON.stringify({ ok: true, token }));
}
```

---

## 📊 对比表格

| 特性 | Vite (5173) | Wrangler (8788) |
|------|-------------|-----------------|
| **类型** | 前端服务器 | 后端 API 服务器 |
| **作用** | 提供静态资源 | 处理业务逻辑 |
| **语言** | HTML/CSS/JS | JavaScript |
| **运行位置** | 浏览器执行 | 服务器端执行 |
| **数据库** | ❌ 无 | ✅ D1 SQLite |
| **热更新** | ✅ 有 (HMR) | ❌ 无 |
| **构建** | 不需要 | 需要先 build |
| **生产环境** | 静态托管 | Cloudflare Pages |

---

## 🤔 为什么需要两个服务？

### 原因 1：开发体验
- **Vite**: 超快的热更新，修改 CSS/JS 立即生效
- **Wrangler**: 模拟 Cloudflare 生产环境

### 原因 2：职责分离
- **前端**: 负责 UI 和用户交互
- **后端**: 负责数据处理和安全逻辑

### 原因 3：安全性
- **前端**: 代码在浏览器执行，用户可见
- **后端**: 代码在服务器执行，安全密钥不暴露

### 原因 4：模拟生产环境
生产环境中：
- 前端 → Cloudflare Pages 静态托管
- 后端 → Cloudflare Pages Functions

---

## 🎯 实际场景示例

### ✅ 注册功能需要两个服务

1. **Vite** 提供注册页面 (`/login.html`)
2. **Wrangler** 处理注册请求 (`/api/auth/register`)
3. **Wrangler** 将用户存入数据库

**如果只有 Vite：**
- ❌ 看得到注册表单
- ❌ 点击提交后请求失败（没有 API）
- ❌ 无法存储到数据库

**如果只有 Wrangler：**
- ❌ 可以通过 curl 注册成功
- ❌ 没有漂亮的 UI 页面
- ❌ 没有热更新，开发体验差

---

## 🚀 启动策略

### 开发阶段（推荐）
**同时运行两个服务**
```bash
# 终端 1
pnpm run dev

# 终端 2  
pnpm run build && pnpm run dev:api
```

或使用脚本：
```bash
start-dev-full.bat
```

访问：`http://localhost:5173`

### 简单测试
**只运行 Wrangler**
```bash
pnpm run build
pnpm run dev:local
```

访问：`http://localhost:8788`
- ✅ 可以访问页面
- ❌ 没有热更新
- ❌ 需要手动刷新

---

## 💡 总结

```
Vite (前端)          →  负责"长什么样"
Wrangler (后端)      →  负责"干什么活"

两者配合             →  完整的 Web 应用
```

**简单记忆：**
- 👀 **看得见的** → Vite 提供
- 🧠 **看不见的** → Wrangler 处理

现在明白为什么注册需要两个服务了吗？前端显示表单，后端处理数据！🎉
