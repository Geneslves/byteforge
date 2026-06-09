# ByteForge 后端功能设计方案

## 📋 当前状态分析

### 现有架构
- **类型**：纯静态网站（JAMstack）
- **前端**：Vite + Vanilla JS
- **数据**：硬编码在 `content.js`
- **部署**：静态托管（Vercel/Cloudflare Pages）
- **优势**：极快、免费、无服务器成本
- **局限**：无动态数据、无用户系统、无实时功能

---

## 🎯 后端功能需求分析

### 需要后端的场景

#### ❌ **不需要后端**
- 展示静态内容
- 博客文章阅读
- 项目展示
- 基础搜索（Pagefind 静态搜索）
- SEO 优化

#### ✅ **需要后端**
1. **用户系统**
   - 注册/登录
   - 个人资料
   - 权限管理
   
2. **动态内容**
   - 实时评论
   - 点赞/收藏
   - 浏览量统计
   - 用户生成内容（UGC）
   
3. **高级功能**
   - 全文搜索（大规模）
   - 推荐系统
   - 数据分析
   - API 服务
   
4. **管理功能**
   - CMS 内容管理
   - 数据备份
   - 日志分析

---

## 🏗️ 后端架构方案

### 方案 1：Serverless（推荐 - 渐进式）

**架构**：静态前端 + Serverless Functions + 云数据库

#### 技术栈
- **函数计算**：Vercel Functions / Cloudflare Workers
- **数据库**：Supabase / PlanetScale / Neon
- **认证**：Clerk / Supabase Auth / NextAuth.js
- **存储**：Cloudflare R2 / AWS S3
- **缓存**：Cloudflare KV / Upstash Redis

#### 优势
✅ 按需付费，成本低
✅ 无需运维
✅ 自动扩展
✅ 全球 CDN
✅ 快速部署

#### 适用场景
- 中小流量（< 10 万 DAU）
- 轻量级后端功能
- 快速迭代

---

### 方案 2：BaaS（Backend as a Service）

**架构**：静态前端 + BaaS 平台

#### 技术栈
- **Supabase**（开源 Firebase 替代）
  - PostgreSQL 数据库
  - 实时订阅
  - 认证系统
  - 存储服务
  - Edge Functions
  
- **Firebase**
  - Firestore 数据库
  - Authentication
  - Cloud Functions
  - Storage

#### 优势
✅ 一站式解决方案
✅ 实时功能内置
✅ SDK 完善
✅ 免费额度大

#### 适用场景
- 需要实时功能
- 快速 MVP
- 团队规模小

---

### 方案 3：传统后端（完整控制）

**架构**：前后端分离 + 独立后端服务

#### 技术栈 A（Node.js）
- **框架**：Express / Fastify / Nest.js
- **数据库**：PostgreSQL / MySQL
- **ORM**：Prisma / TypeORM
- **认证**：JWT / Passport.js
- **缓存**：Redis
- **队列**：Bull / BullMQ
- **搜索**：Elasticsearch / Meilisearch

#### 技术栈 B（Go）
- **框架**：Gin / Fiber / Echo
- **数据库**：PostgreSQL
- **ORM**：GORM
- **认证**：JWT
- **缓存**：Redis

#### 技术栈 C（Python）
- **框架**：FastAPI / Django REST
- **数据库**：PostgreSQL
- **ORM**：SQLAlchemy / Django ORM
- **认证**：JWT / OAuth2
- **任务队列**：Celery

#### 优势
✅ 完全控制
✅ 性能最优
✅ 功能强大
✅ 易于调试

#### 劣势
❌ 需要运维
❌ 成本较高
❌ 部署复杂

#### 适用场景
- 大流量（> 10 万 DAU）
- 复杂业务逻辑
- 需要完整控制

---

## 📦 功能模块设计

### 模块 1：用户系统

#### 1.1 认证授权
```javascript
// API 设计
POST   /api/auth/register        // 注册
POST   /api/auth/login           // 登录
POST   /api/auth/logout          // 登出
POST   /api/auth/refresh         // 刷新 token
GET    /api/auth/me              // 获取当前用户
PUT    /api/auth/profile         // 更新资料
POST   /api/auth/reset-password  // 重置密码
```

