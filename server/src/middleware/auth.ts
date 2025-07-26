import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload { id: string; email: string }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized: No token provided.' });

  try {
    const payload = jwt.verify(
      hdr.slice(7),
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized: Invalid token.' });
  }
}
