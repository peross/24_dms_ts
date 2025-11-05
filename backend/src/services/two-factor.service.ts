import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/user.model';
import crypto from 'node:crypto';

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class TwoFactorService {
  /**
   * Generate a secret and QR code for 2FA setup
   */
  async generateSecret(userId: number, userEmail: string): Promise<TwoFactorSetupResponse> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `DMS (${userEmail})`,
      issuer: 'DMS',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store secret and backup codes temporarily (not enabled yet)
    user.twoFactorSecret = secret.base32!;
    user.twoFactorBackupCodes = JSON.stringify(backupCodes);
    await user.save();

    return {
      secret: secret.base32!,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP token during setup
   */
  async verifySetupToken(userId: number, token: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA setup not initiated');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after
    });

    return verified;
  }

  /**
   * Enable 2FA for user (after verification)
   */
  async enableTwoFactor(userId: number): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA setup not completed. Please complete setup first.');
    }

    user.twoFactorEnabled = true;
    await user.save();
  }

  /**
   * Disable 2FA for user
   */
  async disableTwoFactor(userId: number, password: string, userPassword: string): Promise<void> {
    // Verify password before disabling 2FA
    const { comparePassword } = require('../utils/password.util');
    const isValid = await comparePassword(password, userPassword);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = undefined;
    await user.save();
  }

  /**
   * Verify TOTP token during login
   */
  async verifyToken(userId: number, token: string): Promise<boolean> {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('2FA is not enabled for this user');
    }

    // Try TOTP token first
    const totpVerified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (totpVerified) {
      return true;
    }

    // If TOTP fails, check backup codes
    if (user.twoFactorBackupCodes) {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes) as string[];
      const codeIndex = backupCodes.indexOf(token.toUpperCase());

      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        user.twoFactorBackupCodes = backupCodes.length > 0 ? JSON.stringify(backupCodes) : undefined;
        await user.save();
        return true;
      }
    }

    return false;
  }

  /**
   * Get 2FA status for user
   */
  async getTwoFactorStatus(userId: number): Promise<{ enabled: boolean; setupInProgress: boolean }> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      enabled: user.twoFactorEnabled || false,
      setupInProgress: !!(user.twoFactorSecret && !user.twoFactorEnabled),
    };
  }
}

export default new TwoFactorService();

