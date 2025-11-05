import UserService, { CreateUserDto, LoginDto } from './user.service';
import { generateAccessToken, generateRefreshToken, JWTPayload } from '../utils/jwt.util';
import RefreshTokenModel from '../models/refresh-token.model';
import User from '../models/user.model';
import { DeviceInfo } from '../utils/device.util';

export interface AuthResponse {
  user: {
    userId: number;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async register(data: CreateUserDto, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    // Create user
    const user = await UserService.createUser(data);

    // Get user roles
    const roles = await UserService.getUserRoles(user.userId);

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.userId,
      email: user.email,
      roles,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken();

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store refresh token in database with device info
    await RefreshTokenModel.create({
      userId: user.userId,
      token: refreshToken,
      expiresAt,
      revoked: false,
      userAgent: deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress,
    });

    return {
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginDto, deviceInfo?: DeviceInfo, twoFactorToken?: string): Promise<AuthResponse> {
    // Find user by email or username
    const user = await UserService.findByEmailOrUsername(data.emailOrUsername);
    if (!user) {
      throw new Error('Invalid email/username or password');
    }

    // Verify password
    const isPasswordValid = await UserService.verifyPassword(user, data.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email/username or password');
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // If 2FA is enabled, require 2FA token
      if (!twoFactorToken) {
        throw new Error('Two-factor authentication code is required');
      }

      // Verify 2FA token
      const TwoFactorService = (await import('./two-factor.service')).default;
      const isValid2FA = await TwoFactorService.verifyToken(user.userId, twoFactorToken);
      if (!isValid2FA) {
        throw new Error('Invalid two-factor authentication code');
      }
    }

    // Get user roles
    const roles = await UserService.getUserRoles(user.userId);

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.userId,
      email: user.email,
      roles,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken();

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store new refresh token in database with device info
    await RefreshTokenModel.create({
      userId: user.userId,
      token: refreshToken,
      expiresAt,
      revoked: false,
      userAgent: deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress,
    });

    return {
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify credentials and check if 2FA is required
   * Returns whether 2FA is required
   */
  async checkLoginCredentials(data: LoginDto): Promise<{ requiresTwoFactor: boolean }> {
    // Find user by email or username
    const user = await UserService.findByEmailOrUsername(data.emailOrUsername);
    if (!user) {
      throw new Error('Invalid email/username or password');
    }

    // Verify password
    const isPasswordValid = await UserService.verifyPassword(user, data.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email/username or password');
    }

    // Check if 2FA is enabled
    return {
      requiresTwoFactor: user.twoFactorEnabled || false,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
    // Find refresh token in database
    const tokenRecord = await RefreshTokenModel.findOne({
      where: { token: refreshToken },
      include: [{ model: User, as: 'user' }],
    });

    if (!tokenRecord) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      // Delete expired token
      await RefreshTokenModel.destroy({
        where: { token: refreshToken },
      });
      throw new Error('Refresh token has expired');
    }

    // Get user roles
    const roles = await UserService.getUserRoles(tokenRecord.userId);

    // Generate new access token
    const payload: JWTPayload = {
      userId: tokenRecord.userId,
      email: (tokenRecord.user as User).email,
      roles,
    };
    const accessToken = generateAccessToken(payload);

    // Option 1: Update existing token (no rotation) - more efficient
    // Just extend the expiration date if needed (optional - you can remove this)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update the existing token's expiration if it's close to expiring (optional)
    // This keeps the same token but extends its life
    if (tokenRecord.expiresAt < expiresAt) {
      await tokenRecord.update({ expiresAt });
    }

    // Return the same refresh token (no rotation)
    return {
      accessToken,
      refreshToken: refreshToken, // Return the same token
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // Delete the refresh token from database
    await RefreshTokenModel.destroy({
      where: { token: refreshToken },
    });
  }

  async logoutAll(userId: number): Promise<void> {
    // Delete all refresh tokens for user
    await RefreshTokenModel.destroy({
      where: { userId },
    });
  }

  /**
   * Clean up expired refresh tokens from the database
   * This should be called periodically (e.g., via cron job or on startup)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const { Op } = require('sequelize');
    const deletedCount = await RefreshTokenModel.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(), // Less than current date = expired
        },
      },
    });
    return deletedCount;
  }

  /**
   * Clean up expired tokens when refreshing access token
   * This ensures expired tokens are removed when they're encountered
   */
  async cleanupExpiredTokensForUser(userId: number): Promise<void> {
    const { Op } = require('sequelize');
    await RefreshTokenModel.destroy({
      where: {
        userId,
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  }

  async getActiveSessions(userId: number, currentToken?: string): Promise<Array<{
    refreshTokenId: number;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
    expiresAt: Date;
    isCurrent: boolean;
  }>> {
    // Clean up expired tokens for this user first
    await this.cleanupExpiredTokensForUser(userId);

    const { Op } = require('sequelize');
    const tokens = await RefreshTokenModel.findAll({
      where: {
        userId,
        expiresAt: { [Op.gt]: new Date() }, // Not expired
      },
      order: [['createdAt', 'DESC']],
      attributes: ['refreshTokenId', 'userAgent', 'ipAddress', 'createdAt', 'expiresAt', 'token'],
    });

    // Mark the current session based on token match
    return tokens.map((token) => ({
      refreshTokenId: token.refreshTokenId,
      userAgent: token.userAgent || 'Unknown',
      ipAddress: token.ipAddress || 'Unknown',
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      isCurrent: currentToken ? token.token === currentToken : false,
    }));
  }

  async revokeSession(userId: number, refreshTokenId: number): Promise<void> {
    // Delete specific refresh token, but only if it belongs to the user
    const deletedCount = await RefreshTokenModel.destroy({
      where: {
        refreshTokenId,
        userId,
      },
    });

    if (deletedCount === 0) {
      throw new Error('Session not found');
    }
  }
}

export default new AuthService();
