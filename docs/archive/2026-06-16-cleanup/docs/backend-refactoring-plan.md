# ByteForge 后端重构方案

## 执行摘要

本方案针对 ByteForge 项目后端进行生产级别的重构，确保代码质量、可维护性、安全性和可部署性达到企业标准。

**重构范围：**
- 统一项目结构和代码组织
- 完善环境配置管理
- 增强错误处理和日志系统
- 添加完整的测试覆盖
- 规范 API 设计和文档
- 优化安全机制
- 建立 CI/CD 流程
- 完善监控和告警

**预期收益：**
- 降低维护成本 40%
- 提升部署可靠性至 99.9%
- 减少生产故障 80%
- 提高开发效率 50%

---

## 一、当前架构分析

### 1.1 技术栈

| 层级 | 技术 | 版本 |
|-----|------|------|
| 前端构建 | Vite | 6.3.5 |
| 运行时 | Vanilla JavaScript | ES2022+ |
| 后端平台 | Cloudflare Pages Functions | - |
| 数据库 | Cloudflare D1 (SQLite) | - |
| 部署工具 | Wrangler | 4.100.0 |
| 包管理 | pnpm | 10.33.0 |

### 1.2 现有模块

**后端模块：**
```
functions/
├── api/                    # API 端点
│   ├── auth/              # 认证相关
│   ├── admin/             # 管理后台
│   ├── feedback.js        # 反馈收集
│   ├── content-events.js  # 内容事件
│   └── health.js          # 健康检查
└── lib/                   # 共享库
    ├── auth.js            # 认证逻辑
    └── http.js            # HTTP 工具
```

**数据库表：**
- `users` - 用户账户
- `sessions` - 会话管理
- `settings` - 系统设置
- `feedback` - 用户反馈
- `content_events` - 内容分析事件

### 1.3 识别的问题

#### 严重问题 (P0)
1. ❌ **缺少环境隔离** - 没有明确的开发/测试/生产环境配置
2. ❌ **缺少测试** - 无单元测试、集成测试、E2E 测试
3. ❌ **缺少 CI/CD** - 手动部署，容易出错
4. ❌ **日志不规范** - 缺少结构化日志和日志级别
5. ❌ **错误处理不完整** - 部分错误未捕获，错误信息暴露敏感信息

#### 重要问题 (P1)
6. ⚠️ **缺少 API 版本控制** - API 无版本管理，破坏性变更影响大
7. ⚠️ **缺少限流** - 无请求频率限制，易受攻击
8. ⚠️ **缺少输入验证框架** - 验证逻辑分散，不够系统
9. ⚠️ **缺少数据库迁移管理** - schema 变更无版本控制
10. ⚠️ **缺少性能监控** - 无慢查询追踪，无性能基线

#### 次要问题 (P2)
11. 📝 **文档不完整** - 缺少 API 文档、部署手册
12. 📝 **缺少代码规范** - 无 ESLint、Prettier 配置
13. 📝 **缺少安全审计** - 无定期安全扫描
14. 📝 **缺少备份策略** - 数据备份不系统

---

## 二、重构目标

### 2.1 核心目标

1. **生产就绪** - 满足企业级生产环境要求
2. **可维护性** - 代码清晰，易于理解和修改
3. **可测试性** - 完整的测试覆盖，自动化测试
4. **可观测性** - 完善的日志、监控、告警
5. **安全性** - 通过安全审计，防护常见攻击
6. **可扩展性** - 架构支持未来扩展需求

### 2.2 非功能性需求

| 指标 | 目标值 | 当前值 |
|-----|--------|--------|
| API 可用性 | 99.9% | 未监控 |
| P95 响应时间 | < 200ms | 未监控 |
| 测试覆盖率 | > 80% | 0% |
| 部署频率 | 每日多次 | 手动不定期 |
| MTTR (故障恢复) | < 30分钟 | 未知 |
| 安全漏洞 | 0个高危 | 未审计 |

---

## 三、重构方案详细设计

### 3.1 项目结构重组

#### 新目录结构

