import { Op } from 'sequelize';
import Folder from '../models/folder.model';
import File from '../models/file.model';

export interface CreateFolderDto {
  name: string;
  parentId?: number;
  userId: number;
}

export interface UpdateFolderDto {
  name?: string;
  parentId?: number;
}

export class FolderService {
  /**
   * Create a new folder
   */
  async createFolder(data: CreateFolderDto): Promise<Folder> {
    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await Folder.findByPk(data.parentId);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
      // Ensure parent belongs to the same user
      if (parent.userId !== data.userId) {
        throw new Error('Cannot create folder in another user\'s folder');
      }
    }

    // Check if folder with same name already exists in the same parent
    const whereClause: any = {
      name: data.name,
      userId: data.userId,
    };
    if (data.parentId) {
      whereClause.parentId = data.parentId;
    } else {
      whereClause[Op.or] = [
        { parentId: null },
        { parentId: { [Op.is]: null } },
      ];
    }

    const existingFolder = await Folder.findOne({
      where: whereClause,
    });

    if (existingFolder) {
      throw new Error('Folder with this name already exists in this location');
    }

    // Build path
    let path = data.name;
    if (data.parentId) {
      const parent = await Folder.findByPk(data.parentId);
      if (parent) {
        path = `${parent.path}/${data.name}`;
      }
    }

    // Create folder
    const folder = await Folder.create({
      name: data.name,
      path,
      parentId: data.parentId,
      userId: data.userId,
      permissions: '755',
    });

