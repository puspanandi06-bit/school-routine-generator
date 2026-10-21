import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.'
    });
  }

  req.user = payload;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission for this action.'
      });
    }
    next();
  };
}
