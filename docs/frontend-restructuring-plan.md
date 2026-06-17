# Frontend Restructuring & API Migration Plan

## 目标

1. **统一 CSS 架构** - 所有样式文件移到规范的目录结构
2. **消除重复代码** - 删除旧版本文件（v1）
3. **标准化设计系统** - 统一 CSS 变量和组件样式
4. **模块化 JavaScript** - 共享代码提取到可重用模块
5. **迁移第一个 API 端点** - 使用新的抽象层

## 新的目录结构

```
byteforge/
├── public/                          # 静态资源和独立页面
│   ├── assets/                      # 静态资源
│   │   ├── images/
│   │   ├── icons/
│   │   └── audio/
│   ├── pages/                       # 独立 HTML 页面
│   │   ├── admin.html
│   │   ├── login.html
│   │   └── nav.html
│   ├── favicon.svg
│   ├── manifest.json
│   ├── robots.txt
│   └── sitemap.xml
│
├── src/
│   ├── styles/                      # 所有 CSS（统一管理）
│   │   ├── base/                    # 基础样式
│   │   │   ├── reset.css           # CSS Reset
│   │   │   ├── variables.css       # 统一的 CSS 变量
│   │   │   ├── typography.css      # 字体和排版
│   │   │   └── themes.css          # 主题切换
│   │   ├── components/              # 可复用组件样式
│   │   │   ├── buttons.css
│   │   │   ├── forms.css
│   │   │   ├── cards.css
│   │   │   └── feedback.css
│   │   ├── layouts/                 # 布局样式
│   │   │   ├── header.css
│   │   │   ├── footer.css
│   │   │   └── grid.css
│   │   ├── pages/                   # 页面特定样式
│   │   │   ├── admin.css
│   │   │   ├── auth.css
│   │   │   ├── nav.css
│   │   │   └── home.css
│   │   ├── effects/                 # 视觉效果
│   │   │   ├── animations.css
│   │   │   ├── particles.css
│   │   │   └── transitions.css
│   │   └── main.css                 # 主入口（导入所有）
│   │
│   ├── lib/                         # 共享 JavaScript 库
│   │   ├── api/                     # API 客户端
│   │   │   ├── client.js           # 统一的 API 客户端
│   │   │   ├── auth.js             # 认证 API
│   │   │   └── admin.js            # 管理 API
│   │   ├── ui/                      # UI 工具
│   │   │   ├── notifications.js
│   │   │   ├── modals.js
│   │   │   └── forms.js
│   │   ├── utils/                   # 工具函数
│   │   │   ├── dom.js
│   │   │   ├── validation.js
│   │   │   └── storage.js
│   │   └── config.js               # 全局配置
│   │
│   ├── pages/                       # 页面逻辑（独立页面）
│   │   ├── admin/
│   │   │   ├── admin.js
│   │   │   └── components/
│   │   ├── auth/
│   │   │   ├── login.js
│   │   │   └── components/
│   │   └── nav/
│   │       └── nav.js
│   │
│   ├── modules/                     # 主应用模块（SPA）
│   │   ├── routing.js
│   │   ├── effects.js
│   │   ├── theme.js
│   │   └── ...
│   │
│   ├── main.js                      # 主应用入口
│   └── auth-check.js                # 认证中间件
│
└── functions/                       # 后端 API（已有）
    ├── api/
    ├── lib/
    │   ├── db/                      # ✅ 新增：数据库抽象层
    │   ├── platform/                # ✅ 新增：平台适配器
    │   └── validation.js            # ✅ 新增：验证工具
    └── _middleware.js
```

## 执行计划

### Phase 1: 准备工作（第 1 天）

#### 1.1 创建新目录结构
```bash
mkdir -p src/styles/{base,components,layouts,pages,effects}
mkdir -p src/lib/{api,ui,utils}
mkdir -p src/pages/{admin,auth,nav}
mkdir -p public/assets/{images,icons}
mkdir -p public/pages
```

#### 1.2 创建基础 CSS 文件

