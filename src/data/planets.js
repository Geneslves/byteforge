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
