import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getConfig: () => ipcRenderer.invoke('app:get-config'),
  setApiBaseUrl: (apiBaseUrl: string) => ipcRenderer.invoke('app:set-api-base-url', apiBaseUrl),
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  setWorkspace: (workspacePath: string) => ipcRenderer.invoke('workspace:set', workspacePath),
  login: (payload: { identifier: string; password: string; twoFactorToken?: string }) =>
    ipcRenderer.invoke('auth:login', payload),
  logout: () => ipcRenderer.invoke('auth:logout'),
  restartSync: () => ipcRenderer.invoke('sync:restart'),
  listFiles: () => ipcRenderer.invoke('files:list'),
  openWorkspaceFolder: () => ipcRenderer.invoke('workspace:open-folder'),
  revealWorkspaceItem: (relativePath: string) => ipcRenderer.invoke('workspace:reveal-file', relativePath),
  openWebApp: () => ipcRenderer.invoke('workspace:open-web'),
  getNotifications: (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) =>
    ipcRenderer.invoke('notifications:list', params ?? {}),
  markNotificationRead: (notificationId: number) => ipcRenderer.invoke('notifications:mark-read', notificationId),
  markAllNotificationsRead: () => ipcRenderer.invoke('notifications:mark-all-read'),
  onAuthStateChanged: (callback: (payload: { isAuthenticated: boolean; email: string | null; displayName: string | null }) => void) => {
    const channel = 'auth:state-changed';
    const listener = (_event: Electron.IpcRendererEvent, payload: { isAuthenticated: boolean; email: string | null; displayName: string | null }) => {
      callback(payload);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  onNotificationCreated: (callback: (notification: any) => void) => {
    const channel = 'notification:created';
    const listener = (_event: Electron.IpcRendererEvent, notification: any) => {
      callback(notification);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  onNotificationUpdated: (callback: (notification: any) => void) => {
    const channel = 'notification:updated';
    const listener = (_event: Electron.IpcRendererEvent, notification: any) => {
      callback(notification);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
};

contextBridge.exposeInMainWorld('dmsClient', api);

declare global {
  interface Window {
    dmsClient: typeof api;
  }
}

