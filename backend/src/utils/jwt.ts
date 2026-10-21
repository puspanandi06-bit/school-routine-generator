import jwt from 'jsonwebtoken';
import env from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  schoolId: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}
