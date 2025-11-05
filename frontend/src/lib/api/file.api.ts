import apiClient from './client';

export interface FileData {
  fileId: number;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  folderId?: number;
  userId: number;
  permissions: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileVersionData {
  versionId: number;
  fileId: number;
  version: number;
  path: string;
  size: number;
  mimeType: string;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadFileData {
  files: File[];
  folderId?: number;
  permissions?: string;
}

export interface UpdateFileData {
  name?: string;
  folderId?: number | null;
  permissions?: string;
}

export const fileApi = {
  uploadFile: async (data: UploadFileData): Promise<{ file?: FileData; files?: FileData[] }> => {
    const formData = new FormData();
    
    // Append all files
    data.files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (data.folderId) {
      formData.append('folderId', data.folderId.toString());
    }
    
    // Always send filenames separately to preserve UTF-8 encoding
    // This avoids encoding issues with multipart form data filename headers
    const names: string[] = [];
    data.files.forEach((file) => {
      names.push(file.name);
    });
    names.forEach((name) => {
      formData.append('names', name);
    });
    
    if (data.permissions) {
      formData.append('permissions', data.permissions);
    }

    const response = await apiClient.post<{ file?: FileData; files?: FileData[] }>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getFiles: async (folderId?: number | null): Promise<{ files: FileData[] }> => {
    const params = folderId !== undefined ? { folderId: folderId || 'null' } : {};
    const response = await apiClient.get<{ files: FileData[] }>('/files', { params });
    return response.data;
  },

  getFile: async (fileId: number): Promise<{ file: FileData }> => {
    const response = await apiClient.get<{ file: FileData }>(`/files/${fileId}`);
    return response.data;
  },

  getFileVersions: async (fileId: number): Promise<{ versions: FileVersionData[] }> => {
    const response = await apiClient.get<{ versions: FileVersionData[] }>(`/files/${fileId}/versions`);
    return response.data;
  },

  uploadNewVersion: async (fileId: number, file: File): Promise<{ file: FileData }> => {
    const formData = new FormData();
    formData.append('files', file);
    // Send filename separately to preserve UTF-8 encoding
    formData.append('names', file.name);

    const response = await apiClient.post<{ file: FileData }>(`/files/${fileId}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadFile: async (fileId: number, version?: number): Promise<Blob> => {
    const params = version ? { version } : {};
    const response = await apiClient.get<Blob>(`/files/${fileId}/download`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  updateFile: async (fileId: number, data: UpdateFileData): Promise<{ file: FileData }> => {
    const response = await apiClient.put<{ file: FileData }>(`/files/${fileId}`, data);
    return response.data;
  },

  deleteFile: async (fileId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/files/${fileId}`);
    return response.data;
  },
};

