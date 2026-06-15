# ByteForge

ByteForge 是一个基于 Vite 的个人技术站点。当前版本以强视觉首页为入口，使用原生 JavaScript 实现轻量 SPA 内容路由、本地搜索、主题切换和静态子路由入口。

## 当前技术栈

- 构建工具：Vite 6
- 运行时：Vanilla JavaScript + 原生 Web API
- 样式：CSS Variables + 原生 CSS
- 路由：History API + 构建期静态入口生成
- 内容来源：`src/data/content.js`
- 行为模块：`src/modules/`
- 样式入口：`src/styles/`
- 静态音频：`public/audio/ink-wash-terminal.mp3`

## 当前路由

路由配置的唯一来源是 `src/data/content.js` 里的 `routeData`。

- `/logs/`
- `/deployments/`
- `/archive/`
- `/search/`
- `/dev-ai/`
- `/snippets/`
- `/academic/`

每个内容条目现在也会实体化为独立详情页，路径为 `/documents/<id>/`。列表页和搜索页只负责发现与过滤，真正的可索引正文、Pagefind 预备标记和 RSS item 来源都落在详情页上。

`scripts/build.js` 会读取 `routeData`，并把 `dist/index.html` 复制到每个路由目录下，保证静态托管环境中可以直接刷新访问子路由。

## 搜索索引

搜索数据由 `src/data/content.js` 统一导出，包含 `searchEntries`、`contentDocuments`、`documentRoutes`、`rssItems`、`searchFacets`、`searchIndexDocuments`、`archiveIndex` 和 `pagefindIndexConfig`。当前 `/search/` 使用本地索引完成关键词、collection、category、series 和 tag 过滤；`/archive/` 使用同一份索引按 timeline、category、series 和 tag 聚合浏览；构建时会生成 `dist/search-index.json` 和 `dist/rss.xml`，作为后续接入 Pagefind 与 RSS 发布的稳定数据出口。

## 常用命令

```powershell
# 开发
pnpm dev                    # 启动开发服务器
pnpm stop                   # 停止开发服务器

# 检查与构建
pnpm run check              # 完整检查流程
pnpm build                  # 生产构建
pnpm run check:project      # 项目结构检查
pnpm run check:content      # 内容数据检查
pnpm run check:routes       # 路由一致性检查
pnpm run check:static       # 静态产物检查
pnpm run check:source       # 源码质量检查
pnpm run check:visual       # 视觉回归检查
pnpm run audit              # 依赖安全审计
pnpm run clean              # 清理构建产物

# 预览
pnpm preview                # 预览生产构建
```

`pnpm run check` 会按顺序执行项目结构检查、内容数据检查、生产构建、路由/head 检查、静态构建产物烟测、源码质量检查和浏览器级视觉回归检查。`pnpm run check:content` 会检查用户可见内容是否出现乱码，并验证内容集合、路由数据、搜索 facets、Pagefind 预备配置和搜索索引文档。`pnpm run check:static` 会检查构建后的 `search-index.json`。`pnpm run check:visual` 会用本机 Chrome/Edge 检查构建后的关键路由在桌面和移动视口下是否加载样式、显示内容面板、没有明显空白或横向溢出，并验证搜索过滤控件和 URL 状态恢复。`pnpm run audit` 固定使用官方 npm registry 做依赖安全审计，避免本地镜像缺少 audit endpoint。`pnpm run clean` 用于删除 `dist/`、本地调试 profile、临时 pid 和开发/预览日志等可再生成文件。

构建脚本本体：

```powershell
node scripts/build.js
```

如果当前环境运行 `pnpm` 有本地权限问题，可以在依赖已安装后直接启动 Vite：

```powershell
node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173
```

## 后台运行（关闭命令窗口后继续运行）

### 方法 1：使用 PM2（推荐）

PM2 是专业的 Node.js 进程管理工具，支持后台运行、自动重启、日志管理等功能。

#### 安装 PM2

```bash
npm install -g pm2
```

#### 开发模式

```bash
# 启动开发服务器（后台运行）
pm2 start ecosystem.config.cjs --only byteforge-dev

# 查看实时日志
pm2 logs byteforge-dev

# 停止
pm2 stop byteforge-dev

# 重启
pm2 restart byteforge-dev

# 查看状态
pm2 list
```

