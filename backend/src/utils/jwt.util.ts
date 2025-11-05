import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this-in-production';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: number;
  email: string;
  roles: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  } as SignOptions);
};

export const generateRefreshToken = (): string => {
  // Generate a random token for refresh token (stored in database)
  return crypto.randomBytes(64).toString('hex');
};

export const generateRefreshTokenJWT = (userId: number): string => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid or expired access token';
    throw new Error(message);
  }
};

export const verifyRefreshTokenJWT = (token: string): { userId: number } => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: number };
    return decoded;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid or expired refresh token';
    throw new Error(message);
  }
};