**`src/styles/base/variables.css`** - 统一的设计 tokens
```css
:root {
  /* 颜色系统 - 统一命名 */
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #1a1a1a;
  --color-bg-elevated: rgba(26, 26, 26, 0.8);
  
  --color-text-primary: #e0e7ff;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  
  --color-accent-cyan: #00f3ff;
  --color-accent-purple: #8b5cf6;
  --color-accent-pink: #ff006e;
  --color-accent-green: #10b981;
  --color-accent-orange: #f59e0b;
  
  /* 间距系统 */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  
  /* 字体 */
  --font-sans: 'Rajdhani', sans-serif;
  --font-mono: 'Fira Code', monospace;
  --font-display: 'Orbitron', sans-serif;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
  --shadow-glow-cyan: 0 0 20px rgba(0, 243, 255, 0.5);
  --shadow-glow-purple: 0 0 20px rgba(139, 92, 246, 0.5);
  
  /* 边框半径 */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  
  /* 过渡 */
  --transition-fast: 150ms ease;
  --transition-base: 300ms ease;
  --transition-slow: 500ms ease;
}
```

### Phase 2: 重组 CSS（第 2-3 天）

#### 2.1 整合和清理

1. **删除旧版本文件**
   - ❌ `public/admin.css` (保留 admin-v2.css)
   - ❌ `public/auth.css` (保留 auth-v2.css)
   - ❌ `public/admin.js` (保留 admin-v2.js)
   - ❌ `public/auth.js` (保留 auth-v2.js)

2. **移动并重命名 CSS 文件**
   ```bash
   # 移动页面样式
   mv public/admin-v2.css → src/styles/pages/admin.css
   mv public/auth-v2.css → src/styles/pages/auth.css
   mv public/nav.css → src/styles/pages/nav.css
   
   # 整合主应用样式（已在 src/styles/）
   # style.css, effects.css, themes.css, feedback.css 保持位置
   ```

3. **提取共享组件样式**
   - 从 `admin.css`、`auth.css`、`nav.css` 中提取按钮样式 → `components/buttons.css`
   - 提取表单样式 → `components/forms.css`
   - 提取卡片样式 → `components/cards.css`

#### 2.2 更新 CSS 变量

在所有 CSS 文件中：
- 替换 `--bg` → `--color-bg-primary`
- 替换 `--neon-cyan` → `--color-accent-cyan`
- 使用统一的变量命名

#### 2.3 创建主 CSS 入口

**`src/styles/main.css`**
```css
/* Base */
@import './base/reset.css';
@import './base/variables.css';
@import './base/typography.css';
@import './base/themes.css';

/* Components */
@import './components/buttons.css';
@import './components/forms.css';
@import './components/cards.css';
@import './components/feedback.css';

/* Effects */
@import './effects/animations.css';
@import './effects/particles.css';

/* Layouts (if needed) */
/* @import './layouts/grid.css'; */
```

### Phase 3: 重组 JavaScript（第 4-5 天）

#### 3.1 提取共享 API 客户端

**`src/lib/api/client.js`** - 统一的 API 客户端
```javascript
// 整合 public/api-client.js 的功能
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async request(path, options = {}) {
    const token = localStorage.getItem('auth_token')
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    return response.json()
  }

  get(path) { return this.request(path, { method: 'GET' }) }
  post(path, data) { return this.request(path, { method: 'POST', body: JSON.stringify(data) }) }
  patch(path, data) { return this.request(path, { method: 'PATCH', body: JSON.stringify(data) }) }
  delete(path) { return this.request(path, { method: 'DELETE' }) }
}

export const api = new ApiClient()
```

**`src/lib/api/auth.js`** - 认证 API
```javascript
import { api } from './client.js'

export async function login(username, password) {
  return api.post('/api/auth/login', { username, password })
}

export async function register(username, email, password) {
  return api.post('/api/auth/register', { username, email, password })
}

export async function getCurrentUser() {
  return api.get('/api/auth/me')
}

export function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  window.location.href = '/login.html'
}
```

#### 3.2 移动页面脚本

```bash
# 移动独立页面脚本
mv public/admin-v2.js → src/pages/admin/admin.js
mv public/auth-v2.js → src/pages/auth/login.js
mv public/nav.js → src/pages/nav/nav.js
```

#### 3.3 更新导入路径

在移动后的文件中，更新导入：
```javascript
// 旧：直接引用全局函数
// 新：ES6 模块导入
import { api } from '../../lib/api/client.js'
import { login, logout } from '../../lib/api/auth.js'
```

### Phase 4: 更新 HTML 文件（第 6 天）

#### 4.1 移动 HTML 文件

```bash
mv public/admin-v2.html → public/pages/admin.html
mv public/login.html → public/pages/login.html
mv public/nav.html → public/pages/nav.html

# 删除旧版本
rm public/admin.html public/test-auth-flow.html
```

#### 4.2 更新 HTML 中的引用路径

**`public/pages/admin.html`**
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>管理后台 | ByteForge</title>
  
  <!-- 统一的 CSS 入口 -->
  <link rel="stylesheet" href="/src/styles/main.css">
  <link rel="stylesheet" href="/src/styles/pages/admin.css">
