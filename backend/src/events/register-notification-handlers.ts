import { eventBus, AppEvent, FileEventData, FolderEventData } from './event-bus';
import NotificationService from '../services/notification.service';
import Folder from '../models/folder.model';
import SystemFolder from '../models/system-folder.model';

const safeNotify = async (fn: () => Promise<void>) => {
  try {
    await fn();
  } catch (error) {
    console.error('[NotificationHandlers] Failed to create notification:', error);
  }
};

const formatFolderPath = (folder: FolderEventData['folder']) => folder.path || folder.name;

const fetchFolderName = async (folderId: number | null | undefined): Promise<string | null> => {
  if (!folderId) {
    return null;
  }

  const folder = await Folder.findByPk(folderId, {
    attributes: ['name'],
  });

  return folder?.name ?? null;
};

const fetchSystemFolderName = async (systemFolderId: number | null | undefined): Promise<string | null> => {
  if (!systemFolderId) {
    return null;
  }

  const systemFolder = await SystemFolder.findByPk(systemFolderId, {
    attributes: ['name'],
  });

  return systemFolder?.name ?? null;
};

let registered = false;

export const registerNotificationEventHandlers = () => {
  if (registered) {
    return;
  }
  registered = true;

  eventBus.on(AppEvent.FILE_CREATED, (payload: FileEventData) => {
    void safeNotify(async () => {
      const folderName = await fetchFolderName(payload.file.folderId);
      const systemFolderName = await fetchSystemFolderName(payload.file.systemFolderId);

      await NotificationService.createNotification({
        userId: payload.userId,
        type: 'file_uploaded',
        title: 'File uploaded',
        message: `File "${payload.file.name}" was uploaded successfully.`,
        metadata: {
          fileId: payload.file.fileId,
          fileName: payload.file.name,
          folderId: payload.file.folderId ?? null,
          folderName,
          systemFolderId: payload.file.systemFolderId ?? null,
          systemFolderName,
          path: payload.file.path ?? null,
          size: payload.file.size,
          mimeType: payload.file.mimeType,
        },
      });
    });
  });

  eventBus.on(AppEvent.FILE_UPDATED, (payload: FileEventData) => {
    void safeNotify(async () => {
      const folderName = await fetchFolderName(payload.file.folderId);
      const systemFolderName = await fetchSystemFolderName(payload.file.systemFolderId);

      await NotificationService.createNotification({
        userId: payload.userId,
        type: 'file_updated',
        title: 'File updated',
        message: `File "${payload.file.name}" was updated.`,
        metadata: {
          fileId: payload.file.fileId,
          fileName: payload.file.name,
          folderId: payload.file.folderId ?? null,
          folderName,
          systemFolderId: payload.file.systemFolderId ?? null,
          systemFolderName,
          path: payload.file.path ?? null,
          size: payload.file.size,
          mimeType: payload.file.mimeType,
        },
      });
    });
  });

  eventBus.on(AppEvent.FILE_DELETED, (payload: FileEventData) => {
    void safeNotify(async () => {
      const folderName = await fetchFolderName(payload.file.folderId);
      const systemFolderName = await fetchSystemFolderName(payload.file.systemFolderId);

      await NotificationService.createNotification({
        userId: payload.userId,
        type: 'file_deleted',
        title: 'File deleted',
        message: `File "${payload.file.name}" was deleted.`,
        metadata: {
          fileId: payload.file.fileId,
          fileName: payload.file.name,
          folderId: payload.file.folderId ?? null,
          folderName,
          systemFolderId: payload.file.systemFolderId ?? null,
          systemFolderName,
          path: payload.file.path ?? null,
        },
      });
    });
  });

  eventBus.on(AppEvent.FOLDER_CREATED, (payload: FolderEventData) => {
    void safeNotify(async () => {
      const parentFolderName = await fetchFolderName(payload.folder.parentId);
      const systemFolderName = await fetchSystemFolderName(payload.folder.systemFolderId);

      await NotificationService.createNotification({
        userId: payload.userId,
        type: 'folder_created',
        title: 'Folder created',
        message: `Folder "${payload.folder.name}" was created.`,
        metadata: {
          folderId: payload.folder.folderId,
          folderName: payload.folder.name,
          parentId: payload.folder.parentId ?? null,
          parentFolderName,
          path: formatFolderPath(payload.folder),
          systemFolderId: payload.folder.systemFolderId ?? null,
          systemFolderName,
        },
      });
    });
  });

  eventBus.on(AppEvent.FOLDER_UPDATED, (payload: FolderEventData) => {
    void safeNotify(async () => {
      const parentFolderName = await fetchFolderName(payload.folder.parentId);
      const systemFolderName = await fetchSystemFolderName(payload.folder.systemFolderId);

      await NotificationService.createNotification({
        userId: payload.userId,
        type: 'folder_updated',
        title: 'Folder updated',
        message: `Folder "${payload.folder.name}" was updated.`,
        metadata: {
          folderId: payload.folder.folderId,
          folderName: payload.folder.name,
          parentId: payload.folder.parentId ?? null,
          parentFolderName,
          path: formatFolderPath(payload.folder),
          systemFolderId: payload.folder.systemFolderId ?? null,
          systemFolderName,
        },
      });
    });
  });

  eventBus.on(AppEvent.FOLDER_DELETED, (payload: FolderEventData) => {
    void safeNotify(async () => {
      const parentFolderName = await fetchFolderName(payload.folder.parentId);
      const systemFolderName = await fetchSystemFolderName(payload.folder.systemFolderId);

      await NotificationService.createNotification({
        userId: payload.userId,
        type: 'folder_deleted',
        title: 'Folder deleted',
        message: `Folder "${payload.folder.name}" was deleted.`,
        metadata: {
          folderId: payload.folder.folderId,
          folderName: payload.folder.name,
          parentId: payload.folder.parentId ?? null,
          parentFolderName,
          path: formatFolderPath(payload.folder),
          systemFolderId: payload.folder.systemFolderId ?? null,
          systemFolderName,
        },
      });
    });
  });
};

