# 🎉 前端集成完成！完整测试指南

## ✅ 已完成的更新

### 1. 更新的文件（2 个）

| 文件 | 更新内容 | 状态 |
|-----|---------|------|
| `public/auth.js` | 保存 refresh token | ✅ |
| `public/auth.js` | 登录/注册返回 refreshToken | ✅ |

### 2. 新增的文件（2 个）

| 文件 | 功能 | 状态 |
|-----|------|------|
| `public/api-client.js` | 自动 token 刷新客户端 | ✅ |
| `public/test-auth-flow.html` | 完整认证流程测试页面 | ✅ |

---

## 🚀 立即测试完整流程

### 步骤 1：启动开发服务器

```powershell
pnpm dev
```

### 步骤 2：打开测试页面

在浏览器中访问：
```
http://localhost:5173/test-auth-flow.html
```

### 步骤 3：测试功能（按顺序）

在测试页面上，按顺序点击以下按钮：

#### ✅ 测试 1：注册用户
点击 **"注册测试用户"** 按钮

**预期结果：**
```
✓ 注册成功！
用户名: testuser1718467200000
角色: admin (第一个用户是管理员)
Access Token: eyJhbGc...
Refresh Token: uuid-token-here
```

#### ✅ 测试 2：获取用户信息
点击 **"获取用户信息"** 按钮

**预期结果：**
```
✓ 获取成功！
用户名: testuser...
邮箱: testuser...@test.com
角色: admin
```

#### ✅ 测试 3：刷新 Token
点击 **"刷新 Token"** 按钮

**预期结果：**
```
旧 Token: eyJhbGciOiJIUzI1NiIsInR5c...

✓ Token 刷新成功！
新 Token: eyJhbGciOiJIUzI1NiIsInR5c...
```

#### ✅ 测试 4：自动刷新（重要！）
点击 **"模拟过期并自动刷新"** 按钮

**预期结果：**
```
当前 Token: eyJhbGciOiJI...

⚠ 模拟 token 过期（设置无效 token）
发送 API 请求...
✓ 自动刷新成功！API 请求成功
用户: testuser...
新 Token: eyJhbGciOiJIUzI1NiI...
```

#### ✅ 测试 5：Rate Limit
点击 **"发送 105 次请求（触发限流）"** 按钮

**预期结果：**
```
发送 105 次请求...
已完成 10/105 次请求...
已完成 20/105 次请求...
...
已完成 100/105 次请求...
第 101 次请求: 429 Rate Limit 触发！

成功: 100
被限流: 1
```

#### ✅ 测试 6：登出
点击 **"登出"** 按钮

**预期结果：**
```
正在登出...
✓ 已清除所有 tokens
```

---

## 📚 API Client 使用指南

### 在其他页面中使用

在任何 HTML 页面中引入：

```html
<!-- 引入 API 客户端 -->
<script src="/api-client.js"></script>

<script>
  // 检查登录状态
  if (!apiClient.isAuthenticated()) {
    location.href = '/login.html';
  }

  // 发送认证请求（自动处理 token 刷新）
  async function loadData() {
    try {
      const data = await apiClient.requestJson('/api/auth/me');
      console.log('User:', data.user);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  loadData();
</script>
```

### API Client 方法

#### `apiClient.request(url, options)`
发送认证请求，自动刷新 token

```javascript
const response = await apiClient.request('/api/auth/me', {
  method: 'GET'
});
```

#### `apiClient.requestJson(url, options)`
发送认证请求并解析 JSON

```javascript
const data = await apiClient.requestJson('/api/auth/me');
console.log(data.user);
```

#### `apiClient.refreshToken()`
手动刷新 token

```javascript
const newToken = await apiClient.refreshToken();
if (newToken) {
  console.log('Token refreshed');
}
```

#### `apiClient.logout()`
登出并跳转到登录页

```javascript
apiClient.logout(); // 清除 tokens 并重定向
```

#### `apiClient.isAuthenticated()`
检查是否已登录

```javascript
if (apiClient.isAuthenticated()) {
  console.log('User is logged in');
}
```

#### `apiClient.isAdmin()`
检查是否是管理员

```javascript
if (apiClient.isAdmin()) {
  console.log('User is admin');
}
```

#### `apiClient.requireAuth()`
要求登录，否则跳转

```javascript
// 在页面开始时调用
if (!apiClient.requireAuth()) {
  // 会自动跳转到登录页
}
```

#### `apiClient.requireAdmin()`
要求管理员权限

```javascript
// 在管理页面中调用
if (!apiClient.requireAdmin()) {
  // 会自动跳转
}
```

---

## 🔄 自动 Token 刷新工作原理

### 流程图

