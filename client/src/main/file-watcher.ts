import chokidar, { FSWatcher } from 'chokidar';
import path from 'node:path';
import { fileSyncService } from './services/file-sync-service';
import { folderService } from './services/folder-service';
import { getMyFoldersPath } from './workspace-manager';
import { configStore } from './config-store';
import { normalizePath } from './utils/path';
import { MY_FOLDERS_SYSTEM_ID } from '../shared/constants';
import { workspaceSyncService } from './services/workspace-sync-service';

let watcher: FSWatcher | null = null;
let suppressEvents = false;

export const setWatcherSuppressed = (value: boolean): void => {
  suppressEvents = value;
};

export async function startFileWatcher(rootPath: string): Promise<void> {
  await stopFileWatcher();

  folderService.setWorkspaceRoot(rootPath);
  const myFoldersPath = getMyFoldersPath(rootPath);
  configStore.setFolderId(myFoldersPath, MY_FOLDERS_SYSTEM_ID);

  setWatcherSuppressed(true);
  try {
    await workspaceSyncService.syncFromRemote(rootPath);
  } catch (error) {
    console.warn('Initial workspace sync failed; watcher will start without local cache', error);
  } finally {
    setWatcherSuppressed(false);
  }

  watcher = chokidar.watch(myFoldersPath, {
    persistent: true,
    ignoreInitial: true,
    depth: Infinity,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher.on('addDir', async (dirPath) => {
    if (suppressEvents) {
      return;
    }
    try {
      if (path.basename(dirPath).startsWith('.')) {
        return;
      }
      await fileSyncService.syncNewFolder(dirPath);
    } catch (error) {
      console.error('Failed to sync folder', dirPath, error);
    }
  });

  watcher.on('add', async (filePath) => {
    if (suppressEvents) {
      return;
    }
    try {
      if (path.basename(filePath).startsWith('.')) {
        return;
      }
      await fileSyncService.syncNewFile(filePath);
    } catch (error) {
      console.error('Failed to sync file', filePath, error);
    }
  });

  watcher.on('unlink', async (filePath) => {
    if (suppressEvents) {
      return;
    }
    if (path.basename(filePath).startsWith('.')) {
      return;
    }

    try {
      await fileSyncService.deleteFile(filePath);
    } catch (error) {
      console.error('Failed to delete remote file', filePath, error);
    } finally {
      workspaceSyncService.removeFileEntry(filePath);
    }
  });

  watcher.on('unlinkDir', async (dirPath) => {
    if (suppressEvents) {
      return;
    }
    if (path.basename(dirPath).startsWith('.')) {
      return;
    }

    const normalizedDir = normalizePath(dirPath);
    const myFoldersPathNormalized = normalizePath(myFoldersPath);

    if (normalizedDir === myFoldersPathNormalized) {
      configStore.clearMappingsUnder(normalizedDir);
      workspaceSyncService.removeFolderEntries(normalizedDir);
      return;
    }

    try {
      await fileSyncService.deleteFolder(dirPath);
    } catch (error) {
      console.error('Failed to delete remote folder', dirPath, error);
    } finally {
      configStore.clearMappingsUnder(normalizedDir);
      workspaceSyncService.removeFolderEntries(dirPath);
    }
  });
}

export async function stopFileWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}

