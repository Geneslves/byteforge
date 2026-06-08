const logEntries = [
  {
    id: 'byteforge-visual-baseline',
    meta: '2026-06-02',
    title: 'ByteForge visual baseline',
    text: '冻结首页动效、终端导航、粒子光场和中性色温规范。',
    href: '/logs/#byteforge-visual-baseline',
    tags: ['design', 'homepage', 'animation'],
  },
  {
    id: 'interface-clarity-pass',
    meta: '2026-06-02',
    title: 'Interface clarity pass',
    text: '去黄、去灰雾、收紧光晕，让首屏保持明亮但不模糊。',
    href: '/logs/#interface-clarity-pass',
    tags: ['visual-qa', 'contrast', 'motion'],
  },
  {
    id: 'route-shell-initialized',
    meta: '2026-06-02',
    title: 'Route shell initialized',
    text: '为日志、部署和搜索建立第一版内容入口骨架。',
    href: '/logs/#route-shell-initialized',
    tags: ['routing', 'vite', 'content'],
  },
];

const deploymentEntries = [
  {
    id: 'byteforge-home',
    meta: 'WEB',
    title: 'ByteForge Home',
    text: '个人技术博客与作品集首页视觉系统。',
    href: '/',
    tags: ['homepage', 'vite', 'visual-system'],
  },
  {
    id: 'design-baseline',
    meta: 'DOCS',
    title: 'Design Baseline',
    text: '设计规则、禁用回退项和验收标准。',
    href: '/deployments/#design-baseline',
    tags: ['docs', 'baseline', 'qa'],
  },
  {
    id: 'future-modules',
    meta: 'LAB',
    title: 'Future Modules',
    text: '搜索、归档、项目详情和知识库入口。',
    href: '/deployments/#future-modules',
    tags: ['search', 'archive', 'projects'],
  },
];

const archiveEntries = [
  {
    id: 'static-content-routing',
    meta: 'ARCHIVE',
    title: 'Static content routing',
    text: '记录 Vite 单页站点如何生成可刷新访问的静态子路由入口。',
    href: '/search/#static-content-routing',
    tags: ['routing', 'deployment', 'static-site'],
  },
  {
    id: 'search-index-plan',
    meta: 'INDEX',
    title: 'Search index plan',
    text: '后续接入 Pagefind 前，先维护轻量本地内容索引和标签体系。',
    href: '/search/#search-index-plan',
    tags: ['pagefind', 'search', 'tags'],
  },
  {
    id: 'knowledge-archive',
    meta: 'NOTES',
    title: 'Knowledge archive',
    text: '学术、参考文献和知识管理笔记只作为计划记录来源，不直接成为页面依赖。',
    href: '/search/#knowledge-archive',
    tags: ['notes', 'archive', 'knowledge'],
  },
];

const devAiEntries = [
  {
    id: 'claude-workflow',
    meta: '2026-06-08',
    title: 'Claude Code 开发工作流',
    text: '使用 Claude Code 进行项目重构和优化的实践记录。',
    href: '/dev-ai/#claude-workflow',
    tags: ['claude', 'ai', 'workflow'],
  },
  {
    id: 'cursor-integration',
    meta: 'DEV',
    title: 'Cursor AI 编辑器集成',
    text: 'Cursor + Claude 的协同开发环境配置和最佳实践。',
    href: '/dev-ai/#cursor-integration',
    tags: ['cursor', 'ide', 'ai-coding'],
  },
];

export const contentCollections = {
  logs: logEntries,
  deployments: deploymentEntries,
  archive: archiveEntries,
};

const withCollection = (collection, entries) =>
  entries.map((entry) => ({
    ...entry,
    collection,
  }));

export const searchEntries = [
  ...withCollection('logs', logEntries),
  ...withCollection('deployments', deploymentEntries),
  ...withCollection('archive', archiveEntries),
];

export const routeData = {
  '/logs': {
    kicker: '>_ ~/logs',
    title: 'Field Logs',
    summary: '工程、研究、部署和知识归档的连续记录。这里将承载后续文章列表和系列索引。',
    entries: logEntries,
  },
  '/deployments': {
    kicker: '>_ ~/deployments',
    title: 'Deployments',
    summary: '项目、实验和服务的发布索引。后续用于沉淀可访问作品、部署说明和运行状态。',
    entries: deploymentEntries,
  },
  '/search': {
    kicker: '>_ /.search',
    title: 'Search Core',
    summary: '搜索模块骨架已接入。当前使用本地内容索引过滤，后续可替换为 Pagefind 静态索引。',
    search: {
      placeholder: 'grep -r logs deployments archive tags',
      emptyText: 'No matching entries in local index.',
    },
    entries: searchEntries,
  },
  '/dev-ai': {
    kicker: '>_ ~/dev-ai',
    title: 'Dev & AI',
    summary: '开发工具、AI 辅助编程和工作流优化的实践与探索。',
    entries: devAiEntries,
  },
};

// 星球到路由的映射表 - 添加新功能时在这里添加映射
export const planetRoutes = {
  'Logs': '/logs',
  'Deployments': '/deployments',
  'Search Core': '/search',
  'Dev and AI': '/dev-ai',  // 测试自动绑定
  // 未来功能在此添加，例如：
  // 'Snippets': '/snippets',
};
