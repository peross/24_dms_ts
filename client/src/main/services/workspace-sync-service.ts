import fs from 'node:fs/promises';
import path from 'node:path';
import { apiClient } from '../api/client';
import { configStore } from '../config-store';
import { ensureWorkspaceStructure } from '../workspace-manager';
import { DEFAULT_SYSTEM_FOLDER_NAMES, MY_FOLDERS_SYSTEM_ID } from '../../shared/constants';
import { normalizePath } from '../utils/path';
import { SyncedFileEntry } from '../../shared/types';

interface FolderTreeNode {
  folderId: number | null;
  name: string;
  path: string;
  children?: FolderTreeNode[];
  systemFolderType?: 'GENERAL' | 'MY_FOLDERS' | 'SHARED_WITH_ME' | null;
}

interface FileDto {
  fileId: number;
  name: string;
  size: number;
  updatedAt: string;
  mimeType: string;
  folderId?: number | null;
  path: string;
}

class WorkspaceSyncService {
  private cachedFiles: SyncedFileEntry[] = [];
  private lastSyncedAt: Date | null = null;

  getFiles(): SyncedFileEntry[] {
    return this.cachedFiles;
  }

  getLastSyncedAt(): Date | null {
    return this.lastSyncedAt;
  }

  async syncFromRemote(rootPath: string): Promise<void> {
    const normalizedRoot = normalizePath(rootPath);

    await ensureWorkspaceStructure(normalizedRoot);

    // Clear existing mappings under workspace to avoid stale folder IDs
    configStore.clearMappingsUnder(normalizedRoot);

    const response = await apiClient.axios.get<{ tree: FolderTreeNode[] }>('/folders/tree');
    const tree = response.data?.tree ?? [];

    this.cachedFiles = [];

    for (const [systemFolderId, systemFolderName] of Object.entries(DEFAULT_SYSTEM_FOLDER_NAMES)) {
      const baseDir = path.join(normalizedRoot, systemFolderName);
      await fs.mkdir(baseDir, { recursive: true });

      if (Number(systemFolderId) === MY_FOLDERS_SYSTEM_ID) {
        configStore.setFolderId(normalizePath(baseDir), MY_FOLDERS_SYSTEM_ID);
      }
    }

    const tasks: Array<Promise<void>> = [];

    for (const systemNode of tree) {
      const systemFolderName = systemNode.name;
      const systemFolderBase = path.join(normalizedRoot, systemFolderName);

      tasks.push(this.syncNode(systemNode, systemFolderBase, normalizedRoot, systemFolderName));
    }

    await Promise.all(tasks);

    this.lastSyncedAt = new Date();
  }

  removeFileEntry(localPath: string): void {
    const normalized = normalizePath(localPath);
    this.cachedFiles = this.cachedFiles.filter((file) => file.absolutePath !== normalized);
  }

  removeFolderEntries(localPath: string): void {
    const normalized = normalizePath(localPath);
    const prefix = `${normalized}/`;
    this.cachedFiles = this.cachedFiles.filter((file) => {
      const filePath = normalizePath(file.absolutePath);
      return filePath !== normalized && !filePath.startsWith(prefix);
    });
  }

  private async syncNode(
    node: FolderTreeNode,
    currentPath: string,
    rootPath: string,
    systemFolderName: string
  ): Promise<void> {
    const { folderId, name, children } = node;

    if (folderId) {
      const localDir = path.join(currentPath, name);
      const normalizedDir = normalizePath(localDir);

      await fs.mkdir(localDir, { recursive: true });

      configStore.setFolderId(normalizedDir, folderId);

      await this.syncFilesForFolder(folderId, localDir, rootPath, systemFolderName);

      if (children && children.length > 0) {
        for (const child of children) {
          await this.syncNode(child, localDir, rootPath, systemFolderName);
        }
      }
    } else if (children && children.length > 0) {
      for (const child of children) {
        await this.syncNode(child, currentPath, rootPath, systemFolderName);
      }
    }
  }

  private async syncFilesForFolder(
    folderId: number,
    localDir: string,
    rootPath: string,
    systemFolderName: string
  ): Promise<void> {
    try {
      const response = await apiClient.axios.get<{ files: FileDto[] }>('/files', {
        params: { folderId },
      });

      const files = response.data?.files ?? [];

      for (const file of files) {
        const localFilePath = path.join(localDir, file.name);
        const normalizedPath = normalizePath(localFilePath);
        const relativePath = normalizePath(path.relative(rootPath, localFilePath));

        const shouldDownload = await this.shouldDownloadFile(localFilePath, file);
        if (shouldDownload) {
          const download = await apiClient.axios.get<ArrayBuffer>(`/files/${file.fileId}/download`, {
            responseType: 'arraybuffer',
          });

          await fs.writeFile(localFilePath, Buffer.from(download.data));

          const remoteUpdated = new Date(file.updatedAt);
          await fs.utimes(localFilePath, remoteUpdated, remoteUpdated);
        }

        this.cachedFiles.push({
          fileId: file.fileId,
          name: file.name,
          size: Number(file.size ?? 0),
          updatedAt: file.updatedAt,
          systemFolder: systemFolderName,
          relativePath,
          absolutePath: normalizedPath,
          mimeType: file.mimeType,
        });
      }
    } catch (error) {
      console.error('Failed to sync files for folder', folderId, error);
    }
  }

  private async shouldDownloadFile(localFilePath: string, file: FileDto): Promise<boolean> {
    try {
      const stats = await fs.stat(localFilePath);
      const remoteUpdated = new Date(file.updatedAt).getTime();

      if (stats.size !== Number(file.size ?? 0)) {
        return true;
      }

      const mtimeDiff = Math.abs(stats.mtime.getTime() - remoteUpdated);
      return mtimeDiff > 2000; // 2 seconds tolerance
    } catch {
      return true;
    }
  }
}

export const workspaceSyncService = new WorkspaceSyncService();