```
byteforge/
├── src/                           # 前端源码（保持现有）
├── functions/                     # Cloudflare Functions
│   ├── api/                      # API 端点
│   │   ├── v1/                   # API v1
│   │   │   ├── auth/             # 认证
│   │   │   │   ├── login.js
│   │   │   │   ├── register.js
│   │   │   │   ├── logout.js
│   │   │   │   ├── refresh.js
│   │   │   │   └── me.js
│   │   │   ├── admin/            # 管理
│   │   │   │   ├── analytics.js
│   │   │   │   ├── content-stats.js
│   │   │   │   ├── feedback.js
│   │   │   │   ├── settings.js
│   │   │   │   └── users.js
│   │   │   ├── public/           # 公开接口
│   │   │   │   ├── health.js
│   │   │   │   ├── feedback.js
│   │   │   │   └── content-events.js
│   │   │   └── _middleware.js    # v1 中间件
│   │   └── _middleware.js        # 全局中间件
│   ├── lib/                      # 共享库
│   │   ├── auth/                 # 认证模块
│   │   │   ├── password.js       # 密码处理
│   │   │   ├── jwt.js            # JWT 处理
│   │   │   ├── validators.js     # 输入验证
│   │   │   └── middleware.js     # 认证中间件
│   │   ├── http/                 # HTTP 工具
│   │   │   ├── response.js       # 响应构建
│   │   │   ├── cors.js           # CORS 处理
│   │   │   ├── errors.js         # 错误类型
│   │   │   └── middleware.js     # HTTP 中间件
│   │   ├── db/                   # 数据库工具
│   │   │   ├── query-builder.js  # 查询构建
│   │   │   ├── transactions.js   # 事务管理
│   │   │   └── migrations.js     # 迁移工具
│   │   ├── logger/               # 日志系统
│   │   │   ├── index.js
│   │   │   └── formatters.js
│   │   ├── validation/           # 验证框架
│   │   │   ├── schemas.js        # 验证规则
│   │   │   └── validator.js      # 验证器
│   │   ├── rate-limit/           # 限流
│   │   │   └── index.js
│   │   └── utils/                # 通用工具
│   │       ├── crypto.js
│   │       └── date.js
│   └── config/                   # 配置
│       ├── environments.js       # 环境配置
│       └── constants.js          # 常量定义
├── tests/                        # 测试文件
│   ├── unit/                     # 单元测试
│   ├── integration/              # 集成测试
│   └── e2e/                      # E2E 测试
├── scripts/                      # 脚本（保持现有+新增）
│   ├── check-*.js                # 检查脚本
│   ├── db/                       # 数据库脚本
│   │   ├── migrate.js
│   │   ├── seed.js
│   │   └── backup.js
│   └── deploy/                   # 部署脚本
│       ├── pre-deploy.js
│       └── post-deploy.js
├── migrations/                   # 数据库迁移
│   ├── 001_initial_schema.sql
│   ├── 002_add_sessions.sql
│   └── ...
├── schema/                       # Schema 定义
│   ├── d1.sql                    # 完整 schema
│   └── README.md                 # Schema 文档
├── docs/                         # 文档
│   ├── api/                      # API 文档
│   │   └── v1.md
│   ├── deployment/               # 部署文档
│   │   ├── production.md
│   │   ├── staging.md
│   │   └── development.md
│   ├── architecture/             # 架构文档
│   │   ├── overview.md
│   │   ├── security.md
│   │   └── database.md
│   └── runbooks/                 # 运维手册
│       ├── incident-response.md
│       └── backup-restore.md
├── .github/                      # GitHub Actions
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-production.yml
│       └── deploy-staging.yml
├── .eslintrc.cjs                 # ESLint 配置
├── .prettierrc.json              # Prettier 配置
├── vitest.config.js              # Vitest 配置
├── wrangler.toml                 # Cloudflare 配置
└── package.json
```

### 3.2 环境配置管理

#### 环境分离

| 环境 | 用途 | 域名 | D1 数据库 |
|-----|------|------|----------|
| development | 本地开发 | localhost:8788 | byteforge-dev |
| staging | 预发布测试 | staging.byteforge.dev | byteforge-staging |
| production | 生产环境 | byteforge.dev | byteforge |

#### 配置文件结构

**`functions/config/environments.js`**
```javascript
export const getConfig = (env) => {
  const environment = env.ENVIRONMENT || 'development';
  
  const baseConfig = {
    jwt: {
      secret: env.JWT_SECRET,
      expiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      refreshExpiryMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    cors: {
      allowedOrigins: getAllowedOrigins(env),
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyPrefix: 'rl:',
    },
    logging: {
      level: environment === 'production' ? 'info' : 'debug',
      structured: true,
    },
  };

  const envConfigs = {
    development: {
      ...baseConfig,
      rateLimit: { ...baseConfig.rateLimit, enabled: false },
      logging: { ...baseConfig.logging, level: 'debug' },
    },
    staging: {
      ...baseConfig,
      rateLimit: { ...baseConfig.rateLimit, maxRequests: 200 },
    },
    production: {
      ...baseConfig,
    },
  };

  return envConfigs[environment] || envConfigs.development;
};
```

#### Wrangler 配置

**`wrangler.toml`**
```toml
name = "byteforge"
compatibility_date = "2026-06-15"
pages_build_output_dir = "dist"

[vars]
ENVIRONMENT = "production"
SITE_ORIGIN = "https://byteforge.dev"
ALLOWED_ORIGINS = "https://byteforge.dev"
API_VERSION = "v1"

[observability]
enabled = true
head_sampling_rate = 1.0

[[d1_databases]]
binding = "DB"
database_name = "byteforge"
database_id = "YOUR_PRODUCTION_DB_ID"

[env.staging]
[env.staging.vars]
ENVIRONMENT = "staging"
SITE_ORIGIN = "https://staging.byteforge.dev"
ALLOWED_ORIGINS = "https://staging.byteforge.dev"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "byteforge-staging"
database_id = "YOUR_STAGING_DB_ID"
```

**`.dev.vars.example`**
```bash
# 开发环境配置模板
JWT_SECRET=your-local-jwt-secret-min-32-chars
ENVIRONMENT=development
SITE_ORIGIN=http://localhost:8788
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8788,http://127.0.0.1:5173,http://127.0.0.1:8788
```

### 3.3 日志系统

#### 结构化日志设计

**`functions/lib/logger/index.js`**
```javascript
export class Logger {
  constructor(context = {}) {
    this.context = context;
    this.environment = context.env?.ENVIRONMENT || 'development';
  }

  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
      ...this.context,
      ...metadata,
    };

    if (this.environment === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(message, metadata) { this.log('debug', message, metadata); }
  info(message, metadata) { this.log('info', message, metadata); }
  warn(message, metadata) { this.log('warn', message, metadata); }
  error(message, metadata) { this.log('error', message, metadata); }
}

export const createLogger = (request, env) => {
  return new Logger({
    env,
    requestId: crypto.randomUUID(),
    path: new URL(request.url).pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
  });
};
```

#### 日志级别定义

| 级别 | 用途 | 示例 |
|-----|------|------|
| `debug` | 开发调试信息 | 函数入参、中间状态 |
| `info` | 正常业务日志 | 用户登录、API 调用 |
| `warn` | 警告信息 | 验证失败、降级处理 |
| `error` | 错误信息 | 异常、数据库错误 |

