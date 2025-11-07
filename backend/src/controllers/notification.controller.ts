import { Response } from 'express';
import NotificationService from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

class NotificationController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
      const offsetParam = Array.isArray(req.query.offset) ? req.query.offset[0] : req.query.offset;
      const unreadParam = Array.isArray(req.query.unread) ? req.query.unread[0] : req.query.unread;

      const limit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : undefined;
      const offset = typeof offsetParam === 'string' ? Number.parseInt(offsetParam, 10) : undefined;
      const unreadOnly = unreadParam === 'true';

      const notifications = await NotificationService.getUserNotifications(req.user.userId, {
        limit,
        offset,
        unreadOnly,
      });

      res.status(200).json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch notifications' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const notificationId = Number.parseInt(req.params.notificationId, 10);
      if (Number.isNaN(notificationId)) {
        res.status(400).json({ error: 'Invalid notification id' });
        return;
      }

      const notification = await NotificationService.markAsRead(notificationId, req.user.userId);
      res.status(200).json({ notification });
    } catch (error: any) {
      if (error?.message === 'Notification not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: error?.message || 'Failed to update notification' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await NotificationService.markAllAsRead(req.user.userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to update notifications' });
    }
  }
}

export default new NotificationController();

