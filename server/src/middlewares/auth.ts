import { Request, Response, NextFunction } from 'express';

/**
 * CORS Middleware
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // CORS 設定：允許公網域名，為部署做準備
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};

/**
 * Auth Middleware
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const isWriteMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  
  // 強制啟用 write auth：上線後所有寫入操作必須驗證
  const forceWriteAuth = process.env.NODE_ENV === 'production' || process.env.FORCE_WRITE_AUTH === 'true';

  if (isWriteMethod && forceWriteAuth) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: Write access requires authentication' });
    }
  }
  
  next();
};