#### 1.2 数据模型
```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'user', -- user, admin
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 会话表
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 权限设计
- **游客**：浏览内容
- **注册用户**：评论、点赞、收藏
- **管理员**：管理内容、用户

---

### 模块 2：内容管理系统（CMS）

#### 2.1 文章管理
```javascript
// API 设计
GET    /api/posts                // 获取文章列表
GET    /api/posts/:id            // 获取文章详情
POST   /api/posts                // 创建文章（管理员）
PUT    /api/posts/:id            // 更新文章（管理员）
DELETE /api/posts/:id            // 删除文章（管理员）
POST   /api/posts/:id/publish    // 发布文章（管理员）
POST   /api/posts/:id/draft      // 草稿（管理员）
```

#### 2.2 数据模型
```sql
-- 文章表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'draft', -- draft, published
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 全文搜索
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || content)
  ) STORED
);

-- 索引
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

-- 标签表
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  count INT DEFAULT 0
);

-- 文章-标签关联表
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
```

#### 2.3 Markdown 编辑器
- **前端组件**：Monaco Editor / CodeMirror / Milkdown
- **实时预览**
- **图片上传**（拖拽 + 粘贴）
- **自动保存草稿**
- **版本历史**

---

### 模块 3：评论系统

#### 3.1 API 设计
```javascript
GET    /api/posts/:id/comments       // 获取评论列表
POST   /api/posts/:id/comments       // 发表评论
PUT    /api/comments/:id             // 编辑评论
DELETE /api/comments/:id             // 删除评论
POST   /api/comments/:id/like        // 点赞评论
POST   /api/comments/:id/reply       // 回复评论
```

#### 3.2 数据模型
```sql
-- 评论表
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- 软删除
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

#### 3.3 功能特性
- 支持 Markdown
- 嵌套回复（最多 3 层）
- @提及用户
- 表情支持
- 垃圾评论过滤
- 敏感词过滤

---

### 模块 4：点赞/收藏系统

#### 4.1 API 设计
```javascript
POST   /api/posts/:id/like          // 点赞文章
DELETE /api/posts/:id/like          // 取消点赞
POST   /api/posts/:id/bookmark      // 收藏文章
DELETE /api/posts/:id/bookmark      // 取消收藏
GET    /api/users/me/likes          // 我的点赞
GET    /api/users/me/bookmarks      // 我的收藏
```

#### 4.2 数据模型
```sql
-- 点赞表
CREATE TABLE likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- 收藏表
CREATE TABLE bookmarks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
```

---

### 模块 5：搜索系统

#### 5.1 方案对比

| 方案 | 优势 | 劣势 | 适用场景 |
|-----|------|------|---------|
| **Pagefind**（当前） | 免费、静态、快速 | 功能有限 | 小型站点 |
| **PostgreSQL 全文搜索** | 免费、集成简单 | 中文支持一般 | 中小站点 |
| **Meilisearch** | 快速、易用、中文友好 | 需要部署 | 中型站点 |
| **Elasticsearch** | 功能强大、分析全面 | 资源占用大 | 大型站点 |
| **Algolia** | 速度快、UI 好 | 收费贵 | 企业项目 |

#### 5.2 推荐方案：PostgreSQL 全文搜索
```sql
-- 搜索查询
SELECT 
  id, title, summary,
  ts_rank(search_vector, query) AS rank
FROM posts,
     to_tsquery('english', 'search & terms') query
WHERE search_vector @@ query
  AND status = 'published'
ORDER BY rank DESC, published_at DESC
LIMIT 20;
```

#### 5.3 API 设计
```javascript
GET /api/search?q=keyword&type=post&limit=20&offset=0
```

---

### 模块 6：数据统计分析

#### 6.1 实时统计
```javascript
GET /api/stats/overview          // 概览数据
GET /api/stats/posts/:id         // 文章统计
GET /api/stats/traffic           // 流量统计
GET /api/stats/popular           // 热门内容
```

