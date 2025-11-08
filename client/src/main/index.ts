/* eslint-disable @typescript-eslint/prefer-top-level-await */
import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { registerIpcHandlers } from './ipc-handlers';
import { authService } from './services/auth-service';
import { configStore, AuthState } from './config-store';
import { startFileWatcher } from './file-watcher';
import type { NotificationItem } from './services/notification-service';
import { onNotificationCreated, onNotificationUpdated } from './services/socket-service';

const isDev = process.env.NODE_ENV === 'development' || Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

function getPreloadPath(): string {
  return path.join(__dirname, '../preload/index.js');
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (isDev && devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function broadcastAuthState(state: AuthState | undefined): void {
  const payload = {
    isAuthenticated: Boolean(state?.accessToken),
    email: state?.email ?? null,
    displayName: state?.displayName ?? null,
  };

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('auth:state-changed', payload);
  }
}

function broadcastNotification(channel: 'notification:created' | 'notification:updated', notification: NotificationItem): void {
  const payload = {
    ...notification,
    createdAt:
      typeof notification.createdAt === 'string'
        ? notification.createdAt
        : new Date(notification.createdAt).toISOString(),
  };

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

async function bootstrap(): Promise<void> {
  authService.initialize();
  authService.onAuthStateChanged((state) => {
    broadcastAuthState(state);
  });
  onNotificationCreated((notification) => {
    broadcastNotification('notification:created', notification);
  });
  onNotificationUpdated((notification) => {
    broadcastNotification('notification:updated', notification);
  });
  registerIpcHandlers();
  await createWindow();
  broadcastAuthState(authService.getCurrentAuthState());

  const workspacePath = configStore.getWorkspacePath();
  const auth = configStore.getAuthState();
  if (workspacePath && auth?.accessToken) {
    void startFileWatcher(workspacePath).catch((error) => {
      console.warn('Failed to initialize watcher on startup', error);
    });
  }
}

void (async () => {
  await app.whenReady();
  await bootstrap();

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      void createWindow();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
})();

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

