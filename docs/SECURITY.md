# 安全检查清单

## 已完成的安全措施

### 1. ✅ 敏感信息保护
- `.gitignore` 已配置，排除所有敏感文件
- 没有硬编码的密钥、密码或 token
- 环境变量使用 Cloudflare Secrets 管理
- 提供了 `.env.example` 作为配置模板

### 2. ✅ 数据库安全
- Database ID 在 `wrangler.toml` 中是公开的（这是安全的，因为需要 Cloudflare 账户权限才能访问）
- JWT_SECRET 通过 `wrangler secret put` 设置，不在代码中

### 3. ✅ 代码审查
- 已扫描所有提交的文件
- 未发现敏感信息泄露
- 所有密钥都通过环境变量或 Cloudflare Secrets 管理

## 生产环境部署前检查

### 必须设置的 Secrets
```bash
# 设置 JWT Secret（生产环境）
wrangler secret put JWT_SECRET

# 如果使用其他外部服务，添加相应的 secrets
# wrangler secret put API_KEY
```

### 环境变量配置
在 `wrangler.toml` 的 `[vars]` 中配置：
- `SITE_ORIGIN`: 生产域名
- `ALLOWED_ORIGINS`: 允许的跨域源

### 数据库设置
```bash
# 1. 创建生产数据库
wrangler d1 create byteforge-production

# 2. 运行迁移
wrangler d1 execute byteforge-production --file=./migrations/001_initial_schema.sql
wrangler d1 execute byteforge-production --file=./migrations/002_add_rate_limits.sql
# ... 运行所有迁移文件

# 3. 更新 wrangler.toml 中的 database_id
```

## 持续安全实践

### 开发时
- ❌ 不要提交 `.env` 文件
- ❌ 不要提交包含真实密钥的配置
- ✅ 使用 `.env.local` 进行本地开发（已在 .gitignore 中）
- ✅ 定期运行 `git status` 检查是否误添加敏感文件

### 代码审查
- 检查 PR 中是否包含敏感信息
- 确保没有硬编码的密钥或密码
- 验证所有外部 API 调用使用环境变量

### 已忽略的敏感文件类型
- `.env*` (除了 .env.example)
- `*.key`, `*.pem`, `*.p12`, `*.pfx` (证书和密钥)
- `*.secret`, `*_secret`, `*-secret`
- `credentials.json`, `service-account.json`
- `*.db`, `*.sqlite*` (本地数据库文件)
- `.dev.vars`, `.wrangler/` (Wrangler 本地开发)

## 如果不慎提交了敏感信息

1. **立即轮换（更换）密钥**
   ```bash
   wrangler secret put JWT_SECRET  # 设置新密钥
   ```

2. **从 Git 历史中删除**
   ```bash
   # 使用 BFG Repo-Cleaner 或 git filter-branch
   git filter-branch --tree-filter 'rm -f path/to/sensitive/file' HEAD
   git push -f origin --all
   ```

3. **通知团队成员重新拉取**

## 检查命令

定期运行以下命令检查是否有敏感信息：
```bash
# 检查是否有未忽略的敏感文件
git status

# 搜索可能的敏感信息
git ls-files | xargs grep -i "password\|secret\|api_key" | grep -v ".md"

# 检查最近的提交
git log -p -S "password" -S "secret"
```
