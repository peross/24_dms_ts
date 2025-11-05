import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', AuthController.register.bind(AuthController));
router.post('/login', AuthController.login.bind(AuthController));
router.post('/login/check', AuthController.checkLogin.bind(AuthController));
router.post('/refresh', AuthController.refreshToken.bind(AuthController));
router.get('/refresh', AuthController.refreshToken.bind(AuthController)); // Also allow GET for easier refresh
router.post('/logout', AuthController.logout.bind(AuthController));
router.post('/logout-all', authenticate, AuthController.logoutAll.bind(AuthController));
router.get('/profile', authenticate, AuthController.getProfile.bind(AuthController));
router.put('/profile', authenticate, AuthController.updateProfile.bind(AuthController));
router.put('/profile/password', authenticate, AuthController.updatePassword.bind(AuthController));
router.get('/sessions', authenticate, AuthController.getActiveSessions.bind(AuthController));
router.post('/sessions/revoke', authenticate, AuthController.revokeSession.bind(AuthController));
router.get('/two-factor/status', authenticate, AuthController.getTwoFactorStatus.bind(AuthController));
router.post('/two-factor/setup', authenticate, AuthController.setupTwoFactor.bind(AuthController));
router.post('/two-factor/verify', authenticate, AuthController.verifyTwoFactorSetup.bind(AuthController));
router.post('/two-factor/disable', authenticate, AuthController.disableTwoFactor.bind(AuthController));

export default router;
