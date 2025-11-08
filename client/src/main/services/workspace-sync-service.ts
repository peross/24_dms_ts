import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
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
    const expectedFolders = new Set<string>();
    const expectedFiles = new Set<string>();

    expectedFolders.add(normalizedRoot);

    await ensureWorkspaceStructure(normalizedRoot);

    // Clear existing mappings under workspace to avoid stale folder IDs
    configStore.clearMappingsUnder(normalizedRoot);

    const response = await apiClient.axios.get<{ tree: FolderTreeNode[] }>('/folders/tree');
    const tree = response.data?.tree ?? [];

    this.cachedFiles = [];

    for (const [systemFolderId, systemFolderName] of Object.entries(DEFAULT_SYSTEM_FOLDER_NAMES)) {
      const baseDir = path.join(normalizedRoot, systemFolderName);
      await fs.mkdir(baseDir, { recursive: true });
      expectedFolders.add(normalizePath(baseDir));

      if (Number(systemFolderId) === MY_FOLDERS_SYSTEM_ID) {
        configStore.setFolderId(normalizePath(baseDir), MY_FOLDERS_SYSTEM_ID);
      }
    }

    const tasks: Array<Promise<void>> = [];

    for (const systemNode of tree) {
      const systemFolderName = systemNode.name;
      const systemFolderBase = path.join(normalizedRoot, systemFolderName);

      tasks.push(this.syncNode(systemNode, systemFolderBase, normalizedRoot, systemFolderName, expectedFolders, expectedFiles));
    }

    await Promise.all(tasks);

    await this.pruneExtraneousEntries(normalizedRoot, expectedFolders, expectedFiles);

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
    systemFolderName: string,
    expectedFolders: Set<string>,
    expectedFiles: Set<string>
  ): Promise<void> {
    const { folderId, name, children } = node;

    if (folderId) {
      const localDir = path.join(currentPath, name);
      const normalizedDir = normalizePath(localDir);

      await fs.mkdir(localDir, { recursive: true });
      expectedFolders.add(normalizedDir);

      configStore.setFolderId(normalizedDir, folderId);

      await this.syncFilesForFolder(folderId, localDir, rootPath, systemFolderName, expectedFiles);

      if (children && children.length > 0) {
        for (const child of children) {
          await this.syncNode(child, localDir, rootPath, systemFolderName, expectedFolders, expectedFiles);
        }
      }
    } else if (children && children.length > 0) {
      for (const child of children) {
        await this.syncNode(child, currentPath, rootPath, systemFolderName, expectedFolders, expectedFiles);
      }
    }
  }

  private async syncFilesForFolder(
    folderId: number,
    localDir: string,
    rootPath: string,
    systemFolderName: string,
    expectedFiles: Set<string>
  ): Promise<void> {
    try {
      const response = await apiClient.axios.get<{ files: FileDto[] }>('/files', {
        params: { folderId },
      });

      const files = response.data?.files ?? [];

      for (const file of files) {
        const localFilePath = path.join(localDir, file.name);
        const normalizedLocalFilePath = normalizePath(localFilePath);
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

        expectedFiles.add(normalizedLocalFilePath);

        this.cachedFiles.push({
          fileId: file.fileId,
          name: file.name,
          size: Number(file.size ?? 0),
          updatedAt: file.updatedAt,
          systemFolder: systemFolderName,
          relativePath,
          absolutePath: normalizedLocalFilePath,
          mimeType: file.mimeType,
        });
      }
    } catch (error) {
      console.error('Failed to sync files for folder', folderId, error);
    }
  }

  private async pruneExtraneousEntries(
    rootPath: string,
    expectedFolders: Set<string>,
    expectedFiles: Set<string>
  ): Promise<void> {
    const traverse = async (currentPath: string): Promise<void> => {
      let entries: Dirent[];
      try {
        entries = await fs.readdir(currentPath, { withFileTypes: true });
      } catch (error: any) {
        if (error?.code === 'ENOENT') {
          return;
        }
        throw error;
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const normalizedPath = normalizePath(fullPath);

        if (entry.isDirectory()) {
          if (expectedFolders.has(normalizedPath)) {
            await traverse(fullPath);
            continue;
          }
          await this.removeLocalDirectory(fullPath);
          continue;
        }

        if (entry.isFile() && !expectedFiles.has(normalizedPath)) {
          await this.removeLocalFile(fullPath);
        }
      }
    };

    await traverse(rootPath);
  }

  private async removeLocalDirectory(fullPath: string): Promise<void> {
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to remove local folder during sync prune', fullPath, error);
    }
  }

  private async removeLocalFile(fullPath: string): Promise<void> {
    try {
      await fs.rm(fullPath, { force: true });
    } catch (error) {
      console.warn('Failed to remove local file during sync prune', fullPath, error);
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

