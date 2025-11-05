import { Request, Response } from 'express';
import AuthService from '../services/auth.service';
import UserService from '../services/user.service';
import TwoFactorService from '../services/two-factor.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { getDeviceInfo } from '../utils/device.util';

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/', // Ensure cookie is available for all paths
  // Don't set domain in development - let browser handle it
  // domain: undefined, // Will use current domain
};

export class AuthController {
  private setRefreshToken(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  }

  private clearRefreshToken(res: Response): void {
    // clearCookie needs the same options as setCookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      ...REFRESH_TOKEN_COOKIE_OPTIONS,
      path: '/', // Must match the path used when setting the cookie
    });
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password, firstName, lastName, roleNames } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const deviceInfo = getDeviceInfo(req);
      const result = await AuthService.register({
        email,
        username,
        password,
        firstName,
        lastName,
        roleNames: roleNames || ['user'],
      }, deviceInfo);

      // Set refresh token in httpOnly cookie
      this.setRefreshToken(res, result.refreshToken);

      // Return access token and user data in response body
      res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Registration failed' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { emailOrUsername, email, password, twoFactorToken } = req.body;

      // Support both 'emailOrUsername' (new) and 'email' (backward compatibility)
      const identifier = emailOrUsername || email;

      if (!identifier || !password) {
        res.status(400).json({ error: 'Email/username and password are required' });
        return;
      }

      const deviceInfo = getDeviceInfo(req);
      const result = await AuthService.login({ emailOrUsername: identifier, password }, deviceInfo, twoFactorToken);

      // Set refresh token in httpOnly cookie
      this.setRefreshToken(res, result.refreshToken);

      // Return access token and user data in response body
      res.status(200).json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error: any) {
      // Check if it's a 2FA required error
      if (error.message === 'Two-factor authentication code is required') {
        res.status(200).json({
          requiresTwoFactor: true,
          message: 'Two-factor authentication code is required',
        });
      } else {
        res.status(401).json({ error: error.message || 'Login failed' });
      }
    }
  }

  async checkLogin(req: Request, res: Response): Promise<void> {
    try {
      const { emailOrUsername, email, password } = req.body;

      // Support both 'emailOrUsername' (new) and 'email' (backward compatibility)
      const identifier = emailOrUsername || email;

      if (!identifier || !password) {
        res.status(400).json({ error: 'Email/username and password are required' });
        return;
      }

      const result = await AuthService.checkLoginCredentials({ emailOrUsername: identifier, password });

      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Invalid credentials' });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token is required' });
        return;
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      // Only update cookie if refresh token was rotated (changed)
      // In our implementation, we reuse the same token, but we still update the cookie
      // to ensure the expiration is correct in case it was extended
      if (result.refreshToken !== refreshToken) {
        // Token was rotated - set new one
        this.setRefreshToken(res, result.refreshToken);
      }
      // Otherwise, the cookie is still valid and doesn't need updating

      // Return new access token in response body
      res.status(200).json({
        accessToken: result.accessToken,
      });
    } catch (error: any) {
      // Clear refresh token cookie on error
      this.clearRefreshToken(res);
      res.status(401).json({ error: error.message || 'Token refresh failed' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      // Clear refresh token cookie
      this.clearRefreshToken(res);

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: any) {
      // Clear cookie even on error
      this.clearRefreshToken(res);
      res.status(400).json({ error: error.message || 'Logout failed' });
    }
  }

  async logoutAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await AuthService.logoutAll(req.user.userId);

      // Clear refresh token cookie
      this.clearRefreshToken(res);

      res.status(200).json({ message: 'Logged out from all devices successfully' });
    } catch (error: any) {
      this.clearRefreshToken(res);
      res.status(500).json({ error: error.message || 'Logout failed' });
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await UserService.getUserProfile(req.user.userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get profile' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { email, username, firstName, lastName } = req.body;

      // Validate that at least one field is provided
      if (!email && username === undefined && firstName === undefined && lastName === undefined) {
        res.status(400).json({ error: 'At least one field must be provided for update' });
        return;
      }

      const updatedUser = await UserService.updateProfile(req.user.userId, {
        email,
        username,
        firstName,
        lastName,
      });

      res.status(200).json({ user: updatedUser });
    } catch (error: any) {
      if (error.message === 'Email is already taken' || error.message === 'Username is already taken') {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to update profile' });
      }
    }
  }

  async updatePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters long' });
        return;
      }

      await UserService.updatePassword(req.user.userId, currentPassword, newPassword);

      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        res.status(401).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to update password' });
      }
    }
  }

  async getActiveSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get current refresh token from cookie to identify current session
      const currentToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

      const sessions = await AuthService.getActiveSessions(req.user.userId, currentToken);

      res.status(200).json({ sessions });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get active sessions' });
    }
  }

  async revokeSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { refreshTokenId } = req.body;

      if (!refreshTokenId) {
        res.status(400).json({ error: 'Refresh token ID is required' });
        return;
      }

      await AuthService.revokeSession(req.user.userId, refreshTokenId);

      res.status(200).json({ message: 'Session revoked successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to revoke session' });
    }
  }

  async getTwoFactorStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await TwoFactorService.getTwoFactorStatus(req.user.userId);
      res.status(200).json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get 2FA status' });
    }
  }

  async setupTwoFactor(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await UserService.getUserProfile(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const setup = await TwoFactorService.generateSecret(req.user.userId, user.email);
      res.status(200).json(setup);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to setup 2FA' });
    }
  }

  async verifyTwoFactorSetup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Verification token is required' });
        return;
      }

      const isValid = await TwoFactorService.verifySetupToken(req.user.userId, token);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid verification code' });
        return;
      }

      // Enable 2FA
      await TwoFactorService.enableTwoFactor(req.user.userId);

      res.status(200).json({ message: '2FA enabled successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to verify 2FA setup' });
    }
  }

  async disableTwoFactor(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({ error: 'Password is required to disable 2FA' });
        return;
      }

      const user = await UserService.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Get user with password for verification
      const userWithPassword = await UserService.findByEmail(user.email);
      if (!userWithPassword) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await TwoFactorService.disableTwoFactor(req.user.userId, password, userWithPassword.password);

      res.status(200).json({ message: '2FA disabled successfully' });
    } catch (error: any) {
      if (error.message === 'Invalid password') {
        res.status(401).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to disable 2FA' });
      }
    }
  }
}

export default new AuthController();
