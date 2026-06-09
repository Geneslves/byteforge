# ByteForge 完整开发路线图

> **项目定位**：个人技术博客与知识管理平台  
> **技术架构**：前后端分离 + Serverless  
> **目标用户**：技术从业者、开发者、研究人员  
> **更新时间**：2026-06-09

---

## 📋 项目现状

### 当前版本：v2.0

**前端状态**：✅ 生产就绪
- 核心架构：Vite + Vanilla JS
- 功能完整：双主题、SPA 路由、视差动画
- 性能优化：74 KB（gzip: 20.22 KB）
- SEO/PWA：完全就绪

**后端状态**：⚠️ 未实现
- 数据：硬编码在 `content.js`
- 评论：无
- 用户系统：无
- CMS：无

**技术债务**：无重大问题

---

## 🎯 整体架构设计

### 技术栈选型

#### 前端（已实现）
```
构建工具：Vite 6.4.3
框架：Vanilla JS（无框架）
样式：CSS Variables + 原生 CSS
路由：History API（SPA）
部署：Vercel / Cloudflare Pages
```

#### 后端（待实现）
```
架构：Serverless + BaaS
函数计算：Vercel Functions
数据库：Supabase PostgreSQL
认证：Supabase Auth
存储：Cloudflare R2
缓存：Upstash Redis
搜索：Meilisearch
```

#### DevOps
```
版本控制：Git + GitHub
CI/CD：GitHub Actions
监控：Vercel Analytics
日志：Vercel Logs
错误追踪：Sentry（可选）
```

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
│  Browser (Desktop/Mobile) ──→ CDN (Cloudflare/Vercel)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        前端层（静态）                          │
│  • Vite 构建的静态资源                                        │
│  • HTML + CSS + JS                                          │
│  • PWA Manifest + Service Worker                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API 层（Serverless）                       │
│  • Vercel Functions（Node.js）                              │
│  • RESTful API + GraphQL（可选）                            │
│  • 认证中间件                                                │
│  • 速率限制                                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      数据层                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Supabase    │  │  Upstash     │  │  Cloudflare  │     │
│  │  PostgreSQL  │  │  Redis       │  │  R2          │     │
│  │  (主数据库)   │  │  (缓存)       │  │  (对象存储)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Meilisearch  │  │  Supabase    │                       │
│  │ (搜索引擎)    │  │  Auth        │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ 数据库设计

### 核心数据模型

#### 用户表（users）
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'user', -- user, admin
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

#### 文章表（posts）
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES users(id),
  category VARCHAR(50), -- logs, deployments, dev-ai, etc.
  status VARCHAR(20) DEFAULT 'draft', -- draft, published
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 全文搜索
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status_published ON posts(status, published_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category, published_at DESC);
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);
```

#### 标签表（tags）
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);
```

#### 文章-标签关联表（post_tags）
```sql
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id)
);
```

#### 评论表（comments）
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- 软删除
);

CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_user ON comments(user_id);
```

#### 点赞表（likes）
```sql
CREATE TABLE likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL, -- post, comment
  target_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE INDEX idx_likes_target ON likes(target_type, target_id);
```

#### 收藏表（bookmarks）
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  folder VARCHAR(100), -- 收藏夹分类
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
```

#### 通知表（notifications）
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- comment, like, mention, system
  title VARCHAR(255),
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
```

#### 浏览记录表（page_views）
```sql
CREATE TABLE page_views (
  id BIGSERIAL PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_page_views_post ON page_views(post_id, created_at DESC);
CREATE INDEX idx_page_views_created ON page_views(created_at DESC);
```

#### 日统计表（daily_stats）
```sql
CREATE TABLE daily_stats (
  date DATE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  PRIMARY KEY (date, post_id)
);

CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);
```

---

## 🔌 API 设计

### RESTful API 规范

**Base URL**: `https://api.byteforge.dev/v1`

**认证方式**: Bearer Token (JWT)

