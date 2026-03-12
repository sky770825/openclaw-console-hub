import { Request, Response, NextFunction } from 'express';

// Mock implementation of a typed request
interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
