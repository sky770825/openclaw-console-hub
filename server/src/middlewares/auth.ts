/**
 * API 认证中间件
 * 支持三层权限: read / write / admin
 */

import { Request, Response, NextFunction } from 'express';

// ========== 环境变量配置 ==========

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim();
const OPENCLAW_ENFORCE_WRITE_AUTH =
  process.env.OPENCLAW_ENFORCE_WRITE_AUTH !== 'false';
const OPENCLAW_ENFORCE_READ_AUTH =
  process.env.OPENCLAW_ENFORCE_READ_AUTH === 'true';
const OPENCLAW_READ_KEY = process.env.OPENCLAW_READ_KEY?.trim();
const OPENCLAW_WRITE_KEY = process.env.OPENCLAW_WRITE_KEY?.trim();
const OPENCLAW_ADMIN_KEY = process.env.OPENCLAW_ADMIN_KEY?.trim();

// ========== 权限级别 ==========

export type AccessLevel = 'read' | 'write' | 'admin' | 'none';

// 构建权限集合
const readKeySet = new Set<string>();
const writeKeySet = new Set<string>();
const adminKeySet = new Set<string>();

for (const key of [OPENCLAW_API_KEY, OPENCLAW_READ_KEY]) {
  if (key) readKeySet.add(key);
}
for (const key of [OPENCLAW_API_KEY, OPENCLAW_WRITE_KEY]) {
  if (key) {
    writeKeySet.add(key);
    readKeySet.add(key);
  }
}
for (const key of [OPENCLAW_API_KEY, OPENCLAW_ADMIN_KEY]) {
  if (key) {
    adminKeySet.add(key);
    writeKeySet.add(key);
    readKeySet.add(key);
  }
}

// ========== 辅助函数 ==========

/**
 * 从请求中读取 API Key
 * 支持两种方式:
 * 1. x-api-key header
 * 2. Authorization: Bearer <key>
 */
export function readApiKeyFromRequest(req: Request): string | null {
  const headerKey = req.header('x-api-key')?.trim();
  if (headerKey) return headerKey;
  const auth = req.header('authorization')?.trim();
  if (!auth) return null;
  const match = auth.match(/^bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * 根据请求路径和方法确定所需的权限级别
 */
export function requiredAccessLevel(req: Request): AccessLevel {
  const path = req.path;
  const method = req.method.toUpperCase();

  // 輕量 status/health 端點免 auth（方便儀表板載入）
  if (method === 'GET' && /\/openclaw\/(autopilot\/status|board-health)\b/.test(path)) {
    return 'none';
  }

  // Admin-only endpoints
  if (path === '/features' && method === 'PATCH') return 'admin';
  if (
    path === '/openclaw/restart-gateway' ||
    path === '/n8n/trigger-webhook' ||
    path === '/emergency/stop-all' ||
    path === '/telegram/force-test'
  ) {
    return 'admin';
  }

  // Write access for modification operations
  if (OPENCLAW_ENFORCE_WRITE_AUTH && WRITE_METHODS.has(method)) {
    return 'write';
  }

  // Read access for all operations (if enforced)
  if (OPENCLAW_ENFORCE_READ_AUTH) {
    return 'read';
  }

  return 'none';
}

/**
 * 检查是否配置了指定级别的密钥
 */
export function hasConfiguredKeys(level: Exclude<AccessLevel, 'none'>): boolean {
  if (level === 'read') return readKeySet.size > 0;
  if (level === 'write') return writeKeySet.size > 0;
  return adminKeySet.size > 0;
}

/**
 * 检查提供的密钥是否有指定级别的权限
 */
export function isAuthorized(
  level: Exclude<AccessLevel, 'none'>,
  provided: string
): boolean {
  if (level === 'read') return readKeySet.has(provided);
  if (level === 'write') return writeKeySet.has(provided);
  return adminKeySet.has(provided);
}

// ========== 认证中间件 ==========

/**
 * API 认证中间件
 * 根据请求路径和方法自动判断所需权限级别
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const requiredLevel = requiredAccessLevel(req);

  // 不需要认证
  if (requiredLevel === 'none') {
    return next();
  }

  // 检查是否配置了密钥
  if (!hasConfiguredKeys(requiredLevel)) {
    console.warn(
      `[Auth] No ${requiredLevel} key configured, but ${req.method} ${req.path} requires it`
    );
    return res.status(500).json({
      ok: false,
      message: 'Server authentication not configured'
    });
  }

  // 读取并验证 API Key
  const providedKey = readApiKeyFromRequest(req);
  if (!providedKey) {
    return res.status(401).json({
      ok: false,
      message: 'Missing API key',
      hint: 'Provide x-api-key header or Authorization: Bearer <key>'
    });
  }

  if (!isAuthorized(requiredLevel, providedKey)) {
    return res.status(403).json({
      ok: false,
      message: `Insufficient permissions (requires ${requiredLevel} access)`
    });
  }

  // 认证通过
  next();
}

/**
 * 要求特定权限级别的中间件工厂函数
 * @param level - 所需的权限级别
 */
export function requireAuth(level: Exclude<AccessLevel, 'none'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasConfiguredKeys(level)) {
      console.warn(
        `[Auth] No ${level} key configured, but ${req.method} ${req.path} requires it`
      );
      return res.status(500).json({
        ok: false,
        message: 'Server authentication not configured'
      });
    }

    const providedKey = readApiKeyFromRequest(req);
    if (!providedKey) {
      return res.status(401).json({
        ok: false,
        message: 'Missing API key'
      });
    }

    if (!isAuthorized(level, providedKey)) {
      return res.status(403).json({
        ok: false,
        message: `Insufficient permissions (requires ${level} access)`
      });
    }

    next();
  };
}

// TypeScript 类型扩展
declare global {
  namespace Express {
    interface Request {
      accessLevel?: AccessLevel;
    }
  }
}