#### 6.2 数据模型
```sql
-- 浏览记录表
CREATE TABLE page_views (
  id BIGSERIAL PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 按天聚合统计
CREATE TABLE daily_stats (
  date DATE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  PRIMARY KEY (date, post_id)
);
```

#### 6.3 实现方案
- **实时统计**：Redis 计数器
- **持久化**：定时任务写入数据库
- **热门榜单**：Redis Sorted Set
- **趋势分析**：时序数据库（InfluxDB）

---

### 模块 7：通知系统

#### 7.1 通知类型
- 评论通知
- 点赞通知
- @提及通知
- 系统公告

#### 7.2 API 设计
```javascript
GET    /api/notifications              // 获取通知列表
PUT    /api/notifications/:id/read     // 标记已读
PUT    /api/notifications/read-all     // 全部已读
GET    /api/notifications/unread-count // 未读数量
```

#### 7.3 数据模型
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- comment, like, mention, system
  title VARCHAR(255),
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

#### 7.4 实时推送
- **WebSocket**：Socket.io
- **SSE**（Server-Sent Events）：更简单
- **轮询**：兜底方案

---

### 模块 8：图片上传和管理

#### 8.1 存储方案
- **云存储**：
  - Cloudflare R2（免费 10GB）
  - AWS S3
  - 阿里云 OSS
  - 腾讯云 COS
  
- **CDN 加速**：自动优化和分发

#### 8.2 功能特性
- 图片压缩（Sharp / ImageMagick）
- 格式转换（WebP / AVIF）
- 缩略图生成
- 水印添加
- 安全检查（病毒扫描）

#### 8.3 API 设计
```javascript
POST   /api/upload/image          // 上传图片
GET    /api/uploads/:id           // 获取图片信息
DELETE /api/uploads/:id           // 删除图片
```

---

## 🚀 实施路线图

### 阶段 1：基础后端（第 1-2 月）

**目标**：最小可用后端

#### 技术选型
- **方案**：Serverless（Vercel Functions + Supabase）
- **认证**：Supabase Auth
- **数据库**：Supabase PostgreSQL

#### 实现功能
- [x] 无后端（当前状态）
- [ ] 用户注册/登录
- [ ] 评论系统（Supabase 实时）
- [ ] 点赞功能
- [ ] 浏览量统计

#### 工作量
- 开发时间：2-3 周
- 成本：$0（免费额度）

---

### 阶段 2：CMS 后台（第 2-3 月）

**目标**：自建内容管理系统

#### 实现功能
- [ ] 管理后台界面
- [ ] Markdown 编辑器
- [ ] 文章 CRUD
- [ ] 图片上传
- [ ] 标签管理
- [ ] 草稿/发布

#### 技术栈
- **后台框架**：React / Vue
- **编辑器**：Milkdown / TipTap
- **UI 库**：Ant Design / Arco Design

#### 工作量
- 开发时间：3-4 周
- 成本：$0-10/月（存储）

---

### 阶段 3：高级功能（第 3-6 月）

**目标**：完整功能闭环

#### 实现功能
- [ ] 全文搜索（Meilisearch）
- [ ] 通知系统
- [ ] 数据分析仪表板
- [ ] API 文档（Swagger）
- [ ] 推荐系统
- [ ] 收藏夹
- [ ] RSS 订阅

#### 工作量
- 开发时间：8-12 周
- 成本：$20-50/月

---

### 阶段 4：性能优化（第 6-12 月）

**目标**：支撑大流量

#### 优化项
- [ ] 数据库索引优化
- [ ] Redis 缓存策略
- [ ] CDN 配置
- [ ] SQL 查询优化
- [ ] API 限流
- [ ] 负载均衡

---

## 💰 成本预算

### Serverless 方案（推荐）

| 服务 | 免费额度 | 付费后 | 说明 |
|-----|---------|--------|------|
| **Vercel** | 100GB 带宽/月 | $20/月 | 托管 + Functions |
| **Supabase** | 500MB 数据库<br>2GB 存储 | $25/月 | 数据库 + 认证 + 存储 |
| **Cloudflare R2** | 10GB 存储 | $0.015/GB | 对象存储 |
| **Upstash Redis** | 10K 命令/天 | $0.2/10K | 缓存 |
| **总计** | **$0/月** | **$45-65/月** | 支撑 10 万+ DAU |

