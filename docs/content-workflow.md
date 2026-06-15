# Content Publishing Workflow

## Content States

- `draft`: 本地开发中，不包含在搜索索引或 RSS
- `preview`: 在本地预览构建中可见，不包含在 RSS
- `published`: 包含在文档路由、搜索索引、sitemap 和 RSS
- `archived`: 通过直接 URL 可见，但不包含在 RSS

## Required Fields

Every content entry must have:
- `status`: 'draft' | 'preview' | 'published' | 'archived'
- `type`: 'log' | 'deployment' | 'archive' | 'dev-ai' | 'snippet' | 'academic'

## Filtering Logic

### Search Entries
Only entries with `status: 'published'` or `status: 'archived'` are included in search indexes.

### RSS Feed
Only entries with `status: 'published'` are included in the RSS feed.

### Sitemap
All published and archived content appears in the sitemap.

## Implementation Notes

The `status` field controls visibility across the platform:
- Draft content exists only in source files
- Preview content can be built locally but won't appear in production feeds
- Published content is fully visible and indexed
- Archived content remains accessible by direct URL but is excluded from feeds
