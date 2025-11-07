import fs from 'node:fs/promises';
import path from 'node:path';
import FormData from 'form-data';
import { folderService } from './folder-service';
import { apiClient } from '../api/client';
import { TaskQueue } from '../utils/task-queue';
import { normalizePath } from '../utils/path';
import { MY_FOLDERS_SYSTEM_ID } from '../../shared/constants';

class FileSyncService {
  private readonly queue = new TaskQueue();

  async syncNewFolder(localPath: string): Promise<number> {
    return this.queue.enqueue(async () => {
      return folderService.ensureRemoteFolder(localPath);
    });
  }

  async syncNewFile(localPath: string): Promise<void> {
    await this.queue.enqueue(async () => {
      const folderPath = path.dirname(localPath);
      const folderId = await folderService.ensureRemoteFolder(folderPath);
      await this.uploadFile(localPath, folderId);
    });
  }

  private async uploadFile(localPath: string, folderId: number): Promise<void> {
    const fileBuffer = await fs.readFile(localPath);
    const form = new FormData();
    form.append('files', fileBuffer, {
      filename: path.basename(localPath),
    });
    form.append('folderId', folderId.toString());

    await apiClient.axios.post('/files/upload', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  async deleteFile(localPath: string): Promise<void> {
    await this.queue.enqueue(async () => {
      const normalizedFilePath = normalizePath(localPath);
      const parentPath = normalizePath(path.dirname(normalizedFilePath));
      const folderId = await folderService.resolveFolderId(parentPath);

      if (!folderId || folderId === MY_FOLDERS_SYSTEM_ID) {
        return;
      }

      const response = await apiClient.axios.get<{ files: Array<{ fileId: number; name: string }> }>('/files', {
        params: { folderId },
      });

      const fileName = path.basename(normalizedFilePath);
      const match = response.data?.files?.find((file) => file.name === fileName);

      if (!match) {
        return;
      }

      await apiClient.axios.delete(`/files/${match.fileId}`);
    });
  }

  async deleteFolder(localPath: string): Promise<void> {
    await this.queue.enqueue(async () => {
      await folderService.deleteRemoteFolder(localPath);
    });
  }
}

export const fileSyncService = new FileSyncService();