### 自建服务器方案

| 配置 | 价格 | 流量 |
|-----|------|------|
| **VPS**（2核4G） | $10-20/月 | 1TB/月 |
| **CDN** | $5-10/月 | 额外流量 |
| **数据库** | 自建/免费 | - |
| **总计** | **$15-30/月** | 中小流量 |

---

## 📚 技术选型建议

### 推荐组合 1：最快上手
```
前端：Vite + Vanilla JS（当前）
后端：Supabase（BaaS）
认证：Supabase Auth
部署：Vercel
```
- ✅ 零后端代码
- ✅ 1-2 周完成
- ✅ 完全免费
- ✅ 实时功能内置

### 推荐组合 2：灵活可控
```
前端：Vite + Vanilla JS
后端：Vercel Functions
数据库：PlanetScale（MySQL）
认证：Clerk
部署：Vercel
```
- ✅ Serverless 架构
- ✅ 按需付费
- ✅ 易于扩展
- ✅ 成本可控

### 推荐组合 3：完整控制
```
前端：Vite + Vanilla JS
后端：Fastify + TypeScript
数据库：PostgreSQL
认证：JWT
部署：VPS + Docker
```
- ✅ 完全控制
- ✅ 性能最优
- ✅ 成本固定
- ❌ 需要运维

---

## 🔧 开发工具链

### 后端开发
- **API 调试**：Postman / Insomnia
- **数据库工具**：DBeaver / TablePlus
- **日志查看**：Vercel Dashboard / Supabase Dashboard
- **性能分析**：New Relic / Datadog（可选）

### CI/CD
```yaml
# .github/workflows/backend.yml
name: Backend CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
      - run: npm run lint
```

---

## 🔒 安全考虑

### 必须实现
- [ ] HTTPS 强制
- [ ] CSRF 防护
- [ ] XSS 防护
- [ ] SQL 注入防护
- [ ] 速率限制（Rate Limiting）
- [ ] 密码加密（bcrypt）
- [ ] JWT 安全存储
- [ ] 环境变量保护

### 推荐实现
- [ ] 双因素认证（2FA）
- [ ] API 密钥管理
- [ ] 日志审计
- [ ] 入侵检测
- [ ] 数据备份

---

## 📊 数据库设计原则

### 索引策略
```sql
-- 频繁查询字段
CREATE INDEX idx_posts_status_published ON posts(status, published_at DESC);

-- 关联查询
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);

-- 全文搜索
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);
```

### 性能优化
- 查询分页（Limit + Offset / Cursor）
- 预加载关联（Eager Loading）
- 连接池配置
- 查询缓存（Redis）
- 慢查询监控

---

## 🎯 下一步行动

### 立即可做（无需后端）
1. ✅ 继续用静态内容
2. ✅ 集成第三方评论（giscus）
3. ✅ Google Analytics 统计
4. ✅ RSS 静态生成

### 需要简单后端（1 周内）
1. 注册 Supabase 账号
2. 创建数据库表
3. 前端集成 Supabase SDK
4. 实现用户登录 + 评论

### 需要完整后端（1-3 月）
1. 设计数据库模型
2. 开发 RESTful API
3. 构建管理后台
4. 部署和监控

---

## 📝 总结

### 当前状态：纯静态
- ✅ 性能极佳
- ✅ 成本为零
- ✅ 维护简单
- ❌ 功能有限

### 建议：渐进式引入后端
1. **第 1-3 月**：保持静态 + 第三方服务
2. **第 3-6 月**：引入 Serverless 后端（评论、统计）
3. **第 6-12 月**：根据需求决定是否完整后端

### 核心原则
- **从简单开始**，不要过度设计
- **根据流量决定架构**，不要提前优化
- **优先用户价值**，不要为了技术而技术
- **成本可控**，云服务按需付费

---

**最后更新**：2026-06-09  
**版本**：v1.0  
**作者**：ByteForge Team
