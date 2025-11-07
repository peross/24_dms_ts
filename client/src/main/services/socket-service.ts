import { io, Socket } from 'socket.io-client';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { configStore } from '../config-store';
import { deriveSocketUrl, normalizeApiBaseUrl } from '../utils/url';
import { workspaceSyncService } from './workspace-sync-service';
import { setWatcherSuppressed } from '../file-watcher';
import { ensureWorkspaceStructure } from '../workspace-manager';
import { normalizePath } from '../utils/path';

type SocketInstance = Socket<DefaultEventsMap, DefaultEventsMap>;

let socket: SocketInstance | null = null;
let currentToken: string | undefined;
let currentSocketUrl: string | undefined;
let resyncTimer: NodeJS.Timeout | null = null;
let resyncInProgress = false;
let resyncQueued = false;

const RESYNC_DEBOUNCE_MS = 750;

const scheduleResync = (delay = RESYNC_DEBOUNCE_MS): void => {
  if (resyncTimer) {
    clearTimeout(resyncTimer);
  }
  console.log(`[socket] scheduleResync in ${delay}ms`);
  resyncTimer = setTimeout(async () => {
    await performResync();
  }, delay);
};

const performResync = async (): Promise<void> => {
  if (resyncInProgress) {
    resyncQueued = true;
    console.log('[socket] resync already in progress, queueing another run');
    return;
  }

  const workspacePath = configStore.getWorkspacePath();
  if (!workspacePath) {
    return;
  }

  resyncInProgress = true;
  do {
    resyncQueued = false;
    try {
      const normalized = normalizePath(workspacePath);
      await ensureWorkspaceStructure(normalized);
      setWatcherSuppressed(true);
      console.log('[socket] performing workspace resync');
      await workspaceSyncService.syncFromRemote(normalized);
    } catch (error) {
      console.error('Failed to resync workspace from server', error);
    } finally {
      setWatcherSuppressed(false);
    }
  } while (resyncQueued);
  resyncInProgress = false;
};

const registerEventHandlers = (activeSocket: SocketInstance): void => {
  activeSocket.on('sync:ready', () => {
    console.log('[socket] received sync:ready');
    scheduleResync(0);
  });

  const resyncEvents = [
    'folder.created',
    'folder.updated',
    'folder.deleted',
    'file.created',
    'file.updated',
    'file.deleted',
  ];

  for (const eventName of resyncEvents) {
    activeSocket.on(eventName, () => {
      console.log(`[socket] received event ${eventName}`);
      scheduleResync();
    });
  }

  activeSocket.on('connect', () => {
    console.log('[socket] connected to server');
    scheduleResync(100);
  });

  activeSocket.on('connect_error', (error) => {
    console.warn('Socket connection error', error.message);
  });
};

const cleanupSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

const initializeSocket = (): void => {
  if (!currentToken || !currentSocketUrl) {
    console.log('[socket] missing token or URL, cleaning up socket connection');
    cleanupSocket();
    return;
  }

  if (socket) {
    // Update auth token and reconnect if necessary
    socket.auth = { token: currentToken };
    if (!socket.connected) {
      console.log('[socket] reconnecting existing socket');
      socket.connect();
    }
    return;
  }

  console.log(`[socket] connecting to ${currentSocketUrl}`);
  socket = io(currentSocketUrl, {
    auth: { token: currentToken },
    transports: ['websocket'],
  });

  registerEventHandlers(socket);
};

export const setApiBaseUrl = (apiBaseUrl?: string): void => {
  if (!apiBaseUrl) {
    currentSocketUrl = undefined;
    cleanupSocket();
    return;
  }

  const normalized = normalizeApiBaseUrl(apiBaseUrl);
  currentSocketUrl = deriveSocketUrl(normalized) ?? undefined;

  if (socket) {
    cleanupSocket();
  }
  initializeSocket();
};

export const setAuthToken = (token?: string): void => {
  currentToken = token;
  if (!token) {
    cleanupSocket();
    return;
  }

  initializeSocket();
};

export const disconnectSocket = (): void => {
  cleanupSocket();
};

export const requestResync = (): void => {
  scheduleResync();
};

export const getSocketStatus = (): { connected: boolean; url?: string } => ({
  connected: Boolean(socket?.connected),
  url: currentSocketUrl,
});

