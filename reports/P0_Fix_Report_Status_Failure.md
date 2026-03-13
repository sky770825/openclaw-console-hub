# P0 Fix Report: Status Update Silent Failure (API False Success)

## Issue Diagnosis
The system reported success (200 OK) during task status updates, but changes were not persisting in the database. 
- **Cause A**: Missing `.select()` in the Supabase update chain resulted in the client not receiving the confirmation of the write.
- **Cause B**: The API likely returned the request payload as a "success" response without verifying if any rows were actually modified in the DB.
- **Cause C**: Supabase RLS policies might be silently ignoring the update (returning 0 rows).

## Fixes Implemented
1.  **Enforced DB Synchronization**: Modified `openclaw-tasks.ts` to include `.select().single()` on the update operation. This forces Supabase to return the actual state of the row after the update.
2.  **Hardened Verification**: Updated the route's error handling to treat `data == null` as an error. If the DB update fails to modify a row (e.g., due to RLS or an invalid ID), the API will no longer return 200 OK.
3.  **Audit Trail**: Created a backup of the original route at `/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts.bak`.

## Files Modified
- `/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts`

## Verification
- Use the generated script at `/Users/sky770825/.openclaw/workspace/scripts/verify_task_fix.py` to test the endpoint.
- If updates still do not reflect in the DB despite a 200 OK response now, check the **Supabase RLS Policies** for the `tasks` table to ensure the `service_role` or `authenticated` user has `UPDATE` permissions.
