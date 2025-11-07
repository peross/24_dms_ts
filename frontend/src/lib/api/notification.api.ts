import apiClient from '@/lib/api/client';

export interface NotificationDto {
  notificationId: number;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any> | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  total: number;
  items: NotificationDto[];
}

export interface NotificationListParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export const notificationApi = {
  async list(params: NotificationListParams = {}): Promise<NotificationListResponse> {
    const response = await apiClient.get<NotificationListResponse>('/notifications', {
      params,
    });
    return response.data;
  },

  async markAsRead(notificationId: number): Promise<NotificationDto> {
    const response = await apiClient.post<{ notification: NotificationDto }>(
      `/notifications/${notificationId}/read`
    );
    return response.data.notification;
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  },
};

