import { archiveIndex, searchEntries, searchEntriesByCollection, searchFacets } from './content-model.js';

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
  collection === 'all' ? searchEntries : searchEntriesByCollection[collection] || [];

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
