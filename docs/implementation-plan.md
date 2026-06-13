# ByteForge Implementation Plan

版本：2026-06-09
状态：前端内容骨架已落地，后续进入内容规模化与搜索增强

## 目标

将 `.superpowers` 预览稿中的 v17 视觉系统冻结为正式首页设计基线，并迁移到项目真实入口。后续在这个基线上继续实现博客、项目、搜索和内容系统。

## 阶段 1：首页视觉基线落地

状态：已完成

任务：

- 建立正式设计基线文档。
- 将 v17 首屏动效迁移到项目 `index.html`、`src/styles/style.css`、`src/main.js`。
- 修复当前项目乱码文案。
- 保留 Boot Sequence、鼠标视差、入口光点、终端导航和粒子光效。
- 运行构建验证。

验收：

- `pnpm build` 或 `node scripts/build.js` 通过。
- 首页首屏显示 ByteForge v17 基线。
- 无 `.core-comets` 旋转流星残留。
- 入口光点点击、悬停、返回逻辑正常。
- 浏览器图标已换为透明非方形熔炉光核图标。
- 首页已完成中性色温、去黄、去灰雾和清晰化调整。

## 阶段 2：内容站基础结构

状态：已完成基础骨架

任务：

- 从 Vite 单页升级为 Astro 内容站，或在现有 Vite 基础上先建立内容路由。
- 建立 `/logs`、`/deployments`、`/search`、`/dev-ai`、`/snippets`、`/academic` 入口。
- 增加文章、项目、知识归档和开发工具记录的数据模型。
- 保留首页动效作为全站视觉基线。

当前实施策略：

- 先在现有 Vite 基础上建立轻量内容路由骨架。
- `/logs`、`/deployments`、`/search`、`/dev-ai`、`/snippets`、`/academic` 接入同一套终端式内容面板。
- 后续内容规模稳定后，再评估是否迁移到 Astro 内容集合。

本轮进展：

- 已在首页视觉系统内加入 `data-route-view` 内容面板。
- 已为 `/logs`、`/deployments`、`/search`、`/dev-ai`、`/snippets`、`/academic` 建立第一版路由数据和渲染逻辑。
- 已将内容路由数据抽离到 `src/data/content.js`，作为文章、项目、归档数据模型的起点。
- 已建立本地内容索引，条目支持 `id`、`href`、`tags` 和 `collection` 字段。
- `/search/` 已支持基于标题、正文、标签和集合名的即时过滤，支持 `?q=` 查询参数，并补充空状态展示。
- `dev-ai` 条目已纳入本地搜索索引。
- 构建后静态路由入口由 `routeData` 自动生成，`/logs/`、`/deployments/`、`/search/`、`/dev-ai/`、`/snippets/`、`/academic/` 可在静态托管环境中直接刷新访问。
- `/academic` 已作为水墨纸页风格的第二个 beta 界面，使用 `theme: 'ink'` 路由主题。
- 星球入口由 `planetRoutes` 对象配置驱动，支持 `route`、`state` 和 `collection` 元数据。
- 导航 active 状态和闪烁光标会随当前路径移动。
- 内容卡片内同站链接通过 SPA 导航处理，保留 hash 定位。
- 内容路由进入时跳过 Boot Sequence，保留背景动效作为全站视觉基线。
- 已补充真实存在的 `og-image.svg`，避免社交分享图 404。
- 已将前端行为拆分到 `src/modules/`，样式迁移到 `src/styles/`，静态音频迁移到 `public/audio/`。
- 已添加背景音乐开关，默认关闭，用户点击后播放 `public/audio/ink-wash-terminal.mp3`。

## 阶段 3：搜索与归档

状态：本地搜索已接入，静态全文搜索待增强

任务：

- 接入 Pagefind 或同等静态搜索。
- 建立标签、系列、项目索引。
- 将 SiYuan 笔记仅作为计划和实现过程记录来源，不直接作为页面内容依赖。

## 阶段 4：性能与可访问性

状态：基础修复已完成，自动化验收待补充

任务：

- 保持 reduced-motion 体验。
- 检查移动端首屏文本与导航布局。
- 为未来页面切换补充终端式转场。
- 增加 Lighthouse、可访问性和构建一致性检查。
- 不劫持浏览器默认 `Tab` 导航；星球入口保留真实 `aria-label`。
- `pnpm run check:routes` 用于检查路由、星球配置、sitemap 和构建产物一致性。
- `pnpm run check:project` 用于检查项目目录结构、模块拆分和音频资产位置。
