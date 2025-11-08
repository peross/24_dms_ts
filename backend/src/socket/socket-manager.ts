import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, JWTPayload } from '../utils/jwt.util';
import { eventBus, AppEvent, FolderEventData, FileEventData, NotificationEventData } from '../events/event-bus';

let io: SocketIOServer | null = null;

const userRoom = (userId: number): string => `user:${userId}`;

const sanitizeAndJoin = (socket: Socket, payload: JWTPayload): void => {
  socket.data.user = payload;
  socket.join(userRoom(payload.userId));
};

const handleAuthentication = (socket: Socket, next: (err?: Error) => void): void => {
  try {
    const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string | undefined;
    if (!token) {
      next(new Error('Authentication token is required'));
      return;
    }

    const payload = verifyAccessToken(token);
    sanitizeAndJoin(socket, payload);
    next();
  } catch (error: any) {
    next(new Error(error?.message || 'Authentication failed'));
  }
};

const forwardFolderEvent = (event: AppEvent, data: FolderEventData): void => {
  if (!io) return;
  io.to(userRoom(data.userId)).emit(event, data.folder);
};

const forwardFileEvent = (event: AppEvent, data: FileEventData): void => {
  if (!io) return;
  io.to(userRoom(data.userId)).emit(event, data.file);
};

const forwardNotificationEvent = (data: NotificationEventData, event: AppEvent = AppEvent.NOTIFICATION_CREATED): void => {
  if (!io) return;
  io.to(userRoom(data.userId)).emit(event, data.notification);
};

export const initializeSocketServer = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
    },
  });

  io.use(handleAuthentication);

  io.on('connection', (socket) => {
    const payload = socket.data.user as JWTPayload | undefined;
    if (payload) {
      console.log(`📡 Socket connected for user ${payload.userId} (${socket.id})`);
      socket.emit('sync:ready');
    }

    socket.on('disconnect', (reason) => {
      if (payload) {
        console.log(`🔌 Socket disconnected for user ${payload.userId} (${socket.id}) reason=${reason}`);
      }
      if (payload) {
        socket.leave(userRoom(payload.userId));
      }
    });
  });

  eventBus.on(AppEvent.FOLDER_CREATED, (payload: FolderEventData) => {
    console.log(`📨 [Socket] folder.created user=${payload.userId}`, payload.folder);
    forwardFolderEvent(AppEvent.FOLDER_CREATED, payload);
  });
  eventBus.on(AppEvent.FOLDER_UPDATED, (payload: FolderEventData) => {
    console.log(`📨 [Socket] folder.updated user=${payload.userId}`, payload.folder);
    forwardFolderEvent(AppEvent.FOLDER_UPDATED, payload);
  });
  eventBus.on(AppEvent.FOLDER_DELETED, (payload: FolderEventData) => {
    console.log(`📨 [Socket] folder.deleted user=${payload.userId}`, payload.folder);
    forwardFolderEvent(AppEvent.FOLDER_DELETED, payload);
  });
  eventBus.on(AppEvent.FILE_CREATED, (payload: FileEventData) => {
    console.log(`📨 [Socket] file.created user=${payload.userId}`, payload.file);
    forwardFileEvent(AppEvent.FILE_CREATED, payload);
  });
  eventBus.on(AppEvent.FILE_UPDATED, (payload: FileEventData) => {
    console.log(`📨 [Socket] file.updated user=${payload.userId}`, payload.file);
    forwardFileEvent(AppEvent.FILE_UPDATED, payload);
  });
  eventBus.on(AppEvent.FILE_DELETED, (payload: FileEventData) => {
    console.log(`📨 [Socket] file.deleted user=${payload.userId}`, payload.file);
    forwardFileEvent(AppEvent.FILE_DELETED, payload);
  });
  eventBus.on(AppEvent.NOTIFICATION_CREATED, (payload: NotificationEventData) => {
    console.log(`📨 [Socket] notification.created user=${payload.userId}`, payload.notification);
    forwardNotificationEvent(payload);
  });
  eventBus.on(AppEvent.NOTIFICATION_UPDATED, (payload: NotificationEventData) => {
    console.log(`📨 [Socket] notification.updated user=${payload.userId}`, payload.notification);
    forwardNotificationEvent(payload, AppEvent.NOTIFICATION_UPDATED);
  });

  return io;
};

export const getSocketServer = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket server has not been initialized');
  }
  return io;
};

