import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, UserRecord } from '../db';
import { UserRole } from '../../src/types/cibus';

const JWT_SECRET = process.env.JWT_SECRET || 'cibus-cebu-production-grade-secret-key-change-in-prod';

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function signToken(user: UserRecord): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in to your CIBUS Cebu account.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole };
    const user = db.state.users.find((u) => u.id === decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }
    if (user.status !== 'ACTIVE') {
      res.status(403).json({ error: `Account is currently ${user.status.toLowerCase()}. Please contact CIBUS Cebu dispatch.` });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}. Current role: ${req.user.role}.`,
      });
      return;
    }
    next();
  };
}

