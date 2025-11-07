import Folder from '../models/folder.model';
import SystemFolder, { SystemFolderType } from '../models/system-folder.model';

export class SystemFolderService {
  /**
   * Get system folder by name
   */
  async getSystemFolderByName(name: string): Promise<SystemFolder | null> {
    return await SystemFolder.findOne({
      where: {
        name,
      },
    });
  }

  /**
   * Get system folder by type (maps type enum to name)
   */
  async getSystemFolder(systemFolderType: SystemFolderType): Promise<SystemFolder | null> {
    const nameMap: Record<SystemFolderType, string> = {
      [SystemFolderType.GENERAL]: 'General',
      [SystemFolderType.MY_FOLDERS]: 'My Folders',
      [SystemFolderType.SHARED_WITH_ME]: 'Shared With Me',
    };
    const name = nameMap[systemFolderType];
    return await this.getSystemFolderByName(name);
  }

  /**
   * Get system folder ID by type
   */
  async getSystemFolderId(systemFolderType: SystemFolderType): Promise<number | null> {
    const systemFolder = await this.getSystemFolder(systemFolderType);
    return systemFolder ? systemFolder.systemFolderId : null;
  }

  /**
   * Check if a folder belongs to a specific system folder type
   */
  async isSystemFolderType(folderId: number, systemFolderType: SystemFolderType): Promise<boolean> {
    const systemFolderId = await this.getSystemFolderId(systemFolderType);
    if (!systemFolderId) {
      return false;
    }

    const folder = await Folder.findByPk(folderId, {
      include: [{
        model: SystemFolder,
        as: 'systemFolder',
      }],
    });

    return folder?.systemFolderId === systemFolderId;
  }

  /**
   * Check if a folder is in the General system folder (or is a descendant of a General folder)
   */
  async isGeneralFolderOrDescendant(folderId: number): Promise<boolean> {
    const generalSystemFolder = await this.getSystemFolder(SystemFolderType.GENERAL);
    if (!generalSystemFolder) {
      return false;
    }

    // Check if this folder or any ancestor belongs to General
    let currentFolder = await Folder.findByPk(folderId, {
      include: [{
        model: SystemFolder,
        as: 'systemFolder',
      }],
    });

    while (currentFolder) {
      if (currentFolder.systemFolderId === generalSystemFolder.systemFolderId) {
        return true;
      }
      
      if (currentFolder.parentId) {
        currentFolder = await Folder.findByPk(currentFolder.parentId, {
          include: [{
            model: SystemFolder,
            as: 'systemFolder',
          }],
        });
      } else {
        break;
      }
    }

    return false;
  }

  /**
   * Check if a folder is in the "My Folders" system folder or a descendant of it
   */
  async isMyFoldersOrDescendant(folderId: number, userId: number): Promise<boolean> {
    const myFoldersId = await this.getSystemFolderId(SystemFolderType.MY_FOLDERS);
    if (!myFoldersId) {
      return false;
    }

    // Check if this folder or any ancestor belongs to My Folders and belongs to the user
    let currentFolder = await Folder.findByPk(folderId, {
      include: [{
        model: SystemFolder,
        as: 'systemFolder',
      }],
    });

    while (currentFolder) {
      if (currentFolder.systemFolderId === myFoldersId && currentFolder.userId === userId) {
        return true;
      }
      
      if (currentFolder.parentId) {
        currentFolder = await Folder.findByPk(currentFolder.parentId, {
          include: [{
            model: SystemFolder,
            as: 'systemFolder',
          }],
        });
      } else {
        break;
      }
    }

    return false;
  }

  /**
   * Check if a folder is in the "General" system folder or a descendant of it
   * @deprecated Use isGeneralFolderOrDescendant instead (userId no longer needed)
   */
  async isGeneralOrDescendant(folderId: number, _userId: number): Promise<boolean> {
    return await this.isGeneralFolderOrDescendant(folderId);
  }

  /**
   * Check if a folder is a system folder (deprecated - folders are now just assigned to system folder types)
   */
  async isSystemFolder(folderId: number): Promise<boolean> {
    const folder = await Folder.findByPk(folderId, {
      include: [{
        model: SystemFolder,
        as: 'systemFolder',
      }],
    });

    if (!folder) {
      return false;
    }

    return folder.parentId === null && folder.systemFolderId !== null;
  }

  async isSystemFolderRoot(folderId: number): Promise<boolean> {
    const folder = await Folder.findByPk(folderId)
    if (!folder) {
      return false
    }

    if (!folder.systemFolderId || folder.parentId) {
      return false
    }

    const systemFolder = await SystemFolder.findByPk(folder.systemFolderId)
    if (!systemFolder) {
      return false
    }

    const rootSystemFolderNames = new Set(['General', 'My Folders', 'Shared With Me'])
    return rootSystemFolderNames.has(systemFolder.name) && folder.name === systemFolder.name
  }
}

export default new SystemFolderService();
