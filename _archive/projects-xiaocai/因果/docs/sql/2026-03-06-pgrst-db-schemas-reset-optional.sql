-- 2026-03-06: optional shared-DB PostgREST config cleanup
-- Run this only after confirming Supabase Dashboard -> API Settings -> Exposed schemas
-- already includes `causelaw_yinguo_v1`.
-- Purpose: remove old role-level override that may clobber other schemas in a shared DB.

alter role authenticator reset pgrst.db_schemas;
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