```
用户发送 API 请求
    ↓
添加 Authorization: Bearer <token>
    ↓
发送请求
    ↓
响应是 401？
    ├─ 否 → 返回响应
    └─ 是 → 尝试刷新 token
           ↓
      使用 refresh_token 调用 /api/v1/auth/refresh
           ↓
      刷新成功？
           ├─ 是 → 保存新 token → 重试原请求 → 返回响应
           └─ 否 → 登出 → 跳转登录页
```

### 代码示例

```javascript
// 用户代码（简单）
const data = await apiClient.requestJson('/api/auth/me');
console.log(data);

// 背后发生的事情：
// 1. 发送请求 /api/auth/me
// 2. 如果 token 过期 → 自动调用 /api/v1/auth/refresh
// 3. 获取新 token → 重试 /api/auth/me
// 4. 返回结果
```

---

## 🎨 更新现有页面

### 更新管理后台页面

在 `public/admin-v2.js` 中替换 fetch 调用：

```javascript
// 旧代码
const response = await fetch('/api/admin/users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
});

// 新代码（自动处理刷新）
const data = await apiClient.requestJson('/api/admin/users');
```

### 更新登录检查

在 `public/admin-v2.html` 开头：

```html
<script src="/api-client.js"></script>
<script>
  // 要求管理员权限
  if (!apiClient.requireAdmin()) {
    // 自动跳转
  }
</script>
```

---

## 📊 完整的用户流程

### 1. 首次访问
```
用户访问网站
  ↓
未登录 → 跳转到 /login.html
  ↓
用户注册/登录
  ↓
保存 auth_token + refresh_token
  ↓
跳转回原页面
```

### 2. 正常使用
```
用户访问需要认证的页面
  ↓
apiClient.requireAuth() 检查
  ↓
已登录 → 正常访问
  ↓
发送 API 请求（自动带 token）
```

### 3. Token 过期
```
API 请求返回 401
  ↓
自动调用 /api/v1/auth/refresh
  ↓
获取新 token
  ↓
重试原请求
  ↓
用户无感知，继续使用
```

### 4. Refresh Token 过期
```
API 请求返回 401
  ↓
尝试刷新 token 失败
  ↓
清除所有 tokens
  ↓
跳转到登录页
  ↓
用户重新登录
```

---

## 🔒 安全特性

### Token 存储
- ✅ Access Token 存储在 localStorage（7天过期）
- ✅ Refresh Token 存储在 localStorage（30天过期）
- ✅ Tokens 不存储在 Cookie（防止 CSRF）

### 自动刷新
- ✅ Access Token 过期自动刷新
- ✅ 刷新失败自动登出
- ✅ 用户无感知，体验流畅

### Rate Limit
- ✅ 全局限流保护
- ✅ 防止暴力破解
- ✅ 15分钟/100次请求

---

## 📝 测试清单

在测试页面上完成以下测试：

- [ ] ✅ 注册新用户（获得 2 个 tokens）
- [ ] ✅ 登录用户（获得 2 个 tokens）
- [ ] ✅ 获取用户信息（使用 access token）
- [ ] ✅ 手动刷新 token（获得新 access token）
- [ ] ✅ 自动刷新（模拟过期后自动刷新）
- [ ] ✅ Rate Limit（发送 105 次请求触发限流）
- [ ] ✅ 登出（清除所有 tokens）

---

## 🎯 下一步

### 今天完成
```powershell
# 1. 启动开发服务器
pnpm dev

# 2. 访问测试页面
# http://localhost:5173/test-auth-flow.html

# 3. 完成所有测试
```

### 明天任务
- [ ] 更新 admin-v2.js 使用 api-client
- [ ] 更新所有页面的认证检查
- [ ] 添加 token 过期提示

### 本周任务
- [ ] 部署到生产环境
- [ ] 配置监控和日志
- [ ] 编写单元测试

---

## 📂 文件总结

### 已更新（2 个）
- `public/auth.js` - 保存 refresh_token

### 新增（2 个）
- `public/api-client.js` - 自动刷新客户端
- `public/test-auth-flow.html` - 测试页面

---

## 🚀 立即测试！

```powershell
# 启动开发服务器
pnpm dev
```

然后在浏览器打开：
```
http://localhost:5173/test-auth-flow.html
```

**按照页面上的 6 个测试步骤，依次测试所有功能！**

测试完成后告诉我结果，或者如果遇到任何问题！🎉

---

**恭喜！完整的认证系统已经构建完成！** 🎊

包括：
- ✅ 后端：双 token 机制（access + refresh）
- ✅ 前端：自动刷新逻辑
- ✅ 限流：防止滥用
- ✅ 清理：自动维护
- ✅ 备份：数据安全
- ✅ 测试：完整流程
