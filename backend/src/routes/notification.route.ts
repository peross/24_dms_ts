import { Router } from 'express';
import NotificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => NotificationController.list(req, res));
router.post('/:notificationId/read', (req, res) => NotificationController.markAsRead(req, res));
router.post('/read-all', (req, res) => NotificationController.markAllAsRead(req, res));

export default router;