    return folder;
  }

  /**
   * Get folder by ID
   */
  async getFolderById(folderId: number, userId: number): Promise<Folder | null> {
    const folder = await Folder.findByPk(folderId, {
      include: [
        {
          model: Folder,
          as: 'children',
          attributes: ['folderId', 'name', 'path', 'parentId', 'createdAt'],
        },
      ],
    });

    if (!folder) {
      return null;
    }

    // Ensure folder belongs to user
    if (folder.userId !== userId) {
      throw new Error('Access denied');
    }

    return folder;
  }

  /**
   * Get all root folders for a user (folders with no parent)
   */
  async getRootFolders(userId: number): Promise<Folder[]> {
    return await Folder.findAll({
      where: {
        userId,
        [Op.or]: [
          { parentId: null },
          { parentId: { [Op.is]: null } },
        ],
      } as any,
      include: [
        {
          model: Folder,
          as: 'children',
          attributes: ['folderId', 'name', 'path', 'parentId', 'createdAt'],
        },
      ],
      order: [['name', 'ASC']],
    });
  }

  /**
   * Get children of a folder
   */
  async getFolderChildren(folderId: number, userId: number): Promise<Folder[]> {
    const folder = await Folder.findByPk(folderId);
    
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Ensure folder belongs to user
    if (folder.userId !== userId) {
      throw new Error('Access denied');
    }

    return await Folder.findAll({
      where: {
        parentId: folderId,
        userId,
      },
      include: [
        {
          model: Folder,
          as: 'children',
          attributes: ['folderId', 'name', 'path', 'parentId', 'createdAt'],
        },
      ],
      order: [['name', 'ASC']],
    });
  }

  /**
   * Update folder
   */
  async updateFolder(folderId: number, userId: number, data: UpdateFolderDto): Promise<Folder> {
    const folder = await Folder.findByPk(folderId);
    
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Ensure folder belongs to user
    if (folder.userId !== userId) {
      throw new Error('Access denied');
    }

    // If parent is being changed, validate new parent
    if (data.parentId !== undefined && data.parentId !== folder.parentId) {
      if (data.parentId !== null) {
        const newParent = await Folder.findByPk(data.parentId);
        if (!newParent) {
          throw new Error('Parent folder not found');
        }
        if (newParent.userId !== userId) {
          throw new Error('Cannot move folder to another user\'s folder');
        }
        // Prevent circular reference (folder cannot be its own ancestor)
        if (await this.isAncestor(folderId, data.parentId)) {
          throw new Error('Cannot move folder into its own descendant');
        }
      }
    }

    // If name is being changed, check for duplicates in the same parent
    if (data.name && data.name !== folder.name) {
      const parentId = data.parentId !== undefined ? data.parentId : folder.parentId;
      const whereClause: any = {
        name: data.name,
        userId,
        folderId: { [Op.ne]: folderId },
      };
      if (parentId) {
        whereClause.parentId = parentId;
      } else {
        whereClause[Op.or] = [
          { parentId: null },
          { parentId: { [Op.is]: null } },
        ];
      }

      const existingFolder = await Folder.findOne({
        where: whereClause,
      });

      if (existingFolder) {
        throw new Error('Folder with this name already exists in this location');
      }
    }

    // Update folder
    if (data.name !== undefined) {
      folder.name = data.name;
    }
    if (data.parentId !== undefined) {
      folder.parentId = data.parentId;
    }

    // Recalculate path if name or parent changed
    if (data.name !== undefined || data.parentId !== undefined) {
      let newPath = folder.name;
      const parentId = folder.parentId || null;
      if (parentId) {
        const parent = await Folder.findByPk(parentId);
        if (parent) {
          newPath = `${parent.path}/${folder.name}`;
        }
      }
      folder.path = newPath;

      // Update children paths recursively
      await this.updateChildrenPaths(folderId, newPath);
    }

    await folder.save();
    return folder;
  }

  /**
   * Delete folder
   */
  async deleteFolder(folderId: number, userId: number): Promise<void> {
    const folder = await Folder.findByPk(folderId);
    
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Ensure folder belongs to user
    if (folder.userId !== userId) {
      throw new Error('Access denied');
    }

    // Delete folder (cascade will delete children)
    await folder.destroy();
  }

  /**
   * Check if a folder is an ancestor of another folder
   */
  private async isAncestor(folderId: number, potentialAncestorId: number): Promise<boolean> {
    let currentFolderId: number | null = potentialAncestorId;
    
    while (currentFolderId !== null) {
      if (currentFolderId === folderId) {
        return true;
      }
      const folder: Folder | null = await Folder.findByPk(currentFolderId);
      if (!folder) {
        break;
      }
      currentFolderId = folder.parentId || null;
    }
    
    return false;
  }

  /**
   * Update paths of all children recursively
   */
  private async updateChildrenPaths(parentId: number, parentPath: string): Promise<void> {
    const children = await Folder.findAll({
      where: { parentId },
    });

    for (const child of children) {
      const newPath = `${parentPath}/${child.name}`;
      child.path = newPath;
      await child.save();
      // Recursively update grandchildren
      await this.updateChildrenPaths(child.folderId, newPath);
    }
  }

  /**
   * Calculate folder size recursively (sum of all files in folder and subfolders)
   */
  async calculateFolderSize(folderId: number): Promise<number> {
    // Get all files directly in this folder
    const files = await File.findAll({
      where: {
        folderId,
      },
      attributes: ['size'],
    });

    // Sum file sizes
    let totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);

    // Get all child folders
    const childFolders = await Folder.findAll({
      where: {
        parentId: folderId,
      },
    });

    // Recursively calculate size of child folders
    for (const childFolder of childFolders) {
      totalSize += await this.calculateFolderSize(childFolder.folderId);
    }

    return totalSize;
  }

  /**
   * Build folder tree structure with sizes
   */
  async getFolderTree(userId: number, parentId: number | null = null): Promise<any[]> {
    const whereClause: any = {
      userId,
    };
    if (parentId) {
      whereClause.parentId = parentId;
    } else {
      whereClause[Op.or] = [
        { parentId: null },
        { parentId: { [Op.is]: null } },
      ];
    }

    const folders = await Folder.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
    });

    const tree: any[] = [];
    for (const folder of folders) {
      const children = await this.getFolderTree(userId, folder.folderId);
      const size = await this.calculateFolderSize(folder.folderId);
      tree.push({
        folderId: folder.folderId,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        permissions: folder.permissions,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        size,
        children,
      });
    }

    return tree;
  }
}

export default new FolderService();

