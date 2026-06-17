# 🎉 认证 API 和 Rate Limit 集成完成！

## ✅ 已完成的更新

### 1. 认证 API 更新（2 个文件）

#### `functions/api/auth/register.js` ✅
**新增功能：**
- 注册时自动生成 refresh token
- 返回 `token` (7天) + `refreshToken` (30天)
- Refresh token 安全存储（SHA-256 哈希）

**响应示例：**
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  },
  "token": "access-token-7-days",
  "refreshToken": "refresh-token-30-days"
}
```

#### `functions/api/auth/login.js` ✅
**新增功能：**
- 登录时自动生成 refresh token
- 返回 `token` (7天) + `refreshToken` (30天)
- 每次登录生成新的 refresh token

**响应示例：**
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  },
  "token": "access-token-7-days",
  "refreshToken": "refresh-token-30-days"
}
```

### 2. 全局 Rate Limit 中间件 ✅

#### `functions/api/_middleware.js` ✅
**功能：**
- 应用到所有 `/api/*` 路径
- 默认限制：15 分钟内 100 次请求
- 跳过健康检查端点
- 自动返回 429 错误

**限流规则：**
- 基于 IP 地址
- 滑动窗口算法
- 自动清理过期记录

---

## 🚀 现在可以测试了！

### 启动开发服务器

```powershell
pnpm dev
```

### 测试 1：注册用户（获取 refresh token）

```powershell
curl -X POST http://localhost:5173/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "secure-password-123"
  }'
```

**预期响应：**
```json
{
  "ok": true,
  "user": {
    "id": "...",
    "username": "testuser",
    "email": "test@example.com",
    "role": "admin"
  },
  "token": "eyJhbGc...",
  "refreshToken": "uuid-token-here"
}
```

### 测试 2：使用 Refresh Token 获取新 Token

```powershell
curl -X POST http://localhost:5173/api/v1/auth/refresh `
  -H "Content-Type: application/json" `
  -d '{"refreshToken": "从上面获取的-refresh-token"}'
```

**预期响应：**
```json
{
  "ok": true,
  "token": "new-access-token",
  "user": {
    "id": "...",
    "username": "testuser",
    "email": "test@example.com",
    "role": "admin"
  }
}
```

### 测试 3：Rate Limit（快速发送多次请求）

```powershell
# 快速发送 105 次请求
for ($i=1; $i -le 105; $i++) {
  $response = curl -X GET http://localhost:5173/api/health -UseBasicParsing
  Write-Host "Request $i - Status: $($response.StatusCode)"
  if ($response.StatusCode -eq 429) {
    Write-Host "Rate limit triggered!" -ForegroundColor Red
    break
  }
}
```

**预期结果：**
- 前 100 次：200 OK
- 第 101 次：429 Too Many Requests

---

## 📋 完整的认证流程

### 1. 用户注册/登录
```javascript
// 前端代码
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'secure-password-123'
  })
});

const data = await response.json();

// 保存 tokens
localStorage.setItem('accessToken', data.token);
localStorage.setItem('refreshToken', data.refreshToken);
```

### 2. API 请求（带 Token）
```javascript
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

### 3. Token 过期时自动刷新
```javascript
async function apiRequest(url, options = {}) {
  let token = localStorage.getItem('accessToken');
  
  // 尝试请求
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
  
  // 如果 401，刷新 token
  if (response.status === 401) {
    const refreshResponse = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: localStorage.getItem('refreshToken')
      })
    });
    
    const refreshData = await refreshResponse.json();
    
    if (refreshData.ok) {
      // 保存新 token
      localStorage.setItem('accessToken', refreshData.token);
      
      // 重试原请求
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${refreshData.token}`
        }
      });
    } else {
      // Refresh token 也过期了，跳转登录
      localStorage.clear();
      window.location.href = '/login.html';
      throw new Error('Session expired');
    }
  }
  
  return response;
}

// 使用示例
const data = await apiRequest('/api/auth/me').then(r => r.json());
```

---

## 🔒 安全特性

### Refresh Token 安全
- ✅ SHA-256 哈希存储（不存储明文）
- ✅ 30 天过期时间
- ✅ 支持撤销（revoked 字段）
- ✅ 绑定用户 ID

### Rate Limit 安全
- ✅ 基于 IP 地址限流
- ✅ 滑动窗口算法
- ✅ 防止暴力破解
- ✅ 自动清理过期记录

### 密码安全
- ✅ PBKDF2-SHA256 哈希
- ✅ 随机盐值
- ✅ 最少 12 字符要求

---

## 📊 API 端点总览

| 方法 | 路径 | 功能 | Rate Limit |
|-----|------|------|-----------|
| POST | `/api/auth/register` | 注册用户 | 15分钟/100次 |
| POST | `/api/auth/login` | 登录 | 15分钟/100次 |
| GET | `/api/auth/me` | 当前用户 | 15分钟/100次 |
| POST | `/api/v1/auth/refresh` | 刷新 Token | 15分钟/100次 |
| GET | `/api/health` | 健康检查 | 无限制 |

---

## 🎯 下一步建议

### 立即测试（今天）
```powershell
# 1. 启动开发服务器
pnpm dev

# 2. 打开浏览器测试
# http://localhost:5173

# 3. 测试注册和登录
# 查看是否返回 refreshToken
```

### 前端集成（明天）
- [ ] 更新 `public/auth.js` 保存 refresh token
- [ ] 实现自动 token 刷新逻辑
- [ ] 添加 token 过期提示

### 监控配置（本周）
- [ ] 配置 rate limit 清理任务
- [ ] 配置 refresh token 清理任务
- [ ] 添加登录日志监控

---

## 📁 已更新的文件总结

| 文件 | 更新内容 |
|-----|---------|
| `functions/api/auth/register.js` | ✅ 添加 refresh token 生成 |
| `functions/api/auth/login.js` | ✅ 添加 refresh token 生成 |
| `functions/api/_middleware.js` | ✅ 全局 rate limit 中间件 |

---

## 🚀 立即执行

```powershell
# 启动开发服务器
pnpm dev
```

然后访问 http://localhost:5173，测试注册功能！

**需要帮助吗？** 告诉我测试结果，或者如果遇到任何问题！🎉
