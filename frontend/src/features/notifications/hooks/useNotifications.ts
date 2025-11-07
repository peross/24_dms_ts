import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationDto, NotificationListResponse } from '@/lib/api/notification.api';
import { notificationApi } from '@/lib/api/notification.api';
import { getAccessToken } from '@/lib/api/client';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/features/auth/hooks/useAuth';

const NOTIFICATIONS_QUERY_KEY = ['notifications', 'list'] as const;
const SOCKET_NAMESPACE_REGEX = /\/api\/?$/;
const SOCKET_NOTIFICATION_EVENT = 'notification.created' as const;

let socket: Socket | null = null;

const getSocketBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(SOCKET_NAMESPACE_REGEX, '');
};

const connectSocket = (token: string) => {
  if (socket?.connected) {
    return socket;
  }

  const baseUrl = getSocketBaseUrl();

  socket = io(baseUrl, {
    auth: { token },
    autoConnect: true,
    transports: ['websocket'],
  });

  return socket;
};

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<NotificationListResponse>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationApi.list({ limit: 50 }),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const notifications = data?.items ?? [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const updateCache = useCallback(
    (updater: (current: NotificationListResponse | undefined) => NotificationListResponse | undefined) => {
      queryClient.setQueryData<NotificationListResponse | undefined>(NOTIFICATIONS_QUERY_KEY, updater);
    },
    [queryClient]
  );

  const addOrUpdateNotification = useCallback(
    (notification: NotificationDto) => {
      updateCache((current) => {
        if (!current) {
          return {
            total: 1,
            items: [notification],
          };
        }

        const existingIndex = current.items.findIndex(
          (item) => item.notificationId === notification.notificationId
        );

        if (existingIndex !== -1) {
          const updatedItems = [...current.items];
          updatedItems[existingIndex] = notification;
          return { ...current, items: updatedItems };
        }

        return {
          total: current.total + 1,
          items: [notification, ...current.items].slice(0, 100),
        };
      });
    },
    [updateCache]
  );

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => notificationApi.markAsRead(notificationId),
    onSuccess: (updatedNotification) => {
      addOrUpdateNotification(updatedNotification);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      updateCache((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: current.items.map((item) => ({ ...item, read: true })),
        };
      });
    },
  });

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const activeSocket = connectSocket(token);

    const handleNotification = (notification: NotificationDto) => {
      addOrUpdateNotification({
        ...notification,
        createdAt: typeof notification.createdAt === 'string'
          ? notification.createdAt
          : new Date(notification.createdAt).toISOString(),
      });
    };

    activeSocket.on(SOCKET_NOTIFICATION_EVENT, handleNotification);

    return () => {
      activeSocket.off(SOCKET_NOTIFICATION_EVENT, handleNotification);
    };
  }, [user, addOrUpdateNotification]);

  return {
    notifications,
    unreadCount,
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAsReadAsync: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutate,
    markAllAsReadAsync: markAllAsReadMutation.mutateAsync,
  };
}

