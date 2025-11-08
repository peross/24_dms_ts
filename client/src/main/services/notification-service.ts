import { apiClient } from '../api/client';

export interface NotificationListParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface NotificationItem {
  notificationId: number;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  total: number;
  items: NotificationItem[];
}

const coerceReadFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    const numeric = Number.parseInt(normalized, 10);
    if (!Number.isNaN(numeric)) {
      return numeric !== 0;
    }
  }
  return Boolean(value);
};

const normalizeNotification = (raw: any): NotificationItem => {
  let createdAt = new Date().toISOString();
  const value = raw?.createdAt;
  if (typeof value === 'string') {
    createdAt = value;
  } else if (value instanceof Date) {
    createdAt = value.toISOString();
  } else if (typeof value === 'number') {
    createdAt = new Date(value).toISOString();
  }

  return {
    notificationId: Number(raw?.notificationId ?? raw?.id ?? 0),
    type: String(raw?.type ?? ''),
    title: String(raw?.title ?? ''),
    message: String(raw?.message ?? ''),
    metadata: raw?.metadata ?? null,
    read: coerceReadFlag(raw?.read),
    createdAt,
  };
};

export async function fetchNotifications(params: NotificationListParams = {}): Promise<NotificationListResponse> {
  const response = await apiClient.axios.get('/notifications', {
    params: {
      limit: params.limit,
      offset: params.offset,
      unread: params.unreadOnly ?? undefined,
    },
  });

  const data = response.data ?? {};
  const items: NotificationItem[] = Array.isArray(data.items) ? data.items.map((item: any) => normalizeNotification(item)) : [];
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : items.length;

  return {
    total,
    items,
  };
}

export async function markNotificationAsRead(notificationId: number): Promise<NotificationItem | null> {
  const response = await apiClient.axios.post(`/notifications/${notificationId}/read`);
  const notification = response.data?.notification;
  if (!notification) {
    return null;
  }
  return normalizeNotification(notification);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.axios.post('/notifications/read-all');
}