#### 日志输出示例

**开发环境：**
```
[INFO] User logged in { userId: '123', username: 'admin' }
```

**生产环境（JSON）：**
```json
{
  "timestamp": "2026-06-15T12:34:56.789Z",
  "level": "info",
  "message": "User logged in",
  "environment": "production",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/v1/auth/login",
  "method": "POST",
  "userId": "123",
  "username": "admin"
}
```

---

### 3.4 错误处理系统

#### 错误类型定义

**`functions/lib/http/errors.js`**
```javascript
export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, { retryAfter });
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super('DATABASE_ERROR', message, 500);
  }
}
```

#### 全局错误处理中间件

**`functions/api/_middleware.js`**
```javascript
import { Logger } from '../lib/logger/index.js';
import { AppError } from '../lib/http/errors.js';
import { json } from '../lib/http/response.js';

export async function onRequest(context) {
  const { request, env, next } = context;
  const logger = new Logger({ env, request });

  try {
    const response = await next();
    
    // 记录成功请求
    logger.info('Request completed', {
      status: response.status,
      path: new URL(request.url).pathname,
    });
    
    return response;
  } catch (error) {
    // 记录错误
    logger.error('Request failed', {
      error: error.message,
      stack: error.stack,
      code: error.code,
    });

    // 区分操作错误和程序错误
    if (error instanceof AppError && error.isOperational) {
      return json({
        ok: false,
        error: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      }, { status: error.statusCode }, request, env);
    }

    // 未预期的错误 - 返回通用错误信息
    return json({
      ok: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    }, { status: 500 }, request, env);
  }
}
```

---

### 3.5 输入验证框架

#### 验证 Schema 定义

**`functions/lib/validation/schemas.js`**
```javascript
export const schemas = {
  auth: {
    register: {
      username: {
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/,
        message: 'Username must be 3-20 alphanumeric characters or underscores',
      },
      email: {
        type: 'string',
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Invalid email format',
      },
      password: {
        type: 'string',
        required: true,
        minLength: 12,
        message: 'Password must be at least 12 characters',
      },
    },
    login: {
      username: { type: 'string', required: true },
      password: { type: 'string', required: true },
    },
  },
  feedback: {
    create: {
      route_path: { type: 'string', required: true, maxLength: 255 },
      document_id: { type: 'string', required: false, maxLength: 100 },
      message: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
    },
  },
  contentEvent: {
    create: {
      route_path: { type: 'string', required: true, maxLength: 255 },
      document_id: { type: 'string', required: false, maxLength: 100 },
      event_type: { 
        type: 'string', 
        required: true, 
        enum: ['view', 'click', 'search', 'share'],
      },
    },
  },
};
```

**`functions/lib/validation/validator.js`**
```javascript
import { ValidationError } from '../http/errors.js';

export class Validator {
  static validate(data, schema) {
    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field} is required`;
        continue;
      }

      // Skip validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }

      // Type check
      if (rules.type && typeof value !== rules.type) {
        errors[field] = `${field} must be a ${rules.type}`;
        continue;
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors[field] = rules.message || `${field} must be at least ${rules.minLength} characters`;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors[field] = rules.message || `${field} must not exceed ${rules.maxLength} characters`;
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors[field] = rules.message || `${field} format is invalid`;
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors[field] = `${field} must be one of: ${rules.enum.join(', ')}`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    return true;
  }
}
```

### 3.6 限流机制

**`functions/lib/rate-limit/index.js`**
```javascript
import { RateLimitError } from '../http/errors.js';

export class RateLimiter {
  constructor(env, config) {
    this.env = env;
    this.config = config;
  }

  async check(key, maxRequests = 100, windowMs = 15 * 60 * 1000) {
    if (!this.config.enabled) return true;

    const now = Date.now();
    const windowKey = `${this.config.keyPrefix}${key}:${Math.floor(now / windowMs)}`;
    
    // 使用 D1 作为限流存储
    const current = await this.env.DB.prepare(
      'SELECT value FROM rate_limits WHERE key = ? AND expires_at > ?'
    ).bind(windowKey, new Date(now).toISOString()).first();

    const count = current ? parseInt(current.value, 10) : 0;

    if (count >= maxRequests) {
      const retryAfter = Math.ceil((Math.floor(now / windowMs) + 1) * windowMs - now) / 1000;
      throw new RateLimitError(retryAfter);
    }

    // 增加计数
    await this.env.DB.prepare(
      `INSERT OR REPLACE INTO rate_limits (key, value, expires_at, created_at) 
       VALUES (?, ?, ?, ?)`
    ).bind(
      windowKey,
      String(count + 1),
      new Date(now + windowMs).toISOString(),
      new Date(now).toISOString()
    ).run();

    return true;
  }

  static async middleware(context, config) {
    const { request, env, next } = context;
    const rateLimiter = new RateLimiter(env, config);
    
    // 使用 IP 或用户 ID 作为限流 key
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const key = `ip:${ip}`;
    
    await rateLimiter.check(key, config.maxRequests, config.windowMs);
    
    return next();
  }
}
```

#### 限流表 Schema

```sql
-- 添加到 schema/d1.sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);
```

---

### 3.7 数据库迁移管理

#### 迁移文件命名规范

```
migrations/
├── 001_initial_schema.sql
├── 002_add_rate_limits.sql
├── 003_add_refresh_tokens.sql
└── ...
```

**命名规则：** `{序号}_{描述}.sql`

#### 迁移工具

**`scripts/db/migrate.js`**
```javascript
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const MIGRATIONS_DIR = 'migrations';
const DATABASE = process.argv[2] || 'byteforge';