#### 预览模式（需先构建）

```bash
# 先构建生产版本
pnpm build

# 启动预览服务器（后台运行）
pm2 start ecosystem.config.cjs --only byteforge-preview

# 查看日志
pm2 logs byteforge-preview
```

#### 常用 PM2 命令

```bash
# 查看所有进程状态
pm2 list

# 查看详细信息
pm2 show byteforge-dev

# 停止所有 ByteForge 进程
pm2 stop ecosystem.config.cjs

# 删除进程
pm2 delete byteforge-dev

# 保存进程列表（开机自启动）
pm2 save
pm2 startup
```

### 方法 2：使用 Windows 后台启动

如果不想安装 PM2，可以使用 PowerShell 后台启动：

```powershell
# 后台启动（关闭窗口后继续运行）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm dev" -WindowStyle Hidden

# 停止服务器（通过端口查找并停止）
pnpm stop
```

或者创建一个 VBS 脚本 `start-dev-hidden.vbs`：

```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell -NoProfile -ExecutionPolicy Bypass -Command ""cd 'e:\Code\byteforge'; pnpm dev""", 0, False
```

双击运行即可在后台启动，完全无窗口。

### 停止后台服务器

无论使用哪种方法启动，都可以通过以下方式停止：

```powershell
# 方法 1：使用项目脚本（推荐）
pnpm stop

# 方法 2：直接运行停止脚本
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/stop-dev.ps1

# 方法 3：手动查找并停止进程
netstat -ano | findstr :5173
taskkill /PID <进程ID> /F

# 方法 4：使用 PM2（如果用 PM2 启动）
pm2 stop byteforge-dev
```

## 内容模型

`src/data/content.js` 包含以下核心数据：

- `contentCollections`：按 logs、deployments、archive、dev-ai、snippets、academic 分组的内容集合。
- `searchEntries`：`/search/` 使用的本地搜索索引。
- `contentDocuments` / `documentRoutes`：每个条目的详情页实体和 `/documents/<id>/` 路由映射。
- `rssItems`：从详情页实体派生的 RSS feed 条目数据。
- `searchFacets`：collection、category、series 和 tag 过滤项。
- `archiveIndex`：`/archive/` 使用的 timeline、category、series 和 tag 聚合索引。
- `routeDefinitions` / `routeData`：内容面板的路由标题、摘要、条目和专题数据。
- `planetRoutes`：首页轨道节点到内容路由、状态和集合元数据的映射。

新增内容条目时，优先更新 `contentCollections` 中对应集合。`searchEntries`、`contentDocuments`、`documentRoutes`、`searchIndexDocuments` 和 `rssItems` 会从集合数据自动派生；新增顶层内容路由时再更新 `routeData`。

## 新增页面与星球绑定

1. 在 `src/data/content.js` 新增内容条目数组。
2. 在 `routeData` 中新增路由，例如 `/snippets`。
3. 在 `planetRoutes` 中把 HTML 星球的 `aria-label` 绑定到该路由。
4. 如果是新星球，还需要在 `index.html` 的 `.orbit-layer` 中添加对应按钮。

示例：

```js
export const planetRoutes = {
  'Snippets': {
    route: '/snippets',
    state: 'beta',
    collection: 'snippets',
  },
};
```

`state` 控制星球显示和交互状态：

- `ready`：正式可点击入口。
- `beta`：可点击，但显示为试验/预览状态。
- `future`：未来功能，不可点击。
- `disabled`：临时禁用，不可点击。

页面构建和一致性检查：

```powershell
pnpm build
pnpm run check:project
pnpm run check:routes
```

## 文档索引

- `docs/implementation-plan.md`：当前实现状态和下一阶段工作。
- `docs/byteforge-design-baseline.md`：视觉、动效和交互基线。
- `ROADMAP.md`：长期产品路线图和后端规划。

## 基础验证

```powershell
node scripts/build.js
```

预期构建产物应包含 `/logs/`、`/deployments/`、`/archive/`、`/search/`、`/dev-ai/`、`/snippets/`、`/academic/` 七个静态入口、每个 `/documents/<id>/` 详情页入口，并包含 `og-image.svg`、`search-index.json` 和 `rss.xml`。
