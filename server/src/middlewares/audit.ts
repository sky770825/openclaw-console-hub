/**
 * Audit middleware — logs POST/PATCH/PUT/DELETE to openclaw_audit_logs
 * Fire-and-forget: never blocks the response.
 */
import { Request, Response, NextFunction } from 'express';
import { hasSupabase, supabase } from '../supabase.js';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE_KEYS = /key|secret|password|token/i;

/** Strip fields whose names contain sensitive keywords */
function sanitizeDiff(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(sanitizeDiff);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!WRITE_METHODS.has(req.method)) {
    return next();
  }

  res.on('finish', () => {
    if (!hasSupabase() || !supabase) return;

    const resourceId =
      (req.params && req.params.id) ||
      (req.body && typeof req.body === 'object' && req.body.id) ||
      null;

    const row = {
      action: req.method,
      resource: req.path,
      resource_id: resourceId ? String(resourceId) : null,
      user_id: 'api-key',
      ip: req.ip || req.socket?.remoteAddress || null,
      diff: sanitizeDiff(req.body) ?? null,
      created_at: new Date().toISOString(),
    };

    // Fire and forget — don't await, don't block
    supabase.from('openclaw_audit_logs').insert([row]).then(({ error }) => {
      if (error) {
        console.error('[audit] Failed to write audit log:', error.message);
      }
    });
  });

  next();
}
