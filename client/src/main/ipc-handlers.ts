import fs from 'node:fs';
import path from 'node:path';
import { dialog, ipcMain, shell } from 'electron';
import { configStore } from './config-store';
import { ensureWorkspaceStructure } from './workspace-manager';
import { startFileWatcher, stopFileWatcher } from './file-watcher';
import { authService } from './services/auth-service';
import { normalizePath, isSubPath } from './utils/path';
import { workspaceSyncService } from './services/workspace-sync-service';
import { setApiBaseUrl as configureSocketBaseUrl, requestResync } from './services/socket-service';
import { deriveWebAppUrl } from './utils/url';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationListParams,
} from './services/notification-service';

function isSyncReady(): boolean {
  return Boolean(configStore.getWorkspacePath() && configStore.getAuthState()?.accessToken);
}

async function restartWatcherIfReady(): Promise<void> {
  if (!isSyncReady()) {
    await stopFileWatcher();
    return;
  }

  const workspacePath = configStore.getWorkspacePath();
  if (workspacePath) {
    await startFileWatcher(workspacePath);
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('app:get-config', async () => {
    const authState = configStore.getAuthState();
    return {
      workspacePath: configStore.getWorkspacePath(),
      apiBaseUrl: configStore.getApiBaseUrl(),
      auth: authState
        ? {
            email: authState.email,
            displayName: authState.displayName,
            isAuthenticated: Boolean(authState.accessToken),
          }
        : undefined,
      syncActive: isSyncReady(),
      lastSyncedAt: workspaceSyncService.getLastSyncedAt()?.toISOString() ?? null,
    };
  });

  ipcMain.handle('app:set-api-base-url', async (_event, apiBaseUrl: string) => {
    authService.setApiBaseUrl(apiBaseUrl);
    configureSocketBaseUrl(apiBaseUrl);
    return { apiBaseUrl: configStore.getApiBaseUrl() };
  });

  ipcMain.handle('workspace:choose', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select workspace directory',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || !result.filePaths?.length) {
      return null;
    }

    return normalizePath(result.filePaths[0]);
  });

  ipcMain.handle('workspace:set', async (_event, workspacePath: string) => {
    if (!workspacePath) {
      throw new Error('Workspace path is required');
    }

    const normalized = normalizePath(workspacePath);
    await ensureWorkspaceStructure(normalized);
    configStore.setWorkspacePath(normalized);

    await restartWatcherIfReady();
    requestResync();

    return {
      workspacePath: normalized,
      syncActive: isSyncReady(),
    };
  });

  ipcMain.handle('auth:login', async (_event, payload: { identifier: string; password: string; twoFactorToken?: string }) => {
    try {
      const result = await authService.login(payload);

      if (result.success) {
        await restartWatcherIfReady();
      }

      return result;
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? 'Login failed. Please check your credentials and try again.';
      return {
        success: false,
        message,
      };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    await authService.logout();
    await stopFileWatcher();
    return { success: true };
  });

  ipcMain.handle('sync:restart', async () => {
    await restartWatcherIfReady();
    return { syncActive: isSyncReady() };
  });

  ipcMain.handle('files:list', async () => {
    const workspacePath = configStore.getWorkspacePath();
    if (!workspacePath || !isSyncReady()) {
      return [];
    }

    if (workspaceSyncService.getFiles().length === 0) {
      await workspaceSyncService.syncFromRemote(workspacePath);
    }

    return workspaceSyncService.getFiles();
  });

  ipcMain.handle('workspace:open-folder', async () => {
    const workspacePath = configStore.getWorkspacePath();
    if (!workspacePath) {
      return { success: false, message: 'Workspace path is not configured yet.' };
    }

    const result = await shell.openPath(workspacePath);
    if (result) {
      return { success: false, message: result };
    }

    return { success: true };
  });

  ipcMain.handle('workspace:reveal-file', async (_event, relativePath: string) => {
    const workspacePath = configStore.getWorkspacePath();
    if (!workspacePath) {
      return { success: false, message: 'Workspace path is not configured yet.' };
    }

    if (typeof relativePath !== 'string' || relativePath.trim() === '') {
      return { success: false, message: 'Invalid file path.' };
    }

    const sanitizedRelativePath = relativePath.replace(/^[/\\]+/, '');
    const absoluteWorkspacePath = path.resolve(workspacePath);
    const targetPath = path.resolve(workspacePath, sanitizedRelativePath);

    if (!isSubPath(absoluteWorkspacePath, targetPath)) {
      return { success: false, message: 'Requested file is outside of the workspace.' };
    }

    const normalizedTarget = normalizePath(targetPath);

    if (!fs.existsSync(normalizedTarget)) {
      return { success: false, message: 'File does not exist on disk yet.' };
    }

    try {
      shell.showItemInFolder(targetPath);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to reveal workspace file', error);
      return {
        success: false,
        message: error?.message ?? 'Failed to open workspace file location.',
      };
    }
  });

  ipcMain.handle('workspace:open-web', async () => {
    const apiBaseUrl = configStore.getApiBaseUrl();
    const url = deriveWebAppUrl(apiBaseUrl);

    if (!url) {
      return { success: false, message: 'API base URL is not configured yet.' };
    }

    await shell.openExternal(url);
    return { success: true, url };
  });

  ipcMain.handle('notifications:list', async (_event, params: NotificationListParams = {}) => {
    try {
      const authState = configStore.getAuthState();
      if (!authState?.accessToken) {
        return { total: 0, items: [] };
      }
      return await fetchNotifications(params);
    } catch (error: any) {
      console.error('Failed to list notifications', error);
      return {
        total: 0,
        items: [],
        error: error?.message ?? 'Failed to fetch notifications',
      };
    }
  });

  ipcMain.handle('notifications:mark-read', async (_event, notificationId: number) => {
    if (!Number.isFinite(notificationId)) {
      return { success: false, error: 'Invalid notification id' };
    }
    try {
      const notification = await markNotificationAsRead(notificationId);
      return {
        success: Boolean(notification),
        notification,
      };
    } catch (error: any) {
      console.error('Failed to mark notification as read', error);
      return {
        success: false,
        error: error?.message ?? 'Failed to update notification',
      };
    }
  });

  ipcMain.handle('notifications:mark-all-read', async () => {
    try {
      await markAllNotificationsAsRead();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to mark all notifications as read', error);
      return {
        success: false,
        error: error?.message ?? 'Failed to update notifications',
      };
    }
  });
}

