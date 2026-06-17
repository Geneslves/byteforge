# Database and Platform Abstraction Layer

这个抽象层使 ByteForge 能够在多个平台上运行，包括 Cloudflare Pages、Node.js/Express、Vercel 等。

## 架构概述

```
functions/lib/
├── db/                      # 数据库抽象层
│   ├── index.js            # 主入口，自动检测平台
│   ├── adapters/
│   │   ├── d1.js          # Cloudflare D1 适配器
│   │   └── postgres.js    # PostgreSQL 适配器
│   └── __tests__/
├── platform/               # 平台适配器
│   ├── adapter.js         # 请求处理器包装器
│   └── __tests__/
└── validation.js          # Schema 验证工具
```

## 数据库抽象层

### 使用方法

```javascript
import { createDatabase } from './lib/db/index.js'

// 在 handler 中使用
export async function onRequestGet({ request, env }) {
  const db = createDatabase(env)
  
  // 查询所有结果
  const users = await db.query('SELECT * FROM users WHERE active = ?', [true])
  
  // 查询单个结果
  const user = await db.first('SELECT * FROM users WHERE id = ?', [userId])
  
  // 执行 INSERT/UPDATE/DELETE
  const result = await db.run(
    'INSERT INTO users (id, username, email) VALUES (?, ?, ?)',
    [id, username, email]
  )
  console.log('Inserted rows:', result.changes)
  console.log('Last ID:', result.lastInsertId)
  
  // 事务
  await db.transaction(async (tx) => {
    await tx.run('INSERT INTO users ...')
    await tx.run('INSERT INTO sessions ...')
  })
}
```

### 支持的平台

**Cloudflare D1:**
- 自动检测 `env.DB` 绑定
- 使用 D1 的 prepared statements API
- 支持 batch 操作

**PostgreSQL:**
- 检测 `env.DATABASE_URL` 或 `env.DB_CLIENT`
- 自动转换 `?` 占位符为 `$1, $2` 格式
- 支持事务

## 平台适配器

### 使用方法

使用 `createHandler` 包装器替代原始的 `onRequestGet/Post` 导出：

**原始代码：**
```javascript
export async function onRequestPost({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, ...)
  }
  
  const auth = await requireAuth(request, env, 'admin')
  if (!auth.authorized) {
    return apiError(auth.error, 403, ...)
  }
  
  const body = await request.json().catch(() => null)
  if (!body.field) {
    return apiError('validation_error', 400, ...)
  }
  
  const result = await env.DB.prepare('...').bind(...).run()
  
  return json({ ok: true, data: result }, {}, request, env, METHODS)
}
```

**使用抽象层后：**
```javascript
import { createHandler } from '../lib/platform/adapter.js'
import { json } from '../lib/http.js'

const METHODS = 'POST, OPTIONS'

export const onRequestPost = createHandler({
  auth: 'admin',           // 自动处理认证
  methods: METHODS,
  schema: {                // 自动验证请求体
    field: 'string',
    count: { type: 'number', min: 1, max: 100 }
  },
  handler: async ({ request, env, db, auth, body }) => {
    // 只需要业务逻辑！
    const result = await db.run('INSERT INTO ...', [...])
    
    return json({ ok: true, data: result }, {}, request, env, METHODS)
  }
})
```

### createHandler 选项

```javascript
createHandler({
  // 认证要求（可选）
  auth: 'admin' | 'user' | null,
  
  // 允许的 HTTP 方法
  methods: 'GET, POST, OPTIONS',
  
  // 请求体验证 schema（可选）
  schema: {
    field1: 'string',                    // 简单类型
    field2: {                            // 详细配置
      type: 'string',
      min: 2,
      max: 100,
      required: true
    },
    field3: {
      type: 'number',
      min: 0,
      max: 1000
    }
  },
  
  // 业务逻辑处理器
  handler: async (context) => {
    // context 包含：
    // - request: Web API Request
    // - env: 环境变量和绑定
    // - db: 数据库适配器实例
    // - auth: 认证结果（如果设置了 auth）
    // - user: 用户对象（如果设置了 auth）
    // - body: 解析和验证后的请求体（如果设置了 schema）
    // - platform: 'cloudflare' | 'nodejs' | 'vercel'
  }
})
```

## Schema 验证

### 基本类型

```javascript
{
  field1: 'string',      // 必需的字符串
  field2: 'number',      // 必需的数字
  field3: 'boolean',     // 必需的布尔值
  field4: 'array',       // 必需的数组
  field5: 'object'       // 必需的对象
}
```

### 可选字段

```javascript
{
  field: {
    type: 'string',
    required: false    // 可选字段
  }
}
```

### 字符串约束

```javascript
{
  username: {
    type: 'string',
    min: 3,           // 最少 3 个字符
    max: 20,          // 最多 20 个字符
    pattern: /^[a-zA-Z0-9_]+$/  // 正则验证
  }
}
```

### 数字约束

```javascript
{
  age: {
    type: 'number',
    min: 0,
    max: 120
  }
}
```

### 枚举值

```javascript
{
  role: {
    type: 'string',
    enum: ['user', 'admin', 'moderator']
  }
}
```

### 自定义验证器

```javascript
import { validators } from '../lib/validation.js'

{
  email: {
    type: 'string',
    validator: validators.email
  },
  username: {
    type: 'string',
    validator: validators.username
  }
}
```

## 迁移步骤

### 1. 迁移单个端点

1. 导入 `createHandler`
2. 将认证和验证逻辑移到配置对象
3. 在 handler 中只保留业务逻辑
4. 使用 `db` 而不是 `env.DB`

### 2. 测试

```bash
# 在 Cloudflare 上测试
pnpm run dev:api

# 测试端点
curl http://localhost:8788/api/your-endpoint
```

### 3. 保持向后兼容

- 原始文件保留为 `.js`
- 迁移后的文件使用 `.new.js` 后缀
- 测试通过后，重命名替换原文件

## 平台支持

### Cloudflare Pages (当前)

✅ 完全支持，无需更改

### Node.js/Express

```javascript
// server/index.js
import express from 'express'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const app = express()
app.use(express.json())

// 导入 Cloudflare handler
import { onRequestPost } from '../functions/api/feedback.js'

// 适配到 Express
app.post('/api/feedback', async (req, res) => {
  const response = await onRequestPost({
    req,
    res,
    env: {
      ...process.env,
      DB_CLIENT: pool
    }
  })
  
  // 转换 Response 到 Express
  res.status(response.status)
  const body = await response.text()
  res.send(body)
})
```

### Vercel

类似 Node.js，使用 Vercel Postgres

## 性能考虑

抽象层设计为**零开销**或**接近零开销**：

- 数据库适配器是薄包装器
- 不改变查询逻辑
- 不添加额外的网络调用
- 使用相同的底层 API

预期性能影响：< 5%

## 下一步

- [ ] 为所有端点编写单元测试
- [ ] 迁移所有 18 个 API 端点
- [ ] 添加 Node.js/Express 服务器
- [ ] 创建 PostgreSQL schema
- [ ] 性能基准测试
- [ ] 更新部署文档
