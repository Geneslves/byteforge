const logEntries = [
  {
    id: 'performance-optimization-complete',
    meta: '2026-06-09',
    title: '性能优化完成',
    text: '完成构建配置优化、移动端适配和渲染性能提升，核心构建产物 gzip 体积约 20 KB。',
    href: '/logs/#performance-optimization-complete',
    tags: ['performance', 'vite', 'optimization'],
  },
  {
    id: 'mobile-experience-enhanced',
    meta: '2026-06-09',
    title: '移动端体验增强',
    text: '优化触摸交互、降低流星雨频率 40%、支持 reduced-motion 偏好设置。',
    href: '/logs/#mobile-experience-enhanced',
    tags: ['mobile', 'a11y', 'ux'],
  },
  {
    id: 'spa-navigation-fixed',
    meta: '2026-06-09',
    title: 'SPA 导航修复',
    text: '恢复无刷新路由跳转，支持浏览器前进后退，使用 history.pushState 实现真正的单页应用。',
    href: '/logs/#spa-navigation-fixed',
    tags: ['spa', 'routing', 'fix'],
  },
  {
    id: 'visual-effects-system',
    meta: '2026-06-09',
    title: '视觉效果系统',
    text: '实现流星雨动画、主题切换波纹、键盘导航和加载进度条等视觉增强功能。',
    href: '/logs/#visual-effects-system',
    tags: ['animation', 'theme', 'effects'],
  },
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
    id: 'byteforge-home-v2',
    meta: 'WEB',
    title: 'ByteForge Home v2.0',
    text: '完整的个人技术站点：流星雨背景、双主题系统、SPA 路由、移动端优化。',
    href: '/',
    tags: ['homepage', 'vite', 'visual-system', 'production'],
  },
  {
    id: 'performance-benchmark',
    meta: 'METRICS',
    title: 'Performance Benchmark',
    text: '核心 HTML/CSS/JS 构建产物 gzip 约 20 KB，移动端按 reduced-motion 与低密度动效优化。',
    href: '/deployments/#performance-benchmark',
    tags: ['performance', 'lighthouse', 'metrics'],
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
    id: 'tech-stack',
    meta: 'TECH',
    title: 'Tech Stack',
    text: 'Vite 6 + Vanilla JS + CSS Variables，无框架依赖，原生 Web 标准。',
    href: '/deployments/#tech-stack',
    tags: ['vite', 'vanilla-js', 'web-standards'],
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
    id: 'meteor-shower-implementation',
    meta: '2026-06-09',
    title: '流星雨动画实现',
    text: '使用 clip-path 和 drop-shadow 创建真实的锥形拖尾和光晕包络效果。',
    href: '/archive/#meteor-shower-implementation',
    tags: ['css', 'animation', 'visual-effects'],
  },
  {
    id: 'spa-routing-pattern',
    meta: '2026-06-09',
    title: 'SPA 路由模式',
    text: 'history.pushState + popstate 实现无刷新导航，静态路由生成支持直接访问。',
    href: '/archive/#spa-routing-pattern',
    tags: ['spa', 'routing', 'history-api'],
  },
  {
    id: 'theme-system-design',
    meta: '2026-06-09',
    title: '主题系统设计',
    text: 'CSS 变量 + data 属性 + localStorage 实现深色/亮色双主题，防闪烁内联脚本。',
    href: '/archive/#theme-system-design',
    tags: ['theme', 'css-variables', 'dark-mode'],
  },
  {
    id: 'static-content-routing',
    meta: 'ARCHIVE',
    title: 'Static content routing',
    text: '记录 Vite 单页站点如何生成可刷新访问的静态子路由入口。',
    href: '/archive/#static-content-routing',
    tags: ['routing', 'deployment', 'static-site'],
  },
  {
    id: 'search-index-plan',
    meta: 'INDEX',
    title: 'Search index plan',
    text: '后续接入 Pagefind 前，先维护轻量本地内容索引和标签体系。',
    href: '/archive/#search-index-plan',
    tags: ['pagefind', 'search', 'tags'],
  },
  {
    id: 'knowledge-archive',
    meta: 'NOTES',
    title: 'Knowledge archive',
    text: '学术、参考文献和知识管理笔记只作为计划记录来源，不直接成为页面依赖。',
    href: '/archive/#knowledge-archive',
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

const snippetsEntries = [
  {
    id: 'route-planet-binding',
    meta: 'PATTERN',
    title: 'Route and planet binding',
    text: '新增页面时先配置 routeData，再用 planetRoutes 绑定星球 route、state 和 collection。',
    href: '/snippets/#route-planet-binding',
    tags: ['routing', 'planet', 'state'],
  },
  {
    id: 'static-route-check',
    meta: 'SCRIPT',
    title: 'Static route consistency check',
    text: '使用 check:routes 验证路由、星球配置、sitemap 和构建产物是否一致。',
    href: '/snippets/#static-route-check',
    tags: ['scripts', 'build', 'qa'],
  },
  {
    id: 'search-query-url',
    meta: 'UX',
    title: 'Search query URL',
    text: '搜索页支持 ?q= 查询参数，便于分享和刷新后保留过滤状态。',
    href: '/snippets/#search-query-url',
    tags: ['search', 'url', 'ux'],
  },
];

const academicEntries = [
  {
    id: 'som-dual-spectrum-paper',
    meta: 'PAPER',
    title: 'SOM 双光谱研究笔记',
    text: '整理近红外与拉曼双光谱建模、特征融合和实验结论，作为课程论文与后续实验复盘入口。',
    href: '/academic/#som-dual-spectrum-paper',
    tags: ['som', 'spectroscopy', 'paper'],
  },
  {
    id: 'method-notes-index',
    meta: 'METHOD',
    title: '方法札记索引',
    text: '沉淀特征处理、模型验证、误差分析和可复现实验记录，避免研究过程散落在临时文件中。',
    href: '/academic/#method-notes-index',
    tags: ['method', 'experiment', 'notes'],
  },
  {
    id: 'reference-reading-queue',
    meta: 'READING',
    title: '参考文献阅读队列',
    text: '记录待读论文、关键结论和可复用引用，后续可迁移到正式文献管理或静态内容集合。',
    href: '/academic/#reference-reading-queue',
    tags: ['references', 'reading', 'archive'],
  },
];

export const contentCollections = {
  logs: logEntries,
  deployments: deploymentEntries,
  archive: archiveEntries,
  'dev-ai': devAiEntries,
  snippets: snippetsEntries,
  academic: academicEntries,
};

export const collectionMetadata = {
  logs: { label: 'Logs', category: 'Engineering', series: 'Build Journal' },
  deployments: { label: 'Deployments', category: 'Projects', series: 'Release Notes' },
  archive: { label: 'Archive', category: 'Knowledge', series: 'Knowledge Archive' },
  'dev-ai': { label: 'Dev & AI', category: 'Workflow', series: 'AI Development' },
  snippets: { label: 'Snippets', category: 'Patterns', series: 'Engineering Snippets' },
  academic: { label: 'Academic', category: 'Research', series: 'Academic Notes' },
};

const buildSearchableText = (entry, metadata, collection) => [
  entry.meta,
  entry.title,
  entry.text,
  metadata.label,
  metadata.category,
  metadata.series,
  collection,
  ...(entry.tags || []),
].join(' ').toLowerCase();

const withCollection = (collection, entries) =>
  entries.map((entry) => ({
    ...entry,
    collection,
    category: entry.category || collectionMetadata[collection].category,
    series: entry.series || collectionMetadata[collection].series,
    searchableText: buildSearchableText(entry, collectionMetadata[collection], collection),
  }));

export const searchEntries = [
  ...withCollection('logs', logEntries),
  ...withCollection('deployments', deploymentEntries),
  ...withCollection('archive', archiveEntries),
  ...withCollection('dev-ai', devAiEntries),
  ...withCollection('snippets', snippetsEntries),
  ...withCollection('academic', academicEntries),
];

const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const toFacetOptions = (values) => uniqueSorted(values).map((value) => ({ id: value, label: value }));

export const searchFacets = {
  collections: [
    { id: 'all', label: 'All collections' },
    ...Object.entries(collectionMetadata).map(([id, metadata]) => ({ id, label: metadata.label })),
  ],
  categories: toFacetOptions(searchEntries.map((entry) => entry.category)),
  series: toFacetOptions(searchEntries.map((entry) => entry.series)),
  tags: toFacetOptions(searchEntries.flatMap((entry) => entry.tags || [])),
};

export const pagefindIndexConfig = {
  version: 1,
  rootSelector: '[data-pagefind-body]',
  bundlePath: '/pagefind/pagefind.js',
  filters: ['collection', 'category', 'series', 'tag'],
  sort: { default: 'title' },
};

export const searchIndexDocuments = searchEntries.map((entry) => ({
  id: entry.id,
  url: entry.href,
  title: entry.title,
  excerpt: entry.text,
  collection: entry.collection,
  category: entry.category,
  series: entry.series,
  tags: entry.tags,
  content: entry.searchableText,
  pagefind: {
    url: entry.href.split('#')[0],
    meta: {
      title: entry.title,
      collection: entry.collection,
      category: entry.category,
      series: entry.series,
    },
    filters: {
      collection: entry.collection,
      category: entry.category,
      series: entry.series,
      tag: entry.tags,
    },
  },
}));

const groupEntries = (entries, getKey) =>
  Object.entries(entries.reduce((groups, entry) => {
    const key = getKey(entry);
    if (!key) return groups;
    groups[key] = groups[key] || [];
    groups[key].push(entry);
    return groups;
  }, {}))
    .map(([label, items]) => ({ label, count: items.length, items }))
    .sort((a, b) => a.label.localeCompare(b.label));

const getTimelineBucket = (entry) => {
  const year = entry.meta.match(/\d{4}/)?.[0];
  return year || entry.meta;
};

export const archiveIndex = {
  timeline: groupEntries(searchEntries, getTimelineBucket).sort((a, b) => b.label.localeCompare(a.label)),
  categories: groupEntries(searchEntries, (entry) => entry.category),
  series: groupEntries(searchEntries, (entry) => entry.series),
  tags: groupEntries(
    searchEntries.flatMap((entry) => (entry.tags || []).map((tag) => ({ ...entry, archiveTag: tag }))),
    (entry) => entry.archiveTag
  ),
};

export const routeDefinitions = [
  {
    path: '/logs',
    collection: 'logs',
    kicker: '>_ ~/logs',
    title: 'Field Logs',
    summary: '工程、研究、部署和知识归档的连续记录。这里将承载后续文章列表和系列索引。',
    description: '按时间整理站点演进、工程修复、视觉基线和内容系统建设记录。',
  },
  {
    path: '/deployments',
    collection: 'deployments',
    kicker: '>_ ~/deployments',
    title: 'Deployments',
    summary: '项目、实验和服务的发布索引。后续用于沉淀可访问作品、部署说明和运行状态。',
    description: '汇总已经落地或进入验证期的站点、文档、指标和工程模块。',
  },
  {
    path: '/archive',
    collection: 'archive',
    kicker: '>_ ~/archive',
    title: 'Archive Map',
    summary: '按时间线、分类、系列和标签整理站点内容，让搜索之外也有可浏览的知识地图。',
    description: '这里聚合工程记录、项目索引、知识归档、AI 工作流、代码片段和学术笔记的浏览入口。',
    archive: archiveIndex,
  },
  {
    path: '/search',
    collection: 'all',
    kicker: '>_ /.search',
    title: 'Search Core',
    summary: '搜索模块骨架已接入。当前使用本地内容索引过滤，后续可替换为 Pagefind 静态索引。',
    description: '跨 logs、deployments、archive、dev-ai、snippets 和 academic 的本地轻量索引。',
    search: {
      placeholder: 'grep -r logs deployments archive tags',
      emptyText: 'No matching entries in local index.',
      filters: searchFacets,
    },
  },
  {
    path: '/dev-ai',
    collection: 'dev-ai',
    kicker: '>_ ~/dev-ai',
    title: 'Dev & AI',
    summary: '开发工具、AI 辅助编程和工作流优化的实践与探索。',
    description: '记录 AI 编程工具、编辑器协作方式和自动化开发流程的实践入口。',
  },
  {
    path: '/snippets',
    collection: 'snippets',
    kicker: '>_ ~/snippets',
    title: 'Snippets',
    summary: '小型实现模式、配置片段和工程约束的快速索引。当前作为新页面与星球状态绑定的 beta 试点。',
    description: '存放可复用工程片段、配置约定和未来文章可展开的实现模式。',
  },
  {
    path: '/academic',
    collection: 'academic',
    kicker: '>_ ~/academic',
    title: 'Academic Notes',
    summary: '论文、方法与研究札记。这个界面采用现代纸页和水墨气质，承载课程论文、实验复盘与文献阅读线索。',
    description: '聚合论文线索、方法笔记、实验复盘和文献阅读队列。',
    theme: 'ink',
  },
];

const getRouteEntries = (collection) =>
  collection === 'all' ? searchEntries : contentCollections[collection] || [];

const getRouteTags = (entries) =>
  [...new Set(entries.flatMap((entry) => entry.tags || []))].sort((a, b) => a.localeCompare(b));

export const routeData = Object.fromEntries(routeDefinitions.map((definition) => {
  const entries = getRouteEntries(definition.collection);
  const tags = getRouteTags(entries);

  return [
    definition.path,
    {
      ...definition,
      entries,
      stats: {
        entries: entries.length,
        tags: tags.length,
      },
      topTags: tags.slice(0, 6),
    },
  ];
}));

// 星球配置表 - 添加新功能时优先在 routeData 中建路由，再在这里绑定星球状态。
export const planetRoutes = {
  'Infrastructure': { route: null, state: 'future', collection: 'infrastructure' },
  'Logs': { route: '/logs', state: 'ready', collection: 'logs' },
  'Dev and AI': { route: '/dev-ai', state: 'ready', collection: 'dev-ai' },
  'Snippets': { route: '/snippets', state: 'beta', collection: 'snippets' },
  'Academic': { route: '/academic', state: 'beta', collection: 'academic' },
  'Deployments': { route: '/deployments', state: 'ready', collection: 'deployments' },
  'Search': { route: '/search', state: 'ready', collection: 'search' },
  'Knowledge Base': { route: '/archive', state: 'ready', collection: 'archive' },
  'Toolbox': { route: null, state: 'future', collection: 'toolbox' },
  'Lab Notes': { route: null, state: 'future', collection: 'lab-notes' },
  'Changelog': { route: null, state: 'future', collection: 'changelog' },
};