**请求头**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**响应格式**:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2026-06-09T12:00:00Z"
}
```

### API 端点清单

#### 认证模块
```
POST   /auth/register              注册
POST   /auth/login                 登录
POST   /auth/logout                登出
POST   /auth/refresh               刷新 token
GET    /auth/me                    获取当前用户信息
PUT    /auth/profile               更新个人资料
POST   /auth/reset-password        重置密码
POST   /auth/verify-email          验证邮箱
```

#### 文章模块
```
GET    /posts                      获取文章列表
GET    /posts/:id                  获取文章详情
GET    /posts/slug/:slug           通过 slug 获取文章
POST   /posts                      创建文章（管理员）
PUT    /posts/:id                  更新文章（管理员）
DELETE /posts/:id                  删除文章（管理员）
POST   /posts/:id/publish          发布文章（管理员）
POST   /posts/:id/like             点赞文章
DELETE /posts/:id/like             取消点赞
POST   /posts/:id/bookmark         收藏文章
DELETE /posts/:id/bookmark         取消收藏
GET    /posts/:id/related          相关文章推荐
```

#### 评论模块
```
GET    /posts/:id/comments         获取文章评论
POST   /posts/:id/comments         发表评论
PUT    /comments/:id               编辑评论
DELETE /comments/:id               删除评论
POST   /comments/:id/like          点赞评论
POST   /comments/:id/reply         回复评论
```

#### 搜索模块
```
GET    /search                     全文搜索
GET    /search/suggest             搜索建议
GET    /search/popular             热门搜索词
```

#### 标签模块
```
GET    /tags                       获取标签列表
GET    /tags/:slug                 获取标签详情
GET    /tags/:slug/posts           获取标签下的文章
```

#### 统计模块
```
GET    /stats/overview             总体统计
GET    /stats/posts/:id            文章统计详情
GET    /stats/popular              热门文章
GET    /stats/trending             趋势文章
```

#### 通知模块
```
GET    /notifications              获取通知列表
PUT    /notifications/:id/read     标记已读
PUT    /notifications/read-all     全部已读
GET    /notifications/unread-count 未读数量
DELETE /notifications/:id          删除通知
```

#### 用户模块
```
GET    /users/:id                  获取用户信息
GET    /users/:id/posts            获取用户文章
GET    /users/:id/comments         获取用户评论
GET    /users/me/bookmarks         我的收藏
GET    /users/me/likes             我的点赞
```

---

## 🚀 开发路线图（6 个月完整计划）

### 阶段 1：基础设施搭建（第 1-2 周）

**目标**：完成部署和基础后端架构

#### 1.1 前端部署
- [ ] 部署到 Vercel
- [ ] 配置自定义域名
- [ ] 配置 SSL 证书
- [ ] 设置 Google Analytics
- [ ] 提交 sitemap 到 Google

#### 1.2 后端基础设施
- [ ] 注册 Supabase 账号
- [ ] 创建 PostgreSQL 数据库
- [ ] 配置 Supabase Auth
- [ ] 设置环境变量
- [ ] 创建数据库表结构

#### 1.3 开发环境
- [ ] 配置 ESLint + Prettier
- [ ] 设置 Git Hooks (husky)
- [ ] 配置 GitHub Actions CI
- [ ] 设置本地开发环境

**交付物**：
- ✅ 网站上线访问
- ✅ 数据库就绪
- ✅ 开发环境完整

**成本**：$10（域名）

---

### 阶段 2：用户系统开发（第 3-4 周）

**目标**：实现完整的用户认证和授权

#### 2.1 前端集成
- [ ] 安装 Supabase JS SDK
- [ ] 创建登录/注册页面
- [ ] 实现用户状态管理
- [ ] 添加用户个人中心
- [ ] 实现权限控制

#### 2.2 后端 API
```javascript
// api/auth/register.js
export default async function handler(req, res) {
  const { email, username, password } = req.body;
  // 使用 Supabase Auth 注册
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  // ...
}
```

#### 2.3 功能清单
- [ ] 邮箱注册
- [ ] 邮箱登录
- [ ] 第三方登录（GitHub, Google）
- [ ] 找回密码
- [ ] 修改密码
- [ ] 更新个人资料
- [ ] 上传头像

**交付物**：
- ✅ 用户可以注册登录
- ✅ 个人资料管理
- ✅ 权限系统运行

**成本**：$0（Supabase 免费额度）

---

### 阶段 3：CMS 内容管理系统（第 5-8 周）

**目标**：构建管理后台，实现内容管理

#### 3.1 后台界面开发
- [ ] 创建管理后台路由 `/admin`
- [ ] 实现后台布局（侧边栏导航）
- [ ] 文章列表页面
- [ ] 文章编辑器页面
- [ ] 标签管理页面
- [ ] 用户管理页面（管理员）

#### 3.2 Markdown 编辑器
- [ ] 集成 Milkdown 编辑器
- [ ] 实时预览功能
- [ ] 图片上传（拖拽+粘贴）
- [ ] 代码高亮
- [ ] 自动保存草稿
- [ ] 快捷键支持

#### 3.3 文章管理 API
```javascript
// api/posts/create.js
export default async function handler(req, res) {
  // 验证管理员权限
  const user = await getUser(req);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const { title, content, tags, category } = req.body;
  
  // 生成 slug
  const slug = generateSlug(title);
  
  // 插入文章
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      slug,
      content,
      author_id: user.id,
      category,
      status: 'draft'
    })
    .select()
    .single();
  
  // 关联标签
  await associateTags(data.id, tags);
  
  res.json({ success: true, data });
}
```

#### 3.4 图片上传服务
- [ ] 配置 Cloudflare R2
- [ ] 实现图片上传 API
- [ ] 图片压缩（Sharp）
- [ ] 生成缩略图
- [ ] CDN 加速

**交付物**：
- ✅ 完整的管理后台
- ✅ Markdown 编辑器
- ✅ 文章发布系统
- ✅ 图片上传功能

**成本**：$0-10/月（R2 存储）

---

### 阶段 4：评论和互动系统（第 9-10 周）

**目标**：实现用户互动功能

#### 4.1 评论系统
- [ ] 评论组件开发
- [ ] Markdown 评论支持
- [ ] 嵌套回复（最多 3 层）
- [ ] @提及用户
- [ ] 表情支持
- [ ] 评论排序（最新/最热）
- [ ] 评论审核（管理员）

#### 4.2 互动功能
- [ ] 点赞文章
- [ ] 点赞评论
- [ ] 收藏文章
- [ ] 分享功能
- [ ] 阅读进度保存

#### 4.3 实时通知
- [ ] WebSocket 连接
- [ ] 评论通知
- [ ] 点赞通知
- [ ] @提及通知
- [ ] 通知中心页面

**交付物**：
- ✅ 评论系统完整
- ✅ 点赞收藏功能
- ✅ 实时通知

**成本**：$0（Supabase 实时功能）

---

### 阶段 5：搜索和数据分析（第 11-12 周）

**目标**：高级搜索和数据统计

#### 5.1 全文搜索
- [ ] 部署 Meilisearch
- [ ] 配置索引
- [ ] 实现搜索 API
- [ ] 搜索建议
- [ ] 高级筛选（标签、分类、日期）
- [ ] 搜索结果高亮

#### 5.2 数据统计
- [ ] 浏览量统计（Redis）
- [ ] 热门文章榜
- [ ] 趋势文章（24h、7d、30d）
- [ ] 用户行为分析
- [ ] 管理后台数据仪表板
- [ ] 图表可视化（Chart.js）

#### 5.3 推荐系统（简单版）
- [ ] 相关文章推荐（基于标签）
- [ ] 热门推荐
- [ ] 最新推荐
- [ ] 用户可能喜欢

**交付物**：
- ✅ 全文搜索功能
- ✅ 数据统计系统
- ✅ 推荐算法

**成本**：$10-20/月（Meilisearch + Redis）

---

### 阶段 6：性能优化和上线（第 13-16 周）

**目标**：优化性能，完善细节

#### 6.1 前端优化
- [ ] 代码分割（Dynamic Import）
- [ ] 图片懒加载
- [ ] 路由预加载
- [ ] Service Worker 缓存策略
- [ ] 离线访问支持
- [ ] 骨架屏加载

#### 6.2 后端优化
- [ ] API 响应缓存（Redis）
- [ ] 数据库查询优化
- [ ] 慢查询日志分析
- [ ] SQL 索引优化
- [ ] API 限流（Rate Limiting）
- [ ] 热点数据缓存

#### 6.3 监控和日志
- [ ] Sentry 错误追踪
- [ ] Vercel Analytics
- [ ] 性能监控（Core Web Vitals）
- [ ] API 日志记录
- [ ] 告警系统

#### 6.4 SEO 优化
- [ ] 动态 Meta 标签
- [ ] Sitemap 自动生成
- [ ] RSS Feed
- [ ] 结构化数据（JSON-LD）
- [ ] 内链优化

#### 6.5 安全加固
- [ ] CSRF 防护
- [ ] XSS 防护
- [ ] SQL 注入防护
- [ ] 敏感词过滤
- [ ] 内容审核
- [ ] 备份策略

**交付物**：
- ✅ 性能达标（Lighthouse 90+）
- ✅ 监控告警完整
- ✅ 安全防护到位
- ✅ 正式上线

**成本**：$20-30/月（监控工具）

---

### 阶段 7：未来功能扩展（第 17-24 周）

**目标**：完善 7 个未来页面

#### 7.1 Infrastructure 页面
- [ ] Docker/Podman 教程
- [ ] Nginx 配置案例
- [ ] CI/CD 流程
- [ ] 服务器运维笔记

#### 7.2 Snippets 页面
- [ ] 代码片段库
- [ ] 按语言分类
- [ ] 一键复制
- [ ] 代码高亮
- [ ] 标签筛选

#### 7.3 Academic 页面
- [ ] Zotero 工作流
- [ ] 论文阅读笔记
- [ ] 文献管理
- [ ] 研究方法论

#### 7.4 Knowledge Base 页面
- [ ] Wiki 结构
- [ ] 双向链接
- [ ] 知识图谱可视化
- [ ] 标签系统

#### 7.5 Toolbox 页面
- [ ] 在线工具集合
- [ ] 开发工具推荐
- [ ] Chrome/VSCode 插件
- [ ] 资源导航

#### 7.6 Lab Notes 页面
- [ ] 技术实验记录
- [ ] Bug 调试过程
- [ ] 性能测试报告
- [ ] 新技术探索

#### 7.7 Changelog 页面
- [ ] 自动生成更新日志
- [ ] 版本对比
- [ ] 提交历史可视化
- [ ] 贡献者统计

**交付物**：
- ✅ 7 个功能页面上线
- ✅ 内容体系完整

**成本**：$0（无额外成本）

---

## 💰 成本预算

### 月度成本明细

| 服务 | 免费额度 | 超出后费用 | 预计月成本 |
|-----|---------|-----------|----------|
| **Vercel** | 100GB 带宽 | $20/月起 | $0-20 |
| **Supabase** | 500MB 数据库<br>2GB 存储 | $25/月 | $0-25 |
| **Cloudflare R2** | 10GB 存储 | $0.015/GB | $0-5 |
| **Upstash Redis** | 10K 命令/天 | $0.2/10K 命令 | $0-10 |
| **Meilisearch Cloud** | 100K 文档 | $29/月起 | $0-29 |
| **域名** | - | $10-15/年 | $1 |
| **Sentry** | 5K 错误/月 | $26/月起 | $0-26 |
| **总计** | - | - | **$1-116/月** |

### 成本优化建议

**阶段 1-3（前 2 个月）**
```
只用免费服务
成本：$10（域名）+ $0/月
支持：1000 DAU
```

**阶段 4-6（第 3-6 个月）**
```
按需付费
成本：$20-50/月
支持：10,000 DAU
```

**稳定运营期（第 6 个月+）**
```
完整服务
成本：$50-116/月
支持：100,000 DAU
```

---

## 📊 技术实现细节

### 后端项目结构

```
backend/
├── api/                      # Vercel Functions
│   ├── auth/
│   │   ├── register.js
│   │   ├── login.js
│   │   ├── logout.js
│   │   └── refresh.js
│   ├── posts/
│   │   ├── index.js         # GET /api/posts
│   │   ├── [id].js          # GET /api/posts/:id
│   │   ├── create.js        # POST /api/posts
│   │   └── update.js        # PUT /api/posts/:id
│   ├── comments/
│   │   ├── index.js
│   │   └── [id].js
│   ├── search/
│   │   └── index.js
│   └── stats/
│       └── index.js
├── lib/
│   ├── supabase.js          # Supabase 客户端
│   ├── redis.js             # Redis 客户端
│   ├── auth.js              # 认证中间件
│   ├── db.js                # 数据库工具
│   └── utils.js             # 工具函数
├── migrations/              # 数据库迁移
│   ├── 001_create_users.sql
│   ├── 002_create_posts.sql
│   └── ...
└── package.json
```

### 前端项目结构

```
src/
├── api/                     # API 调用封装
│   ├── auth.js
│   ├── posts.js
│   ├── comments.js
│   └── client.js           # HTTP 客户端
├── components/             # 可复用组件
│   ├── Comment.js
│   ├── PostCard.js
│   ├── Editor.js
│   └── ...
├── pages/                  # 页面组件
│   ├── home.js
│   ├── post.js
│   ├── admin.js
│   └── ...
├── stores/                 # 状态管理
│   ├── user.js
│   ├── posts.js
│   └── ...
├── utils/                  # 工具函数
│   ├── markdown.js
│   ├── date.js
│   └── ...
├── main.js                # 入口文件
└── router.js              # 路由配置
```

---

## 🔐 安全实现

### JWT 认证流程

```javascript
// lib/auth.js
import jwt from 'jsonwebtoken';