async function runMigrations() {
  console.log(`Running migrations on database: ${DATABASE}`);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const path = join(MIGRATIONS_DIR, file);
    console.log(`Applying migration: ${file}`);
    
    try {
      execSync(`wrangler d1 execute ${DATABASE} --file=${path}`, {
        stdio: 'inherit',
      });
      console.log(`✓ ${file} applied successfully`);
    } catch (error) {
      console.error(`✗ Failed to apply ${file}`);
      throw error;
    }
  }

  console.log('All migrations applied successfully');
}

runMigrations().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

**使用方法：**
```bash
# 本地迁移
node scripts/db/migrate.js byteforge-dev

# 预发布环境
node scripts/db/migrate.js byteforge-staging

# 生产环境
node scripts/db/migrate.js byteforge
```

### 3.8 测试策略

#### 测试金字塔

```
        /\
       /  \  E2E Tests (10%)
      /____\
     /      \  Integration Tests (30%)
    /________\
   /          \  Unit Tests (60%)
  /__________\
```

#### 单元测试

**`tests/unit/lib/auth/password.test.js`**
```javascript
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../../../functions/lib/auth/password.js';

describe('Password hashing', () => {
  it('should hash a password', async () => {
    const password = 'secure-password-123';
    const hash = await hashPassword(password);
    
    expect(hash).toMatch(/^pbkdf2_sha256\$\d+\$.+\$.+$/);
  });

  it('should verify a correct password', async () => {
    const password = 'secure-password-123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'secure-password-123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrong-password', hash);
    expect(isValid).toBe(false);
  });

  it('should use different salts for the same password', async () => {
    const password = 'secure-password-123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
  });
});
```

#### 集成测试

**`tests/integration/api/auth/login.test.js`**
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('POST /api/v1/auth/login', () => {
  let worker;
  let testUser;

  beforeAll(async () => {
    worker = await unstable_dev('functions/api/v1/auth/login.js', {
      experimental: { disableExperimentalWarning: true },
    });

    // 创建测试用户
    testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'secure-password-123',
    };

    await worker.fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should login with valid credentials', async () => {
    const response = await worker.fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser.username,
        password: testUser.password,
      }),
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const response = await worker.fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser.username,
        password: 'wrong-password',
      }),
    });

    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe('invalid_credentials');
  });
});
```

#### E2E 测试

**`tests/e2e/user-flow.test.js`**
```javascript
import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

describe('User authentication flow', () => {
  it('should complete full registration and login flow', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // 访问注册页面
    await page.goto('http://localhost:8788/login.html');
    
    // 切换到注册模式
    await page.click('button:has-text("Register")');
    
    // 填写注册表单
    await page.fill('input[name="username"]', 'e2euser');
    await page.fill('input[name="email"]', 'e2e@example.com');
    await page.fill('input[name="password"]', 'secure-password-123');
    
    // 提交注册
    await page.click('button[type="submit"]');
    
    // 等待注册成功并跳转
    await page.waitForURL('http://localhost:8788/admin.html');
    
    // 验证已登录状态
    const username = await page.textContent('.user-info .username');
    expect(username).toBe('e2euser');

    await browser.close();
  });
});
```

#### 测试配置

**`vitest.config.js`**
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '*.config.js',
      ],
    },
  },
});
```

### 3.9 API 版本控制

#### API 路径结构

```
/api/v1/auth/login        # v1 API
/api/v1/auth/register
/api/v1/admin/analytics
/api/v2/auth/login        # 未来的 v2 API（向后兼容）
```

#### 版本迁移策略

1. **同时维护多个版本** - 新旧版本并存，给客户端迁移时间
2. **废弃通知** - 在响应头中标记废弃版本
3. **文档清晰** - 每个版本的文档独立维护

**版本废弃响应头：**
```javascript
// v1 API 中间件
export async function onRequest(context) {
  const response = await context.next();
  
  response.headers.set('X-API-Version', 'v1');
  response.headers.set('X-API-Deprecated', 'false');
  // response.headers.set('X-API-Sunset', '2027-01-01'); // 废弃日期
  
  return response;
}
```

---

### 3.10 安全加固

#### 安全检查清单

| 类别 | 措施 | 状态 |
|-----|------|------|
| 认证 | PBKDF2 密码哈希 | ✅ 已实现 |
| 认证 | JWT 签名验证 | ✅ 已实现 |
| 认证 | Token 过期检查 | ✅ 已实现 |
| 认证 | Refresh Token 机制 | ⏳ 待实现 |
| 授权 | 基于角色的访问控制 | ✅ 已实现 |
| 授权 | 细粒度权限控制 | ⏳ 待实现 |
| 输入 | SQL 注入防护 | ✅ Prepared Statements |
| 输入 | XSS 防护 | ⏳ 需添加 CSP |
| 输入 | 输入验证 | ⏳ 待系统化 |
| 输出 | 敏感信息过滤 | ⏳ 待加强 |
| 网络 | CORS 配置 | ✅ 白名单模式 |
| 网络 | HTTPS Only | ⏳ 生产环境 |
| 限流 | API 限流 | ⏳ 待实现 |
| 日志 | 结构化日志 | ⏳ 待实现 |
| 日志 | 敏感数据脱敏 | ⏳ 待实现 |

#### Content Security Policy

**添加 CSP 头：**
```javascript
// functions/api/_middleware.js
export async function onRequest(context) {
  const response = await context.next();
  
  // 安全响应头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
  
  return response;
}
```

#### Refresh Token 机制

