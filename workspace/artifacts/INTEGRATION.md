# L0 Public Display - Visitor Stats API Integration

## Setup
1. Execute the SQL in `schema.sql` within your Supabase SQL Editor.
2. Move `stats.router.ts` and `stats.service.ts` to the appropriate directories in `server/src/`.
3. In your main Express app file (e.g., `server/src/index.ts`), register the route:
   ```typescript
   import statsRouter from './routes/stats.router';
   app.use('/api/community/stats', statsRouter);
   
## Endpoints
- `POST /api/community/stats/track`: Accepts JSON `{ visitor_id, page_path, region, referrer }`
- `GET /api/community/stats/summary`: Returns visitor metrics and regional data. Query param `?range=daily|weekly|monthly` supported.
