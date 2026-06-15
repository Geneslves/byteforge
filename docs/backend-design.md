# ByteForge Backend Design

## Architecture

ByteForge uses **Cloudflare Pages Functions** for serverless API endpoints and **Cloudflare D1** for database storage.

### Key Components

- **Functions**: Serverless API handlers in `functions/api/`
- **Database**: Cloudflare D1 (SQLite) with schema in `schema/d1.sql`
- **Storage**: All data stored in D1, no external services required

## API Endpoints

### GET /api/health

Health check endpoint for monitoring service availability.

**Response:**
```json
{
  "ok": true,
  "service": "byteforge-api",
  "version": "1.0.0",
  "timestamp": "2026-06-15T12:00:00.000Z"
}
```

### POST /api/feedback

Submit user feedback for a specific page or document.

**Request:**
```json
{
  "routePath": "/logs/",
  "documentId": "performance-optimization-complete",
  "message": "Great article!"
}
```

**Response:**
```json
{
  "ok": true,
  "id": "uuid-here",
  "created_at": "2026-06-15T12:00:00.000Z"
}
```

**Validation:**
- `message`: 2-1000 characters
- `routePath`: required string
- `documentId`: optional string

### POST /api/content-events

Track content interaction events (views, clicks, searches).

**Request:**
```json
{
  "routePath": "/documents/spa-navigation-fixed/",
  "documentId": "spa-navigation-fixed",
  "eventType": "view"
}
```

**Valid event types:**
- `view`: Page view
- `click`: Link or button click
- `search`: Search query
- `share`: Content shared

**Response:**
```json
{
  "ok": true,
  "id": "uuid-here",
  "created_at": "2026-06-15T12:00:00.000Z"
}
```

## Database Schema

### Table: feedback

Stores user feedback submitted through the feedback form.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| document_id | TEXT | Optional document ID |
| route_path | TEXT | Route where feedback was submitted |
| message | TEXT | User's feedback message |
| created_at | TEXT | ISO 8601 timestamp |
| user_agent | TEXT | Browser user agent string |

### Table: content_events

Tracks content interaction events for analytics.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| document_id | TEXT | Optional document ID |
| route_path | TEXT | Route where event occurred |
| event_type | TEXT | Type of event (view, click, search, share) |
| created_at | TEXT | ISO 8601 timestamp |
| user_agent | TEXT | Browser user agent string |

## Deployment

### Setup D1 Database

```bash
# Create D1 database
wrangler d1 create byteforge

# Apply schema
wrangler d1 execute byteforge --file=./schema/d1.sql
```

### Configure wrangler.toml

```toml
name = "byteforge"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "byteforge"
database_id = "your-database-id-here"
```

### Deploy

```bash
# Deploy to Cloudflare Pages
git push origin main
```

## Security

- CORS enabled for all endpoints
- No authentication required (public feedback)
- Input validation on all fields
- SQL injection prevention via prepared statements
- Rate limiting handled by Cloudflare

## Future Enhancements

- Admin dashboard to view feedback
- Email notifications for new feedback
- Analytics aggregation queries
- Content popularity rankings
- User voting system
