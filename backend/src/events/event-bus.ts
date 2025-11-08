import { EventEmitter } from 'node:events';

export enum AppEvent {
  FOLDER_CREATED = 'folder.created',
  FOLDER_UPDATED = 'folder.updated',
  FOLDER_DELETED = 'folder.deleted',
  FILE_CREATED = 'file.created',
  FILE_UPDATED = 'file.updated',
  FILE_DELETED = 'file.deleted',
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_UPDATED = 'notification.updated',
}

export interface FolderEventData {
  userId: number;
  folder: {
    folderId: number;
    name: string;
    parentId: number | null;
    systemFolderId: number | null;
    path: string;
  };
}

export interface FileEventData {
  userId: number;
  file: {
    fileId: number;
    name: string;
    folderId: number | null;
    systemFolderId: number | null;
    path: string | null;
    size: number;
    mimeType: string;
  };
}

export interface NotificationEventData {
  userId: number;
  notification: {
    notificationId: number;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, any> | null;
    read: boolean;
    createdAt: Date;
  };
}

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

