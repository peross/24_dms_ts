import { Response } from 'express';
import FolderService from '../services/folder.service';
import { AuthRequest } from '../middleware/auth.middleware';
import UserService from '../services/user.service';
import SystemFolderService from '../services/system-folder.service';
import { SystemFolderType } from '../models/system-folder.model';
import Folder from '../models/folder.model';
import { eventBus, AppEvent } from '../events/event-bus';

export class FolderController {
  private serializeFolder(folder: Folder) {
    return {
      folderId: folder.folderId,
      name: folder.name,
      parentId: folder.parentId ?? null,
      systemFolderId: folder.systemFolderId ?? null,
      path: folder.path,
    };
  }

  /**
   * Create a new folder
   */
  async createFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, parentId, systemFolderId } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'Folder name is required' });
        return;
      }

      // Get user roles for permission checking
      const userRoles = req.user.roles || await UserService.getUserRoles(req.user.userId);

      // Determine systemFolderId:
      // 1. If parentId is provided, inherit from parent
      // 2. If systemFolderId is provided in request, use it
      // 3. Otherwise, default to "My Folders"
      let finalSystemFolderId: number;
      
      if (parentId) {
        const parent = await Folder.findByPk(parentId);
        if (!parent) {
          res.status(404).json({ error: 'Parent folder not found' });
          return;
        }
        finalSystemFolderId = parent.systemFolderId;
      } else if (systemFolderId) {
        finalSystemFolderId = systemFolderId;
      } else {
        // Default to "My Folders"
        const myFoldersId = await SystemFolderService.getSystemFolderId(SystemFolderType.MY_FOLDERS);
        if (!myFoldersId) {
          res.status(500).json({ error: 'System folder configuration error' });
          return;
        }
        finalSystemFolderId = myFoldersId;
      }

      const folder = await FolderService.createFolder({
        name: name.trim(),
        parentId: parentId || undefined,
        userId: req.user.userId,
        systemFolderId: finalSystemFolderId,
        userRoles,
      });

      console.log(`[FolderController] Created folder ${folder.folderId} for user ${req.user.userId}`);
      eventBus.emit(AppEvent.FOLDER_CREATED, {
        userId: req.user.userId,
        folder: this.serializeFolder(folder),
      });

      res.status(201).json({ folder });
    } catch (error: any) {
      if (error.message === 'Folder with this name already exists in this location') {
        res.status(409).json({ error: error.message });
      } else if (error.message === 'Parent folder not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to create folder' });
      }
    }
  }

  /**
   * Get folder by ID
   */
  async getFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const folderId = parseInt(req.params.id);
      if (isNaN(folderId)) {
        res.status(400).json({ error: 'Invalid folder ID' });
        return;
      }

      const folder = await FolderService.getFolderById(folderId, req.user.userId);

      if (!folder) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }

      res.status(200).json({ folder });
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Failed to get folder' });
      }
    }
  }

  /**
   * Get root folders (folders with no parent)
   */
  async getRootFolders(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const folders = await FolderService.getRootFolders(req.user.userId);
      res.status(200).json({ folders });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get folders' });
    }
  }

  /**
   * Get folder tree structure
   */
  async getFolderTree(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tree = await FolderService.getFolderTree(req.user.userId);
      res.status(200).json({ tree });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get folder tree' });
    }
  }

  /**
   * Get children of a folder
   */
  async getFolderChildren(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const folderId = parseInt(req.params.id);
      if (isNaN(folderId)) {
        res.status(400).json({ error: 'Invalid folder ID' });
        return;
      }

      const folders = await FolderService.getFolderChildren(folderId, req.user.userId);
      res.status(200).json({ folders });
    } catch (error: any) {
      if (error.message === 'Access denied' || error.message === 'Folder not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Failed to get folder children' });
      }
    }
  }

  /**
   * Update folder
   */
  async updateFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const folderId = parseInt(req.params.id);
      if (isNaN(folderId)) {
        res.status(400).json({ error: 'Invalid folder ID' });
        return;
      }

      const { name, parentId } = req.body;

      const updateData: any = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
          res.status(400).json({ error: 'Folder name cannot be empty' });
          return;
        }
        updateData.name = name.trim();
      }
      if (parentId !== undefined) {
        updateData.parentId = parentId === null ? null : parentId;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const folder = await FolderService.updateFolder(folderId, req.user.userId, updateData);
      console.log(`[FolderController] Updated folder ${folder.folderId} for user ${req.user.userId}`);
      eventBus.emit(AppEvent.FOLDER_UPDATED, {
        userId: req.user.userId,
        folder: this.serializeFolder(folder),
      });
      res.status(200).json({ folder });
    } catch (error: any) {
      if (error.message === 'Access denied' || error.message === 'Folder not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Folder with this name already exists in this location') {
        res.status(409).json({ error: error.message });
      } else if (error.message.includes('Cannot move')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to update folder' });
      }
    }
  }

  /**
   * Delete folder
   */
  async deleteFolder(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const folderId = parseInt(req.params.id);
      if (isNaN(folderId)) {
        res.status(400).json({ error: 'Invalid folder ID' });
        return;
      }

      const deletedFolder = await FolderService.deleteFolder(folderId, req.user.userId);

      console.log(`[FolderController] Deleted folder ${folderId} for user ${req.user.userId}`);
      eventBus.emit(AppEvent.FOLDER_DELETED, {
        userId: req.user.userId,
        folder: this.serializeFolder(deletedFolder),
      });

      res.status(200).json({ message: 'Folder deleted successfully' });
    } catch (error: any) {
      if (error.message === 'Access denied' || error.message === 'Folder not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Failed to delete folder' });
      }
    }
  }
}

export default new FolderController();