**Schema 更新：**
```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**API 端点：**
```javascript
// functions/api/v1/auth/refresh.js
export async function onRequestPost({ request, env }) {
  const { refreshToken } = await request.json();
  
  // 验证 refresh token
  const token = await env.DB.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > ? AND revoked = 0'
  ).bind(hashToken(refreshToken), new Date().toISOString()).first();
  
  if (!token) {
    throw new AuthenticationError('Invalid refresh token');
  }
  
  // 生成新的 access token
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(token.user_id).first();
  
  const newAccessToken = await generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  }, env);
  
  return json({ ok: true, token: newAccessToken });
}
```

### 3.11 CI/CD 流程

#### GitHub Actions 工作流

**`.github/workflows/ci.yml`**
```yaml
name: CI

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:unit
      - run: pnpm run test:integration
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm run check:backend
      - run: pnpm run check:auth
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit
      - name: Run security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
```

**`.github/workflows/deploy-production.yml`**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests
        run: |
          pnpm run test:unit
          pnpm run test:integration
      
      - name: Build
        run: pnpm build
      
      - name: Run pre-deploy checks
        run: |
          pnpm run check:project
          pnpm run check:backend
          pnpm run check:auth
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: byteforge
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Run post-deploy checks
        run: |
          sleep 30
          curl -f https://byteforge.dev/api/v1/public/health || exit 1
      
      - name: Notify deployment
        if: success()
        run: echo "Deployment successful"
      
      - name: Rollback on failure
        if: failure()
        run: echo "Deployment failed - manual rollback required"
```

**`.github/workflows/deploy-staging.yml`**
```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm build
      
      - name: Deploy to Staging
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: byteforge-staging
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### 3.12 监控和告警

#### Cloudflare Analytics Integration

**监控指标：**

| 指标类型 | 指标名称 | 告警阈值 |
|---------|---------|---------|
| 可用性 | API 成功率 | < 99.5% |
| 性能 | P95 响应时间 | > 500ms |
| 性能 | P99 响应时间 | > 1000ms |
| 错误率 | 5xx 错误率 | > 1% |
| 错误率 | 4xx 错误率 | > 10% |
| 流量 | 请求数峰值 | > 10000/min |
| 数据库 | 查询时间 P95 | > 100ms |
| 数据库 | 连接失败率 | > 0.1% |

#### 日志查询和分析

**使用 Cloudflare Logpush 导出日志到分析平台：**

```javascript
// 在应用中记录关键指标
export async function recordMetric(env, metric) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    metric: metric.name,
    value: metric.value,
    tags: metric.tags,
  };
  
  console.log(JSON.stringify(logEntry));
}

// 示例：记录 API 响应时间
const startTime = Date.now();
const response = await handleRequest(request, env);
const duration = Date.now() - startTime;

