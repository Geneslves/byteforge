# ByteForge 本地测试指南

## 方式 1：纯前端测试（推荐，最简单）

直接使用 Vite 开发服务器，不测试后端功能：

```bash
# 启动开发服务器
pnpm dev

# 访问
# http://localhost:5173
```

**可测试功能：**
- ✅ 所有页面导航
- ✅ 文档详情页
- ✅ 搜索功能
- ✅ UI 和样式
- ❌ 反馈提交（会失败，但不影响其他功能）
- ❌ 事件跟踪（静默失败）
- ❌ 管理后台（无数据）

---

## 方式 2：使用 Wrangler 完整测试（需要等待安装完成）

### 2.1 等待 Wrangler 安装完成

当前正在安装中... 完成后运行：

```bash
# 验证安装
pnpm wrangler --version

# 或使用 npx
npx wrangler --version
```

### 2.2 创建本地 D1 数据库

```bash
# 创建本地开发数据库
npx wrangler d1 execute byteforge --local --file=./schema/d1.sql

# 注意：添加 --local 参数使用本地开发数据库
```

### 2.3 启动本地服务器

```bash
# 先构建静态资源
pnpm build

# 启动本地开发服务器（带 D1 支持）
pnpm run dev:local

# 或直接使用 npx
npx wrangler pages dev dist --binding DB=byteforge

# 访问
# http://localhost:8788
# http://localhost:8788/admin.html
```

**可测试功能：**
- ✅ 所有页面导航
- ✅ 文档详情页
- ✅ 反馈提交（保存到本地 D1）
- ✅ 事件跟踪
- ✅ 管理后台（显示实时数据）
- ✅ 所有 API 端点

---

## 方式 3：使用 VS Code Live Server（简单预览）

1. 安装 VS Code 扩展 "Live Server"
2. 构建项目：`pnpm build`
3. 右键点击 `dist/index.html` → "Open with Live Server"

**可测试功能：**
- ✅ 静态页面
- ✅ UI 和样式
- ❌ 后端功能

---

## 快速开始建议

### 如果只想看 UI 效果：
```bash
pnpm dev
# 访问 http://localhost:5173
```

### 如果想测试完整功能：
```bash
# 等待 wrangler 安装完成（约 2-5 分钟）
# 然后运行：
pnpm build
pnpm run dev:local
# 访问 http://localhost:8788
```

---

## 常见问题

### Q: 反馈表单提交失败？
A: 如果使用 `pnpm dev`（纯前端），后端不可用是正常的。使用 `pnpm run dev:local` 启用后端。

### Q: 管理后台显示 "网络错误"？
A: 需要使用 `pnpm run dev:local` 启动带后端的服务器。

### Q: Wrangler 安装很慢？
A: 国内网络问题，可以：
1. 等待安装完成（通常 2-10 分钟）
2. 或使用全局安装：`npm install -g wrangler`
3. 或切换到 npm 官方源：`pnpm config set registry https://registry.npmjs.org/`

### Q: 如何验证 Wrangler 是否安装成功？
A: 运行 `pnpm wrangler --version` 或 `npx wrangler --version`

---

## 下一步

一旦 Wrangler 安装完成，你就可以：

1. **本地测试完整功能**
   ```bash
   pnpm build && pnpm run dev:local
   ```

2. **部署到 Cloudflare Pages**
   ```bash
   # 1. 创建远程 D1 数据库
   npx wrangler d1 create byteforge
   
   # 2. 应用 schema
   npx wrangler d1 execute byteforge --file=./schema/d1.sql
   
   # 3. 更新 wrangler.toml 中的 database_id
   
   # 4. 推送到 GitHub（自动部署）
   git push origin main
   ```

---

**当前状态：** Wrangler 正在后台安装中，你可以先使用 `pnpm dev` 预览前端效果。
