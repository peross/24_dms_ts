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
  openWebApp: () => ipcRenderer.invoke('workspace:open-web'),
};

contextBridge.exposeInMainWorld('dmsClient', api);

declare global {
  interface Window {
    dmsClient: typeof api;
  }
}