export async function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No token provided');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
```

### 权限中间件

```javascript
// lib/auth.js
export async function requireAuth(req, res, next) {
  try {
    const user = await verifyToken(req);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
}
```

### 缓存策略

```javascript
// lib/redis.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function cache(key, ttl, fn) {
  // 尝试从缓存获取
  const cached = await redis.get(key);
  if (cached) return cached;
  
  // 执行函数获取数据
  const data = await fn();
  
  // 写入缓存
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}

// 使用示例
export async function getPopularPosts() {
  return cache('posts:popular', 3600, async () => {
    // 从数据库查询
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(10);
    return data;
  });
}
```

### API 限流

```javascript
// lib/rateLimit.js
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 次请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 登录/注册最多 5 次
  message: '尝试次数过多，请 15 分钟后再试',
});
```

---

## 📈 KPI 指标体系

### 第 1 个月目标
- [ ] 网站上线
- [ ] 日均 UV：50+
- [ ] 文章数量：8+
- [ ] 注册用户：10+
- [ ] PageSpeed：90+
- [ ] Google 收录：10+ 页面

### 第 3 个月目标
- [ ] 日均 UV：200+
- [ ] 文章数量：20+
- [ ] 注册用户：100+
- [ ] 评论数量：50+
- [ ] 自然搜索流量：30%+
- [ ] 社交媒体关注：100+

### 第 6 个月目标
- [ ] 日均 UV：500+
- [ ] 文章数量：40+
- [ ] 注册用户：500+
- [ ] 评论数量：200+
- [ ] 自然搜索流量：50%+
- [ ] RSS 订阅：50+
- [ ] GitHub Stars：100+

---

## 🛠️ 开发工具链

### 必备工具
- **IDE**：VSCode + Claude Code
- **API 测试**：Postman / Insomnia
- **数据库工具**：TablePlus / DBeaver
- **设计工具**：Figma
- **版本控制**：Git + GitHub Desktop

### 推荐 VSCode 插件
- ESLint
- Prettier
- GitLens
- REST Client
- Database Client
- Error Lens
- TODO Highlight

### Chrome 插件
- React DevTools
- Vue DevTools
- Wappalyzer
- Lighthouse
- JSON Viewer

---

## ✅ 下一步行动清单

### 本周（立即执行）

#### Day 1-2：部署上线
- [ ] 部署前端到 Vercel
- [ ] 购买域名（byteforge.dev）
- [ ] 配置 DNS 和 SSL
- [ ] 设置 Google Analytics
- [ ] 提交 sitemap

#### Day 3-5：后端搭建
- [ ] 注册 Supabase 账号
- [ ] 创建数据库
- [ ] 运行数据库迁移脚本
- [ ] 配置环境变量
- [ ] 测试数据库连接

#### Day 6-7：用户系统
- [ ] 安装 Supabase SDK
- [ ] 实现注册页面
- [ ] 实现登录页面
- [ ] 测试认证流程

---

### 第 2-4 周：核心功能

#### Week 2：完善用户系统
- [ ] 个人资料页面
- [ ] 修改密码功能
- [ ] 头像上传
- [ ] 第三方登录（GitHub）

#### Week 3：CMS 后台框架
- [ ] 管理后台路由
- [ ] 后台布局设计
- [ ] 文章列表页面
- [ ] 权限控制

#### Week 4：内容编辑器
- [ ] 集成 Markdown 编辑器
- [ ] 实时预览
- [ ] 图片上传
- [ ] 草稿保存

---

### 第 5-8 周：互动功能

#### Week 5-6：评论系统
- [ ] 评论组件开发
- [ ] 评论 API
- [ ] 嵌套回复
- [ ] 评论管理

#### Week 7-8：点赞收藏
- [ ] 点赞功能
- [ ] 收藏功能
- [ ] 通知系统
- [ ] 实时推送

---

### 第 9-12 周：高级功能

#### Week 9-10：搜索
- [ ] 部署 Meilisearch
- [ ] 搜索 API
- [ ] 搜索前端
- [ ] 高级筛选

#### Week 11-12：数据分析
- [ ] 浏览量统计
- [ ] 热门文章
- [ ] 数据仪表板
- [ ] 推荐算法

---

## 📚 学习资源

### 官方文档
- [Supabase 文档](https://supabase.com/docs)
- [Vercel 文档](https://vercel.com/docs)
- [Meilisearch 文档](https://www.meilisearch.com/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

### 教程推荐
- Supabase 快速入门
- Serverless 架构实践
- PostgreSQL 性能优化
- RESTful API 设计规范

### 社区
- Supabase Discord
- Vercel Community
- GitHub Discussions

---

## 🎯 项目里程碑

### Milestone 1：MVP 上线（第 4 周）
- ✅ 前端部署
- ✅ 用户注册登录
- ✅ 文章展示
- ✅ 基础 CMS

### Milestone 2：核心功能（第 8 周）
- ✅ 完整 CMS
- ✅ 评论系统
- ✅ 点赞收藏
- ✅ 通知系统

### Milestone 3：高级功能（第 12 周）
- ✅ 全文搜索
- ✅ 数据统计
- ✅ 推荐系统
- ✅ 性能优化

### Milestone 4：完整上线（第 16 周）
- ✅ 所有功能完成
- ✅ 性能达标
- ✅ 监控完善
- ✅ 正式运营

---

## 🔄 持续迭代计划

### 第 6-12 个月
- 用户反馈收集
- 功能持续优化
- 内容持续产出
- 社区运营
- SEO 优化
- 性能调优

### 长期规划
- 移动 App 开发
- 国际化支持
- AI 功能集成
- 社区化运营
- 商业化探索

---

## 📝 总结

### 核心要点

1. **渐进式开发**
   - 先 MVP，后完善
   - 功能分阶段上线
   - 根据反馈迭代

2. **成本可控**
   - 前期免费额度
   - 按需付费
   - 避免过度设计

3. **用户优先**
   - 关注用户需求
   - 快速响应反馈
   - 持续优化体验

4. **技术务实**
   - 选择成熟方案
   - 避免过度优化
   - 保持代码质量

### 成功关键

✅ **专注内容**：优质内容是核心竞争力  
✅ **稳定可靠**：保证网站稳定运行  
✅ **持续迭代**：根据数据不断优化  
✅ **社区运营**：建立用户社区  

---

**项目启动时间**：2026-06-09  
**预计完成时间**：2026-12-09（6 个月）  
**文档版本**：v1.0  
**维护者**：ByteForge Team

---

**🎉 祝项目开发顺利！**

