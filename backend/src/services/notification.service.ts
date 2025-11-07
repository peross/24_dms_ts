import Notification, { NotificationType } from '../models/notification.model';
import { eventBus, AppEvent } from '../events/event-bus';

export interface CreateNotificationDto {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any> | null;
}

export interface NotificationListParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

class NotificationService {
  async createNotification(payload: CreateNotificationDto) {
    const notification = await Notification.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata ?? null,
    });

    const notificationData = this.mapNotification(notification.toJSON());

    eventBus.emit(AppEvent.NOTIFICATION_CREATED, {
      userId: payload.userId,
      notification: notificationData,
    });

    return notificationData;
  }

  async getUserNotifications(userId: number, params: NotificationListParams = {}) {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const whereClause: Record<string, unknown> = { userId };
    if (params.unreadOnly) {
      whereClause.read = false;
    }

    const { rows, count } = await Notification.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      total: count,
      items: rows.map((row) => this.mapNotification(row.toJSON())),
    };
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await Notification.findOne({
      where: { notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    return this.mapNotification(notification.toJSON());
  }

  async markAllAsRead(userId: number) {
    await Notification.update(
      { read: true },
      {
        where: {
          userId,
          read: false,
        },
      }
    );
  }

  private mapNotification(record: any) {
    return {
      notificationId: record.notificationId,
      type: record.type,
      title: record.title,
      message: record.message,
      metadata: record.metadata ?? null,
      read: Boolean(record.read),
      createdAt: new Date(record.createdAt),
    };
  }
}

export default new NotificationService();

