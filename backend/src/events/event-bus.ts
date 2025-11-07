import { EventEmitter } from 'node:events';

export enum AppEvent {
  FOLDER_CREATED = 'folder.created',
  FOLDER_UPDATED = 'folder.updated',
  FOLDER_DELETED = 'folder.deleted',
  FILE_CREATED = 'file.created',
  FILE_UPDATED = 'file.updated',
  FILE_DELETED = 'file.deleted',
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

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

