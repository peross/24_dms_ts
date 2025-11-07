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

export async function startFileWatcher(rootPath: string): Promise<void> {
  await stopFileWatcher();

  folderService.setWorkspaceRoot(rootPath);
  const myFoldersPath = getMyFoldersPath(rootPath);
  configStore.setFolderId(myFoldersPath, MY_FOLDERS_SYSTEM_ID);

  try {
    await workspaceSyncService.syncFromRemote(rootPath);
  } catch (error) {
    console.warn('Initial workspace sync failed; watcher will start without local cache', error);
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

