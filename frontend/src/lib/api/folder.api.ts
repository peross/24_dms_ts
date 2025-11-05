import apiClient from './client';

export interface Folder {
  folderId: number;
  name: string;
  path: string;
  parentId?: number | null;
  userId: number;
  permissions: string;
  createdAt: string;
  updatedAt: string;
  size?: number;
  children?: Folder[];
}

export interface FolderTreeNode {
  folderId: number;
  name: string;
  path: string;
  parentId?: number | null;
  permissions: string;
  createdAt: string;
  updatedAt?: string;
  size?: number;
  children?: FolderTreeNode[];
}

export interface CreateFolderData {
  name: string;
  parentId?: number | null;
}

export interface UpdateFolderData {
  name?: string;
  parentId?: number | null;
}

export const folderApi = {
  /**
   * Get folder tree structure
   */
  getFolderTree: async (): Promise<{ tree: FolderTreeNode[] }> => {
    const response = await apiClient.get<{ tree: FolderTreeNode[] }>('/folders/tree');
    return response.data;
  },

  /**
   * Get root folders (folders with no parent)
   */
  getRootFolders: async (): Promise<{ folders: Folder[] }> => {
    const response = await apiClient.get<{ folders: Folder[] }>('/folders/root');
    return response.data;
  },

  /**
   * Get folder by ID
   */
  getFolder: async (folderId: number): Promise<{ folder: Folder }> => {
    const response = await apiClient.get<{ folder: Folder }>(`/folders/${folderId}`);
    return response.data;
  },

  /**
   * Get children of a folder
   */
  getFolderChildren: async (folderId: number): Promise<{ folders: Folder[] }> => {
    const response = await apiClient.get<{ folders: Folder[] }>(`/folders/${folderId}/children`);
    return response.data;
  },

  /**
   * Create a new folder
   */
  createFolder: async (data: CreateFolderData): Promise<{ folder: Folder }> => {
    const response = await apiClient.post<{ folder: Folder }>('/folders', data);
    return response.data;
  },

  /**
   * Update folder
   */
  updateFolder: async (folderId: number, data: UpdateFolderData): Promise<{ folder: Folder }> => {
    const response = await apiClient.put<{ folder: Folder }>(`/folders/${folderId}`, data);
    return response.data;
  },

  /**
   * Delete folder
   */
  deleteFolder: async (folderId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/folders/${folderId}`);
    return response.data;
  },
};

