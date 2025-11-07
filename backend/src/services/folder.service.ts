import { Op } from 'sequelize';
import Folder from '../models/folder.model';
import File from '../models/file.model';
import SystemFolder from '../models/system-folder.model';
import { SystemFolderType } from '../models/system-folder.model';
import SystemFolderService from './system-folder.service';
import UserService from './user.service';
import { isAdmin } from '../utils/role.util';

export interface CreateFolderDto {
  name: string;
  parentId?: number;
  userId: number;
  systemFolderId: number; // Which system folder this folder belongs to (General, My Folders, or Shared With Me)
  permissions?: string;
  userRoles?: string[];
}

export interface UpdateFolderDto {
  name?: string;
  parentId?: number;
  permissions?: string;
}

export class FolderService {
  /**
   * Create a new folder
   */
  async createFolder(data: CreateFolderDto): Promise<Folder> {
    // Validate system folder exists
    const systemFolder = await SystemFolder.findByPk(data.systemFolderId);
    if (!systemFolder) {
      throw new Error('System folder not found');
    }

    // Get system folder IDs for validation
    const myFoldersId = await SystemFolderService.getSystemFolderId(SystemFolderType.MY_FOLDERS);
    const generalId = await SystemFolderService.getSystemFolderId(SystemFolderType.GENERAL);

    // Enforce system folder rules
    if (data.systemFolderId === generalId) {
      // Only admin and super_admin can create in General
      const userRoles = data.userRoles || await UserService.getUserRoles(data.userId);
      if (!isAdmin(userRoles)) {
        throw new Error('Only administrators can create folders in the General folder');
      }
    } else if (data.systemFolderId !== myFoldersId) {
      // Cannot create in other system folders (e.g., Shared With Me)
      throw new Error('Folders can only be created in "My Folders" or "General" (admin only)');
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await Folder.findByPk(data.parentId);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
      
      // Ensure parent belongs to the same system folder type
      if (parent.systemFolderId !== data.systemFolderId) {
        throw new Error('Parent folder must belong to the same system folder type');
      }

      // For General folder, allow any user's folders as parent (shared)
      // For My Folders, ensure parent belongs to the same user
      if (data.systemFolderId === myFoldersId && parent.userId !== data.userId) {
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
      systemFolderId: data.systemFolderId,
      permissions: data.permissions || '755',
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
   * Returns system folders as virtual nodes, with user folders grouped under them
   * General folders are visible to all users
   */
  async getRootFolders(userId: number): Promise<any[]> {
    // Get all system folders
    const systemFolders = await SystemFolder.findAll({
      order: [['systemFolderId', 'ASC']],
    });

    // Get General system folder ID
    const generalId = await SystemFolderService.getSystemFolderId(SystemFolderType.GENERAL);

    // Get all root folders (no parent)
    // For General: show all folders from all users
    // For other system folders: show only user's folders
    const allRootFolders = await Folder.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { parentId: null },
              { parentId: { [Op.is]: null } },
            ],
          },
          {
            [Op.or]: [
              { systemFolderId: generalId }, // Include all General folders
              { userId, systemFolderId: { [Op.ne]: generalId } }, // Include user's non-General folders
            ],
          },
        ],
      } as any,
      include: [
        {
          model: Folder,
          as: 'children',
          attributes: ['folderId', 'name', 'path', 'parentId', 'createdAt'],
        },
        {
          model: SystemFolder,
          as: 'systemFolder',
        },
      ],
      order: [['name', 'ASC']],
    });

    // Group folders by system folder type
    const foldersBySystemFolder = new Map<number, Folder[]>();
    for (const folder of allRootFolders) {
      if (folder.systemFolderId) {
        if (!foldersBySystemFolder.has(folder.systemFolderId)) {
          foldersBySystemFolder.set(folder.systemFolderId, []);
        }
        foldersBySystemFolder.get(folder.systemFolderId)!.push(folder);
      }
    }

    // Build result: system folders as virtual nodes with their folders as children
    const result: any[] = [];
    for (const systemFolder of systemFolders) {
      const folders = foldersBySystemFolder.get(systemFolder.systemFolderId) || [];
      
      // Calculate total size for this system folder
      let totalSize = 0;
      for (const folder of folders) {
        totalSize += await this.calculateFolderSize(folder.folderId);
      }

      result.push({
        folderId: null, // Virtual node, no actual folder ID
        name: systemFolder.name,
        path: systemFolder.name,
        parentId: null,
        permissions: '755',
        systemFolderType: this.getSystemFolderTypeFromName(systemFolder.name),
        createdAt: systemFolder.createdAt,
        updatedAt: systemFolder.updatedAt,
        size: totalSize,
        children: folders.map(f => ({
          ...f.toJSON(),
          systemFolderType: this.getSystemFolderTypeFromName(systemFolder.name),
        })),
        isSystemFolder: true, // Flag to indicate this is a virtual system folder node
      });
    }

    return result;
  }

  /**
   * Get system folder type from name (helper method)
   */
  private getSystemFolderTypeFromName(name: string): string | null {
    const nameToTypeMap: Record<string, string> = {
      'General': 'GENERAL',
      'My Folders': 'MY_FOLDERS',
      'Shared With Me': 'SHARED_WITH_ME',
    };
    return nameToTypeMap[name] || null;
  }

  /**
   * Get children of a folder or system folder
   * If folderId is a system folder ID (virtual node), return folders of that system folder type
   * If folderId is an actual folder ID, return its children
   */
  async getFolderChildren(folderId: number, userId: number): Promise<Folder[]> {
    // Check if folderId is a system folder ID (virtual node)
    const systemFolder = await SystemFolder.findByPk(folderId);
    
    if (systemFolder) {
      // folderId is a system folder ID - get all folders of this system folder type
      let whereClause: any = {
        systemFolderId: systemFolder.systemFolderId,
        [Op.or]: [
          { parentId: null },
          { parentId: { [Op.is]: null } },
        ],
      };

      // For "My Folders", show only user's folders
      // For "General", show all users' folders
      if (systemFolder.systemFolderId === 2) { // My Folders
        whereClause.userId = userId;
      } else if (systemFolder.systemFolderId === 1) { // General
        // Show all folders from all users
      } else if (systemFolder.systemFolderId === 3) { // Shared With Me
        whereClause.userId = userId;
      }

      return await Folder.findAll({
        where: whereClause,
        include: [
          {
            model: Folder,
            as: 'children',
            attributes: ['folderId', 'name', 'path', 'parentId', 'createdAt'],
          },
          {
            model: SystemFolder,
            as: 'systemFolder',
          },
        ],
        order: [['name', 'ASC']],
      });
    }

    // folderId is an actual folder ID
    const folder = await Folder.findByPk(folderId, {
      include: [{
        model: SystemFolder,
        as: 'systemFolder',
      }],
    });
    
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check if folder is in General system folder
    const isGeneralFolder = folder.systemFolderId === 1; // General
    
    if (isGeneralFolder) {
      // Show all children from all users (content in General is shared)
      return await Folder.findAll({
        where: {
          parentId: folderId,
        },
        include: [
          {
            model: Folder,
            as: 'children',
            attributes: ['folderId', 'name', 'path', 'parentId', 'createdAt'],
          },
          {
            model: SystemFolder,
            as: 'systemFolder',
          },
        ],
        order: [['name', 'ASC']],
      });
    } else {
      // Show only user's children
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
          {
            model: SystemFolder,
            as: 'systemFolder',
          },
        ],
        order: [['name', 'ASC']],
      });
    }
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

    // Prevent renaming or moving system folders
    const isSystemFolder = await SystemFolderService.isSystemFolder(folderId);
    if (isSystemFolder) {
      if (data.name && data.name !== folder.name) {
        throw new Error('Cannot rename system folders');
      }
      if (data.parentId !== undefined && data.parentId !== folder.parentId) {
        throw new Error('Cannot move system folders');
      }
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

        // Enforce system folder rules for moving
        const userRoles = await UserService.getUserRoles(userId);
        const isMyFolders = await SystemFolderService.isMyFoldersOrDescendant(data.parentId, userId);
        if (!isMyFolders) {
          const isGeneral = await SystemFolderService.isGeneralOrDescendant(data.parentId, userId);
          if (isGeneral) {
            // Only admin and super_admin can move to General
            if (!isAdmin(userRoles)) {
              throw new Error('Only administrators can move folders to the General folder');
            }
          } else {
            throw new Error('Folders can only be moved to "My Folders" or "General" (admin only)');
          }
        }
      } else {
        // Cannot move to root - must be inside a system folder
        throw new Error('Folders must be inside "My Folders" or "General" (admin only)');
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

    // Validate permissions if provided
    if (data.permissions !== undefined) {
      const permissionsRegex = /^[0-7]{3}$/;
      if (!permissionsRegex.test(data.permissions)) {
        throw new Error('Invalid permissions format. Must be 3 digits (0-7).');
      }
    }

    // Update folder
    if (data.name !== undefined) {
      folder.name = data.name;
    }
    if (data.parentId !== undefined) {
      folder.parentId = data.parentId;
    }
    if (data.permissions !== undefined) {
      folder.permissions = data.permissions;
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

    // Ensure folder belongs to user unless it's a system root folder
    const isSystemRoot = await SystemFolderService.isSystemFolderRoot(folderId)
    if (!isSystemRoot && folder.userId !== userId) {
      throw new Error('Access denied');
    }

    // Prevent deleting root system folders
    if (isSystemRoot) {
      throw new Error('Cannot delete system folders');
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
   * Returns system folders as virtual nodes at root level, with user folders grouped under them
   * @param userId - User ID (required for root level, can be null when inside General folder)
   * @param parentId - Parent folder ID (null for root level, or system folder ID for virtual nodes)
   */
  async getFolderTree(userId: number | null, parentId: number | null = null): Promise<any[]> {
    // If parentId is null, we're at root level - return system folders as virtual nodes
    if (parentId === null) {
      if (!userId) {
        throw new Error('UserId is required for root level folders');
      }

      // Get all system folders
      const systemFolders = await SystemFolder.findAll({
        order: [['systemFolderId', 'ASC']],
      });

      // Get General system folder ID
      const generalId = await SystemFolderService.getSystemFolderId(SystemFolderType.GENERAL);

      // Get all root folders (no parent)
      // For General: show all folders from all users
      // For other system folders: show only user's folders
      const userFolders = await Folder.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { parentId: null },
                { parentId: { [Op.is]: null } },
              ],
            },
            {
              [Op.or]: [
                { systemFolderId: generalId }, // Include all General folders
                { userId, systemFolderId: { [Op.ne]: generalId } }, // Include user's non-General folders
              ],
            },
          ],
        } as any,
        include: [{
          model: SystemFolder,
          as: 'systemFolder',
        }],
        order: [['name', 'ASC']],
      });

      // Group folders by system folder type
      const foldersBySystemFolder = new Map<number, Folder[]>();
      for (const folder of userFolders) {
        if (folder.systemFolderId) {
          if (!foldersBySystemFolder.has(folder.systemFolderId)) {
            foldersBySystemFolder.set(folder.systemFolderId, []);
          }
          foldersBySystemFolder.get(folder.systemFolderId)!.push(folder);
        }
      }

      // Build result: system folders as virtual nodes with their folders as children
      const result: any[] = [];
      for (const systemFolder of systemFolders) {
        const folders = foldersBySystemFolder.get(systemFolder.systemFolderId) || [];
        
        // Calculate total size for this system folder
        let totalSize = 0;
        for (const folder of folders) {
          totalSize += await this.calculateFolderSize(folder.folderId);
        }

        // Get children for each folder in this system folder
        const foldersWithChildren = await Promise.all(
          folders.map(async (folder) => {
            const isFolderInGeneral = systemFolder.systemFolderId === 1; // General
            const childrenUserId = isFolderInGeneral ? null : userId;
            const children = await this.getFolderTree(childrenUserId, folder.folderId);
            const size = await this.calculateFolderSize(folder.folderId);
            const systemFolderType = this.getSystemFolderTypeFromName(systemFolder.name);

            return {
              folderId: folder.folderId,
              name: folder.name,
              path: folder.path,
              parentId: folder.parentId,
              permissions: folder.permissions,
              systemFolderType,
              createdAt: folder.createdAt,
              updatedAt: folder.updatedAt,
              size,
              children,
            };
          })
        );

        result.push({
          folderId: null, // Virtual node, no actual folder ID
          name: systemFolder.name,
          path: systemFolder.name,
          parentId: null,
          permissions: '755',
          systemFolderType: this.getSystemFolderTypeFromName(systemFolder.name),
          createdAt: systemFolder.createdAt,
          updatedAt: systemFolder.updatedAt,
          size: totalSize,
          children: foldersWithChildren,
          isSystemFolder: true, // Flag to indicate this is a virtual system folder node
        });
      }

      return result;
    }

    // If parentId is provided, we're getting children of a folder
    // Check if parentId is a system folder ID (virtual node) or actual folder ID
    const systemFolder = await SystemFolder.findByPk(parentId);
    
    if (systemFolder) {
      // parentId is a system folder ID (virtual node)
      // Get all folders for this system folder type
      let whereClause: any = {
        systemFolderId: systemFolder.systemFolderId,
        [Op.or]: [
          { parentId: null },
          { parentId: { [Op.is]: null } },
        ],
      };

      // For "My Folders", show only user's folders
      // For "General", show all users' folders
      if (systemFolder.systemFolderId === 2 && userId) { // My Folders
        whereClause.userId = userId;
      } else if (systemFolder.systemFolderId === 1) { // General
        // Show all folders from all users
        // whereClause already doesn't filter by userId
      } else if (systemFolder.systemFolderId === 3 && userId) { // Shared With Me
        whereClause.userId = userId;
      }

      const folders = await Folder.findAll({
        where: whereClause,
        include: [{
          model: SystemFolder,
          as: 'systemFolder',
        }],
        order: [['name', 'ASC']],
      });

      const result: any[] = [];
      for (const folder of folders) {
        const isFolderInGeneral = systemFolder.systemFolderId === 1;
        const childrenUserId = isFolderInGeneral ? null : userId;
        const children = await this.getFolderTree(childrenUserId, folder.folderId);
        const size = await this.calculateFolderSize(folder.folderId);
        const systemFolderType = this.getSystemFolderTypeFromName(systemFolder.name);

        result.push({
          folderId: folder.folderId,
          name: folder.name,
          path: folder.path,
          parentId: folder.parentId,
          permissions: folder.permissions,
          systemFolderType,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          size,
          children,
        });
      }

      return result;
    } else {
      // parentId is an actual folder ID
      const parentFolder = await Folder.findByPk(parentId, {
        include: [{
          model: SystemFolder,
          as: 'systemFolder',
        }],
      });

      if (!parentFolder) {
        return [];
      }

      // Check if parent is in General folder
      const isParentInGeneral = parentFolder.systemFolderId === 1; // General

      let whereClause: any = { parentId };
      
      if (isParentInGeneral) {
        // Show all folders inside General from all users
        // whereClause already doesn't filter by userId
      } else {
        // Show only user's folders
        if (userId) {
          whereClause.userId = userId;
        }
      }

      const folders = await Folder.findAll({
        where: whereClause,
        include: [{
          model: SystemFolder,
          as: 'systemFolder',
        }],
        order: [['name', 'ASC']],
      });

      const result: any[] = [];
      for (const folder of folders) {
        const isFolderInGeneral = folder.systemFolderId === 1;
        const childrenUserId = isFolderInGeneral ? null : userId;
        const children = await this.getFolderTree(childrenUserId, folder.folderId);
        const size = await this.calculateFolderSize(folder.folderId);
        const systemFolderType = folder.systemFolder 
          ? this.getSystemFolderTypeFromName(folder.systemFolder.name) 
          : null;

        result.push({
          folderId: folder.folderId,
          name: folder.name,
          path: folder.path,
          parentId: folder.parentId,
          permissions: folder.permissions,
          systemFolderType,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          size,
          children,
        });
      }

      return result;
    }
  }
}

export default new FolderService();