</head>
<body>
  <!-- ... -->
  
  <!-- 模块化的 JS -->
  <script type="module" src="/src/pages/admin/admin.js"></script>
</body>
</html>
```

### Phase 5: 迁移第一个 API 端点（第 7 天）

#### 5.1 迁移 `/api/health.js`

**原始文件：** `functions/api/health.js`
```javascript
import { json, optionsResponse } from '../lib/http.js'

const METHODS = 'GET, OPTIONS'

export async function onRequestGet({ request, env }) {
  return json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.CF_PAGES ? 'production' : 'development'
  }, {}, request, env, METHODS)
}

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS)
}
```

**迁移后：** 使用抽象层
```javascript
import { createHandler } from '../lib/platform/adapter.js'
import { json, optionsResponse } from '../lib/http.js'

const METHODS = 'GET, OPTIONS'

// 简化的 GET 处理器
export const onRequestGet = createHandler({
  methods: METHODS,
  handler: async ({ request, env, platform }) => {
    return json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      platform: platform, // 'cloudflare', 'nodejs', or 'vercel'
      environment: env.CF_PAGES ? 'production' : 'development'
    }, {}, request, env, METHODS)
  }
})

// OPTIONS 处理器
export const onRequestOptions = createHandler({
  methods: METHODS,
  handler: async ({ request, env }) => {
    return optionsResponse(request, env, METHODS)
  }
})
```

**测试：**
```bash
pnpm run dev:api
curl http://localhost:8788/api/health
```

### Phase 6: 更新构建配置（第 8 天）

#### 6.1 更新 Vite 配置

**`vite.config.js`**
```javascript
export default {
  // ...现有配置
  
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'public/pages/admin.html',
        login: 'public/pages/login.html',
        nav: 'public/pages/nav.html'
      }
    }
  }
}
```

#### 6.2 验证构建

```bash
pnpm build
pnpm run dev:api

# 测试所有页面
open http://localhost:8788/
open http://localhost:8788/pages/admin.html
open http://localhost:8788/pages/login.html
open http://localhost:8788/pages/nav.html
```

## 文件清理清单

### 删除（旧版本）
- [ ] `public/admin.html`
- [ ] `public/admin.css`
- [ ] `public/admin.js`
- [ ] `public/auth.css`
- [ ] `public/auth.js`
- [ ] `public/test-auth-flow.html`

### 移动
- [ ] `public/admin-v2.html` → `public/pages/admin.html`
- [ ] `public/admin-v2.css` → `src/styles/pages/admin.css`
- [ ] `public/admin-v2.js` → `src/pages/admin/admin.js`
- [ ] `public/login.html` → `public/pages/login.html`
- [ ] `public/auth-v2.css` → `src/styles/pages/auth.css`
- [ ] `public/auth-v2.js` → `src/pages/auth/login.js`
- [ ] `public/nav.html` → `public/pages/nav.html`
- [ ] `public/nav.css` → `src/styles/pages/nav.css`
- [ ] `public/nav.js` → `src/pages/nav/nav.js`
- [ ] `public/api-client.js` → `src/lib/api/client.js`

### 新建
- [ ] `src/styles/base/variables.css`
- [ ] `src/styles/base/reset.css`
- [ ] `src/styles/base/typography.css`
- [ ] `src/styles/components/buttons.css`
- [ ] `src/styles/components/forms.css`
- [ ] `src/styles/components/cards.css`
- [ ] `src/styles/main.css`
- [ ] `src/lib/api/client.js`
- [ ] `src/lib/api/auth.js`
- [ ] `src/lib/config.js`

## 预期收益

### 性能
- ✅ 减少 CSS 体积：5,407 行 → ~4,000 行（删除重复）
- ✅ 更好的缓存：共享组件样式独立文件
- ✅ 代码分割：按需加载页面样式

### 可维护性
- ✅ 统一的设计 token
- ✅ 模块化的 JavaScript
- ✅ 清晰的目录结构
- ✅ 消除代码重复

### 开发体验
- ✅ 更容易找到文件
- ✅ 更容易重用组件
- ✅ 更容易测试

## 时间估算

- Phase 1-2 (目录+CSS): 2-3 天
- Phase 3 (JavaScript): 2 天
- Phase 4 (HTML): 1 天
- Phase 5 (API 迁移): 1 天
- Phase 6 (构建配置): 1 天
- 测试和调整: 1-2 天

**总计：8-10 天**