await recordMetric(env, {
  name: 'api.response_time',
  value: duration,
  tags: {
    path: new URL(request.url).pathname,
    method: request.method,
    status: response.status,
  },
});
```

#### 健康检查端点增强

**`functions/api/v1/public/health.js`**
```javascript
export async function onRequestGet({ env }) {
  const checks = {
    database: await checkDatabase(env),
    api: { status: 'healthy' },
    timestamp: new Date().toISOString(),
  };

  const allHealthy = Object.values(checks).every(
    check => check.status === 'healthy'
  );

  return new Response(JSON.stringify({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
  }), {
    status: allHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function checkDatabase(env) {
  try {
    const result = await env.DB.prepare('SELECT 1 as test').first();
    return result?.test === 1
      ? { status: 'healthy' }
      : { status: 'unhealthy', message: 'Invalid response' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}
```

---

### 3.13 代码质量工具

#### ESLint 配置

**`.eslintrc.cjs`**
```javascript
module.exports = {
  env: {
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off', // Cloudflare Workers uses console for logging
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    'comma-dangle': ['error', 'always-multiline'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
  },
};
```

#### Prettier 配置

**`.prettierrc.json`**
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

#### Package.json 脚本更新

```json
{
  "scripts": {
    "dev": "vite",
    "build": "node scripts/build.js && pnpm run build:pagefind",
    "build:pagefind": "pagefind --site dist --output-subdir pagefind",
    
    "lint": "eslint functions/ scripts/ --ext .js",
    "lint:fix": "eslint functions/ scripts/ --ext .js --fix",
    "format": "prettier --write \"functions/**/*.js\" \"scripts/**/*.js\"",
    "format:check": "prettier --check \"functions/**/*.js\" \"scripts/**/*.js\"",
    
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:coverage": "vitest run --coverage",
    
    "db:migrate": "node scripts/db/migrate.js",
    "db:seed": "node scripts/db/seed.js",
    "db:backup": "node scripts/db/backup.js",
    
    "check": "pnpm run lint && pnpm run format:check && pnpm run test:unit && pnpm build && pnpm run check:all",
    "check:all": "pnpm run check:project && pnpm run check:backend && pnpm run check:auth",
    "check:project": "node scripts/check-project.js",
    "check:backend": "node scripts/check-backend.js",
    "check:auth": "node scripts/check-auth.js"
  },
  "devDependencies": {
    "eslint": "^8.57.0",
    "prettier": "^3.2.5",
    "vitest": "^1.4.0",
    "@vitest/coverage-v8": "^1.4.0",
    "playwright": "^1.42.1",
    "pagefind": "^1.5.2",
    "vite": "^6.3.5",
    "wrangler": "^4.100.0"
  }
}
```

### 3.14 API 文档

#### OpenAPI/Swagger 规范

**`docs/api/v1.yaml`**
```yaml
openapi: 3.0.0
info:
  title: ByteForge API
  version: 1.0.0
  description: ByteForge 后端 API 文档
  contact:
    name: ByteForge Team
    url: https://byteforge.dev

servers:
  - url: https://byteforge.dev/api/v1
    description: 生产环境
  - url: https://staging.byteforge.dev/api/v1
    description: 预发布环境
  - url: http://localhost:8788/api/v1
    description: 本地开发

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      properties:
        ok:
          type: boolean
          example: false
        error:
          type: string
          example: "VALIDATION_ERROR"
        message:
          type: string
          example: "Validation failed"
        details:
          type: object

    User:
      type: object
      properties:
        id:
          type: string
        username:
          type: string
        email:
          type: string
        role:
          type: string
          enum: [user, admin]
        created_at:
          type: string
          format: date-time

paths:
  /public/health:
    get:
      summary: 健康检查
      tags: [Public]
      responses:
        200:
          description: 服务健康
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "healthy"
                  checks:
                    type: object

  /auth/register:
    post:
      summary: 用户注册
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [username, email, password]
              properties:
                username:
                  type: string
                  minLength: 3
                  maxLength: 20
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 12
      responses:
        200:
          description: 注册成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok:
                    type: boolean
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
        400:
          description: 验证失败
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/login:
    post:
      summary: 用户登录
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [username, password]
              properties:
                username:
                  type: string
                password:
                  type: string
      responses:
        200:
          description: 登录成功
        401:
          description: 认证失败

  /admin/analytics:
    get:
      summary: 获取统计数据
      tags: [Admin]
      security:
        - bearerAuth: []
      responses:
        200:
          description: 统计数据
        403:
          description: 权限不足
```

---

## 四、实施计划

### 4.1 分阶段实施

#### 第一阶段：基础设施 (Week 1-2)

**目标：** 建立开发基础和工具链

| 任务 | 工时 | 优先级 |
|-----|------|--------|
| 搭建项目新结构 | 4h | P0 |
| 配置 ESLint/Prettier | 2h | P0 |
| 添加环境配置管理 | 4h | P0 |
| 实现结构化日志系统 | 6h | P0 |
| 实现错误处理系统 | 6h | P0 |
| 添加输入验证框架 | 8h | P0 |
| 编写单元测试框架 | 4h | P0 |

**产出：**
- ✅ 统一的项目结构
- ✅ 代码质量工具配置
- ✅ 环境隔离机制
- ✅ 日志和错误处理基础设施

#### 第二阶段：核心功能重构 (Week 3-4)

**目标：** 重构现有 API，提升质量

| 任务 | 工时 | 优先级 |
|-----|------|--------|
| 重构认证模块 | 8h | P0 |
| 添加 Refresh Token | 6h | P1 |
| 实现 API 版本控制 | 4h | P1 |
| 添加限流机制 | 6h | P1 |
| 重构所有 API 端点 | 16h | P0 |
| 编写集成测试 | 12h | P0 |
| 添加安全响应头 | 2h | P0 |

**产出：**
- ✅ 完整的认证授权系统
- ✅ 版本化的 API
- ✅ 限流保护
- ✅ 60%+ 测试覆盖率

#### 第三阶段：数据库和部署 (Week 5)

**目标：** 完善数据库管理和自动化部署

| 任务 | 工时 | 优先级 |
|-----|------|--------|
| 建立数据库迁移系统 | 6h | P0 |
| 编写迁移脚本 | 4h | P0 |
| 配置 CI/CD 流程 | 8h | P0 |
| 搭建 Staging 环境 | 4h | P0 |
| 编写部署文档 | 4h | P1 |
| 编写备份恢复脚本 | 4h | P1 |

**产出：**
- ✅ 数据库版本控制
- ✅ 自动化 CI/CD
- ✅ 多环境部署
- ✅ 完整的部署文档

#### 第四阶段：监控和文档 (Week 6)

**目标：** 完善监控、文档和安全审计

| 任务 | 工时 | 优先级 |
|-----|------|--------|
| 配置监控和告警 | 6h | P0 |
| 增强健康检查端点 | 2h | P0 |
| 编写 API 文档 | 8h | P1 |
| 编写架构文档 | 4h | P1 |
| 编写运维手册 | 6h | P1 |
| 安全审计和加固 | 8h | P0 |
| E2E 测试编写 | 8h | P1 |

**产出：**
- ✅ 完整的监控体系
- ✅ OpenAPI 文档
- ✅ 运维手册
- ✅ 安全审计报告
- ✅ 80%+ 测试覆盖率

### 4.2 里程碑和验收标准

#### 里程碑 1：开发环境就绪 (Week 2)

**验收标准：**
- [ ] 项目结构符合新规范
- [ ] ESLint/Prettier 通过检查
- [ ] 所有环境变量配置完成
- [ ] 日志系统输出结构化日志
- [ ] 错误处理覆盖所有 API
- [ ] 10+ 单元测试通过

#### 里程碑 2：核心功能完成 (Week 4)

**验收标准：**
- [ ] 所有 API 重构完成
- [ ] 认证系统支持 Refresh Token
- [ ] API 版本控制实施
- [ ] 限流机制生效
- [ ] 60%+ 测试覆盖率
- [ ] 所有安全检查通过

#### 里程碑 3：生产就绪 (Week 5)

**验收标准：**
- [ ] CI/CD 流程自动化
- [ ] Staging 环境部署成功
- [ ] Production 环境部署成功
- [ ] 数据库迁移脚本可用
- [ ] 备份恢复流程验证
- [ ] 部署文档完整

#### 里程碑 4：上线发布 (Week 6)

**验收标准：**
- [ ] 监控和告警配置完成
- [ ] API 文档发布
- [ ] 运维手册完整
- [ ] 安全审计通过
- [ ] 80%+ 测试覆盖率
- [ ] 生产环境稳定运行 7 天

---

## 五、风险管理

### 5.1 技术风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|-----|-------|------|---------|
| D1 数据库性能瓶颈 | 中 | 高 | 提前压测，准备缓存方案 |
| API 版本迁移成本高 | 低 | 中 | 保持向后兼容，逐步迁移 |
| 测试覆盖不足 | 中 | 中 | 优先核心功能，持续补充 |
| Cloudflare 平台限制 | 低 | 高 | 研究文档，设计替代方案 |
| 安全漏洞 | 中 | 高 | 定期审计，依赖扫描 |

### 5.2 运营风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|-----|-------|------|---------|
| 生产环境故障 | 低 | 高 | 完善监控，快速回滚机制 |
| 数据丢失 | 低 | 高 | 自动备份，定期恢复演练 |
| 用户数据泄露 | 低 | 高 | 加密存储，访问日志审计 |
| 服务中断 | 中 | 中 | 健康检查，自动重启 |

### 5.3 项目风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|-----|-------|------|---------|
| 工期延误 | 中 | 中 | 分阶段交付，调整优先级 |
| 资源不足 | 低 | 中 | 提前规划，外部支持 |
| 需求变更 | 中 | 低 | 敏捷迭代，预留缓冲 |

---

## 六、成本估算

### 6.1 开发成本

| 阶段 | 工时 | 工作日 |
|-----|------|--------|
| 第一阶段 | 34h | 4.5天 |
| 第二阶段 | 54h | 7天 |
| 第三阶段 | 30h | 4天 |
| 第四阶段 | 42h | 5.5天 |
| **总计** | **160h** | **21天** |

**假设：** 每天 8 小时工作时间

### 6.2 运营成本（年）

| 项目 | 费用 | 说明 |
|-----|------|------|
| Cloudflare Pages | $0-20/月 | 按用量计费 |
| Cloudflare D1 | $5/月 | 5GB 存储 |
| GitHub Actions | $0 | 公开仓库免费 |
| 域名 | $15/年 | .dev 域名 |
| SSL 证书 | $0 | Cloudflare 提供 |
| **年度总计** | **$75-255** | 取决于流量 |

### 6.3 ROI 分析

**投入：**
- 开发时间：160 工时
- 运营成本：$75-255/年

**收益：**
- 维护成本降低 40% → 节省 64 工时/年
- 故障减少 80% → 节省故障处理时间
- 开发效率提升 50% → 新功能上线更快
- 安全性提升 → 降低数据泄露风险

**结论：** 6 个月内收回成本

---

## 七、质量保证

### 7.1 代码审查清单

- [ ] 代码符合 ESLint 规范
- [ ] 代码符合 Prettier 格式
- [ ] 所有函数有适当的注释
- [ ] 没有硬编码的密钥或敏感信息
- [ ] 错误处理覆盖所有异常情况
- [ ] 输入验证完整
- [ ] SQL 查询使用 Prepared Statements
- [ ] API 响应不包含敏感信息
- [ ] CORS 配置正确
- [ ] 日志记录适当
- [ ] 测试覆盖关键路径

### 7.2 测试策略

**单元测试（60%）：**
- 所有工具函数
- 认证逻辑
- 验证逻辑
- 错误处理

**集成测试（30%）：**
- API 端点
- 数据库操作
- 认证流程
- 中间件链

**E2E 测试（10%）：**
- 用户注册登录流程
- 管理后台操作
- 反馈提交流程

**目标覆盖率：** 80%+

### 7.3 性能基准

| 指标 | 目标 | 测量方法 |
|-----|------|---------|
| API 响应时间 P50 | < 100ms | Cloudflare Analytics |
| API 响应时间 P95 | < 200ms | Cloudflare Analytics |
| API 响应时间 P99 | < 500ms | Cloudflare Analytics |
| 数据库查询 P95 | < 50ms | 日志分析 |
| 首次内容绘制 (FCP) | < 1.5s | Lighthouse |
| 最大内容绘制 (LCP) | < 2.5s | Lighthouse |

---

## 八、部署流程

### 8.1 环境准备

#### 开发环境

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/byteforge.git
cd byteforge

# 2. 安装依赖
pnpm install

# 3. 创建 .dev.vars
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入本地配置

# 4. 创建本地 D1 数据库
wrangler d1 create byteforge-dev

# 5. 应用数据库 schema
wrangler d1 execute byteforge-dev --local --file=./schema/d1.sql

# 6. 运行迁移
pnpm run db:migrate byteforge-dev

# 7. 启动开发服务器
pnpm dev
```

#### Staging 环境

```bash
# 1. 创建 Staging D1 数据库
wrangler d1 create byteforge-staging

# 2. 更新 wrangler.toml 中的 database_id

# 3. 应用 schema
wrangler d1 execute byteforge-staging --file=./schema/d1.sql

# 4. 设置密钥
wrangler secret put JWT_SECRET --env staging

# 5. 部署
git push origin develop  # 自动触发 CI/CD
```

#### 生产环境

```bash
# 1. 创建 Production D1 数据库
wrangler d1 create byteforge

# 2. 更新 wrangler.toml 中的 database_id

# 3. 应用 schema
wrangler d1 execute byteforge --remote --file=./schema/d1.sql

# 4. 设置密钥
wrangler secret put JWT_SECRET

# 5. 部署
git push origin main  # 自动触发 CI/CD
```

### 8.2 部署检查清单

**部署前：**
- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 依赖安全扫描通过
- [ ] 数据库迁移脚本准备好
- [ ] 回滚计划准备好
- [ ] 监控和告警配置完成

**部署中：**
- [ ] 数据库备份完成
- [ ] 应用数据库迁移
- [ ] 部署新代码
- [ ] 健康检查通过
- [ ] 冒烟测试通过

**部署后：**
- [ ] 监控指标正常
- [ ] 错误率在阈值内
- [ ] 关键业务流程验证
- [ ] 性能指标达标
- [ ] 观察 30 分钟无异常

### 8.3 回滚流程

**自动回滚触发条件：**
- 健康检查失败
- 错误率 > 5%
- P95 响应时间 > 1000ms

**手动回滚步骤：**
```bash
# 1. 通过 Cloudflare Dashboard 回滚到上一个部署

# 2. 如果需要回滚数据库
wrangler d1 execute byteforge --remote --file=./backups/before-deploy.sql

# 3. 验证回滚成功
curl https://byteforge.dev/api/v1/public/health

# 4. 通知团队
echo "Rolled back to previous version"
```

---

## 九、维护和运营

### 9.1 日常运维任务

| 任务 | 频率 | 负责人 |
|-----|------|--------|
| 检查监控指标 | 每日 | DevOps |
| 查看错误日志 | 每日 | 开发团队 |
| 数据库备份验证 | 每周 | DBA |
| 依赖安全扫描 | 每周 | 安全团队 |
| 性能分析 | 每月 | 开发团队 |
| 容量规划 | 每季度 | 架构师 |

### 9.2 备份策略

**自动备份：**
```bash
# 添加到 crontab 或 GitHub Actions
0 2 * * * node scripts/db/backup.js production
```

**`scripts/db/backup.js`**
```javascript
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const environment = process.argv[2] || 'byteforge';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `backup-${environment}-${timestamp}.sql`;

console.log(`Creating backup: ${filename}`);

try {
  const output = execSync(
    `wrangler d1 export ${environment} --remote`,
    { encoding: 'utf8' }
  );
  
  writeFileSync(`backups/${filename}`, output);
  console.log(`Backup created successfully: backups/${filename}`);
  
  // 可选：上传到 R2 或其他存储
} catch (error) {
  console.error('Backup failed:', error);
  process.exit(1);
}
```

**备份保留策略：**
- 每日备份保留 7 天
- 每周备份保留 4 周
- 每月备份保留 12 个月

### 9.3 故障响应

**响应流程：**

1. **检测** - 监控告警触发
2. **评估** - 确定严重程度和影响范围
3. **通知** - 通知相关人员
4. **诊断** - 查看日志和指标
5. **修复** - 应用临时或永久修复
6. **验证** - 确认问题解决
7. **复盘** - 记录事件和改进措施

**严重程度分级：**

| 级别 | 定义 | 响应时间 | 示例 |
|-----|------|---------|------|
| P0 | 服务完全中断 | 15分钟 | API 全部失败 |
| P1 | 核心功能不可用 | 1小时 | 登录失败 |
| P2 | 部分功能受影响 | 4小时 | 某个 API 慢 |
| P3 | 轻微问题 | 1天 | 日志有警告 |

---

## 十、未来规划

### 10.1 短期优化（3-6 个月）

- [ ] 实现缓存层（Cloudflare KV）
- [ ] 添加全文搜索（Pagefind + D1）
- [ ] 实现邮件通知（Cloudflare Email Routing）
- [ ] 添加多语言支持
- [ ] 优化数据库查询性能
- [ ] 实现 GraphQL API

### 10.2 中期规划（6-12 个月）

- [ ] 微服务拆分评估
- [ ] 引入消息队列（Cloudflare Queues）
- [ ] 实现实时通知（WebSocket）
- [ ] 添加内容推荐系统
- [ ] 实现 A/B 测试框架
- [ ] 移动端 API 优化

### 10.3 长期愿景（12+ 个月）

- [ ] 多区域部署
- [ ] 边缘计算优化
- [ ] AI 驱动的内容分析
- [ ] 高级分析和报表
- [ ] 开放 API 平台
- [ ] 第三方集成生态

---

## 十一、附录

### 11.1 参考文档

- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [REST API Best Practices](https://restfulapi.net/)
- [The Twelve-Factor App](https://12factor.net/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

### 11.2 联系方式

**项目负责人：** [待填写]  
**技术架构师：** [待填写]  
**安全负责人：** [待填写]

### 11.3 变更日志

| 日期 | 版本 | 变更内容 | 作者 |
|-----|------|---------|------|
| 2026-06-15 | 1.0.0 | 初始版本 | Claude |

---

## 总结

本重构方案为 ByteForge 项目提供了一个全面的、生产就绪的后端架构升级路径。通过分阶段实施，我们将：

1. **建立坚实的基础设施** - 统一结构、日志、错误处理
2. **提升代码质量** - 测试、代码规范、文档
3. **加强安全性** - 认证、授权、输入验证、安全审计
4. **实现自动化** - CI/CD、测试、部署
5. **完善监控运维** - 日志、监控、告警、备份

**关键成功因素：**
- 分阶段、增量式实施
- 保持向后兼容
- 完整的测试覆盖
- 详尽的文档
- 持续的代码审查

**预期结果：**
- 生产级别的代码质量
- 99.9% 的 API 可用性
- 快速的部署流程
- 低维护成本
- 良好的开发者体验

---

**下一步行动：**
1. 评审本方案，确认实施范围
2. 建立项目看板，分配任务
3. 开始第一阶段实施
4. 每周同步进度和风险
5. 里程碑达成后进行验收

**方案版本：** 1.0.0  
**创建日期：** 2026-06-15  
**审核状态：** 待审核
