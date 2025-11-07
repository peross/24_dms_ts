import path from 'node:path';
import { apiClient } from '../api/client';
import { configStore } from '../config-store';
import { getMyFoldersPath } from '../workspace-manager';
import { normalizePath, isSubPath } from '../utils/path';
import { MY_FOLDERS_SYSTEM_ID } from '../../shared/constants';

interface FolderResponse {
  folder?: {
    folderId: number;
    name: string;
    parentId?: number | null;
    systemFolderId: number;
  };
  folders?: Array<{
    folderId: number;
    name: string;
    parentId?: number | null;
    systemFolderId: number;
  }>;
}

class FolderService {
  private myFoldersPath?: string;

  setWorkspaceRoot(rootPath: string): void {
    this.myFoldersPath = getMyFoldersPath(rootPath);
    configStore.setFolderId(this.myFoldersPath, MY_FOLDERS_SYSTEM_ID);
  }

  async ensureRemoteFolder(localPath: string): Promise<number> {
    if (!this.myFoldersPath) {
      throw new Error('Workspace root is not initialized');
    }

    const normalized = normalizePath(localPath);
    const existing = configStore.getFolderId(normalized);
    if (existing) {
      return existing;
    }

    if (normalized === normalizePath(this.myFoldersPath)) {
      return MY_FOLDERS_SYSTEM_ID;
    }

    const parentPath = normalizePath(path.dirname(normalized));
    const parentId = await this.ensureRemoteFolder(parentPath);

    const name = path.basename(normalized);

    const payload: Record<string, unknown> = {
      name,
      systemFolderId: MY_FOLDERS_SYSTEM_ID,
    };

    if (parentId !== MY_FOLDERS_SYSTEM_ID) {
      payload.parentId = parentId;
    }

    try {
      const response = await apiClient.axios.post<FolderResponse>('/folders', payload);
      const folderId = response.data.folder?.folderId;
      if (!folderId) {
        throw new Error('Invalid response while creating folder');
      }
      configStore.setFolderId(normalized, folderId);
      return folderId;
    } catch (error: any) {
      if (error.response?.status === 409) {
        const existingFolderId = await this.lookupExistingFolder(parentId, name);
        if (existingFolderId) {
          configStore.setFolderId(normalized, existingFolderId);
          return existingFolderId;
        }
      }
      throw error;
    }
  }

  async lookupExistingFolder(parentId: number, name: string): Promise<number | undefined> {
    if (parentId === MY_FOLDERS_SYSTEM_ID) {
      const response = await apiClient.axios.get<FolderResponse>('/folders/root');
      const folders = response.data?.folders ?? [];
      const match = folders.find((folder) => folder.name === name && folder.systemFolderId === MY_FOLDERS_SYSTEM_ID);
      return match?.folderId;
    }

    const response = await apiClient.axios.get<FolderResponse>(`/folders/${parentId}/children`);
    const folders = response.data?.folders ?? [];
    return folders.find((folder) => folder.name === name)?.folderId;
  }

  removeFolder(localPath: string): void {
    configStore.removeFolderId(localPath);
  }

  async resolveFolderId(localPath: string): Promise<number | undefined> {
    const normalized = normalizePath(localPath);
    const cached = configStore.getFolderId(normalized);
    if (cached) {
      return cached;
    }

    if (!this.myFoldersPath) {
      return undefined;
    }

    const root = normalizePath(this.myFoldersPath);
    if (!isSubPath(root, normalized)) {
      return undefined;
    }

    const relative = normalized.slice(root.length).replace(/^\//, '');
    if (!relative) {
      return MY_FOLDERS_SYSTEM_ID;
    }

    const segments = relative.split('/').filter(Boolean);
    let parentId = MY_FOLDERS_SYSTEM_ID;

    for (const segment of segments) {
      const existingId = await this.lookupExistingFolder(parentId, segment);
      if (!existingId) {
        return undefined;
      }
      parentId = existingId;
    }

    configStore.setFolderId(normalized, parentId);
    return parentId;
  }

  async deleteRemoteFolder(localPath: string): Promise<void> {
    const normalized = normalizePath(localPath);
    const folderId = await this.resolveFolderId(normalized);

    if (!folderId || folderId === MY_FOLDERS_SYSTEM_ID) {
      return;
    }

    try {
      await apiClient.axios.delete(`/folders/${folderId}`);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        throw error;
      }
    }
    configStore.removeFolderId(normalized);
  }
}

export const folderService = new FolderService();

