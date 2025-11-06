import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import File from '../models/file.model';
import FileVersion from '../models/file-version.model';
import Folder from '../models/folder.model';
import SystemFolder from '../models/system-folder.model';
import SystemFolderService from './system-folder.service';
import UserService from './user.service';
import { isAdmin } from '../utils/role.util';

export interface CreateFileDto {
  name: string;
  folderId?: number;
  userId: number;
  path: string;
  size: number;
  mimeType: string;
  permissions?: string;
  userRoles?: string[];
}

export interface UpdateFileDto {
  name?: string;
  folderId?: number | null;
  permissions?: string;
  userRoles?: string[];
}

export class FileService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure uploads directory exists
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
    }
  }

  /**
   * Get file path for storage
   */
  private getFileStoragePath(userId: number, fileName: string, version: number): string {
    const userDir = path.join(this.uploadsDir, `user_${userId}`);
    const versionedFileName = version > 1 ? `${fileName}.v${version}` : fileName;
    return path.join(userDir, versionedFileName);
  }

  /**
   * Create a new file or upload a new version
   */
  async uploadFile(data: CreateFileDto, fileBuffer: Buffer): Promise<File> {
    // Validate folder if provided
    if (data.folderId) {
      const folder = await Folder.findByPk(data.folderId);
      if (!folder) {
        throw new Error('Folder not found');
      }
      if (folder.userId !== data.userId) {
        throw new Error('Cannot upload file to another user\'s folder');
      }

      // Enforce system folder rules
      // Users can only upload files inside "My Folders"
      const isMyFolders = await SystemFolderService.isMyFoldersOrDescendant(data.folderId, data.userId);
      if (!isMyFolders) {
        // Check if trying to upload to General folder
        const isGeneral = await SystemFolderService.isGeneralOrDescendant(data.folderId, data.userId);
        if (isGeneral) {
          // Only admin and super_admin can upload to General
          const userRoles = data.userRoles || await UserService.getUserRoles(data.userId);
          if (!isAdmin(userRoles)) {
            throw new Error('Only administrators can upload files to the General folder');
          }
        } else {
          // Cannot upload to other system folders (e.g., Shared With Me)
          throw new Error('Files can only be uploaded to "My Folders" or "General" (admin only)');
        }
      }
    } else {
      // Cannot upload root files - must be inside a system folder
      throw new Error('Files must be uploaded to "My Folders" or "General" (admin only)');
    }

    // Check if file with same name already exists in the same folder
    const whereClause: any = {
      name: data.name,
      userId: data.userId,
    };
    if (data.folderId) {
      whereClause.folderId = data.folderId;
    } else {
      whereClause[Op.or] = [
        { folderId: null },
        { folderId: { [Op.is]: null } },
      ];
    }

    let file = await File.findOne({
      where: whereClause,
    });

    let version = 1;
    if (file) {
      // File exists, create new version
      version = file.currentVersion + 1;
      file.currentVersion = version;
      file.size = data.size;
      file.mimeType = data.mimeType;
      file.path = data.path;
      await file.save();
    } else {
      // Create new file
      file = await File.create({
        name: data.name,
        path: data.path,
        size: data.size,
        mimeType: data.mimeType,
        folderId: data.folderId,
        userId: data.userId,
        permissions: data.permissions || '644',
        currentVersion: 1,
      });
    }

    // Save file to disk
    const storagePath = this.getFileStoragePath(data.userId, data.name, version);
    const userDir = path.dirname(storagePath);
    await fs.mkdir(userDir, { recursive: true });
    await fs.writeFile(storagePath, fileBuffer);

    // Create file version record
    await FileVersion.create({
      fileId: file.fileId,
      version: version,
      path: storagePath,
      size: data.size,
      mimeType: data.mimeType,
      uploadedBy: data.userId,
    });

    return file;
  }

  /**
   * Get file by ID
   * Files in General folders are accessible to all users
   */
  async getFileById(fileId: number, userId: number): Promise<File | null> {
    // First, get the file without userId filter to check if it's in General
    const file = await File.findOne({
      where: {
        fileId,
      },
      include: [
        {
          model: Folder,
          as: 'folder',
          include: [{
            model: SystemFolder,
            as: 'systemFolder',
          }],
        },
      ],
    });

    if (!file) {
      return null;
    }

    // Check if file is in General folder - if so, allow access to all users
    const isGeneralFolder = file.folderId ? await SystemFolderService.isGeneralFolderOrDescendant(file.folderId) : false;
    
    // If not in General folder, check if user owns the file
    if (!isGeneralFolder && file.userId !== userId) {
      return null;
    }

    return file;
  }

  /**
   * Upload a new version of an existing file
   */
  async uploadNewVersion(fileId: number, userId: number, fileBuffer: Buffer, mimeType: string, size: number): Promise<File> {
    // Verify user owns the file
    const file = await File.findOne({
      where: {
        fileId,
        userId,
      },
    });

    if (!file) {
      throw new Error('File not found or access denied');
    }

    // Create new version
    const version = file.currentVersion + 1;
    file.currentVersion = version;
    file.size = size;
    file.mimeType = mimeType;
    await file.save();

    // Save file to disk
    const storagePath = this.getFileStoragePath(userId, file.name, version);
    const userDir = path.dirname(storagePath);
    await fs.mkdir(userDir, { recursive: true });
    await fs.writeFile(storagePath, fileBuffer);

    // Create file version record
    await FileVersion.create({
      fileId: file.fileId,
      version: version,
      path: storagePath,
      size: size,
      mimeType: mimeType,
      uploadedBy: userId,
    });

    return file;
  }

  /**
   * Get files in a folder or system folder
   * If folderId is a system folder ID (virtual node), return files from all folders of that system folder type
   * If folderId is an actual folder ID, return files in that folder
   * Files in General folder are visible to all users
   */
  async getFilesInFolder(folderId: number | null, userId: number): Promise<File[]> {
    let whereClause: any;

    if (folderId === null) {
      // Root level files - only user's files
      whereClause = {
        userId,
        [Op.or]: [
          { folderId: null },
          { folderId: { [Op.is]: null } },
        ],
      };
    } else {
      // Check if folderId is a system folder ID (virtual node)
      const systemFolder = await SystemFolder.findByPk(folderId);
      
      if (systemFolder) {
        // System folders are virtual nodes - they don't contain files directly
        // Files only exist in actual folders, not in system folder containers
        // Return empty array when selecting a system folder
        return [];
      } else {
        // folderId is an actual folder ID
        const folder = await Folder.findByPk(folderId, {
          include: [{
            model: SystemFolder,
            as: 'systemFolder',
          }],
        });

        if (!folder) {
          return [];
        }

        // Check if folder is in General system folder
        const isGeneralFolder = folder.systemFolderId === 1; // General
        
        if (isGeneralFolder) {
          // Show all files in General folder, regardless of userId
          whereClause = { folderId };
        } else {
          // Show only user's files
          whereClause = { folderId, userId };
        }
      }
    }

    const files = await File.findAll({
      where: whereClause,
      include: [
        {
          model: Folder,
          as: 'folder',
        },
      ],
      order: [['name', 'ASC']],
    });

    return files;
  }

  /**
   * Get all file versions
   */
  async getFileVersions(fileId: number, userId: number): Promise<FileVersion[]> {
    // Verify user owns the file
    const file = await File.findOne({
      where: {
        fileId,
        userId,
      },
    });

    if (!file) {
      throw new Error('File not found or access denied');
    }

    const versions = await FileVersion.findAll({
      where: { fileId },
      order: [['version', 'DESC']],
    });

    return versions;
  }

  /**
   * Update file metadata
   */
  async updateFile(fileId: number, userId: number, data: UpdateFileDto, userRoles?: string[]): Promise<File> {
    const file = await File.findOne({
      where: {
        fileId,
        userId,
      },
    });

    if (!file) {
      throw new Error('File not found or access denied');
    }

    // Validate new folder if provided
    if (data.folderId !== undefined && data.folderId !== file.folderId) {
      if (data.folderId !== null) {
        const folder = await Folder.findByPk(data.folderId);
        if (!folder) {
          throw new Error('Folder not found');
        }
        if (folder.userId !== userId) {
          throw new Error('Cannot move file to another user\'s folder');
        }

        // Enforce system folder rules for moving files
        const roles = data.userRoles || userRoles || await UserService.getUserRoles(userId);
        const isMyFolders = await SystemFolderService.isMyFoldersOrDescendant(data.folderId, userId);
        if (!isMyFolders) {
          const isGeneral = await SystemFolderService.isGeneralOrDescendant(data.folderId, userId);
          if (isGeneral) {
            // Only admin and super_admin can move to General
            if (!isAdmin(roles)) {
              throw new Error('Only administrators can move files to the General folder');
            }
          } else {
            throw new Error('Files can only be moved to "My Folders" or "General" (admin only)');
          }
        }
      } else {
        // Cannot move to root - must be inside a system folder
        throw new Error('Files must be inside "My Folders" or "General" (admin only)');
      }
    }

    // Check for duplicate name if renaming
    if (data.name && data.name !== file.name) {
      const whereClause: any = {
        name: data.name,
        userId,
        fileId: { [Op.ne]: fileId },
      };
      if (data.folderId !== undefined) {
        whereClause.folderId = data.folderId;
      } else {
        whereClause.folderId = file.folderId;
      }

      const existingFile = await File.findOne({ where: whereClause });
      if (existingFile) {
        throw new Error('File with this name already exists in this location');
      }
    }

    // Update file
    if (data.name) file.name = data.name;
    if (data.folderId !== undefined) file.folderId = data.folderId ?? undefined;
    if (data.permissions) file.permissions = data.permissions;

    await file.save();
    return file;
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: number, userId: number): Promise<void> {
    const file = await File.findOne({
      where: {
        fileId,
        userId,
      },
    });

    if (!file) {
      throw new Error('File not found or access denied');
    }

    // Delete all version files from disk
    const versions = await FileVersion.findAll({
      where: { fileId },
    });

    for (const version of versions) {
      try {
        await fs.unlink(version.path);
      } catch (error) {
        console.error(`Failed to delete file version ${version.path}:`, error);
      }
    }

    // Delete file record (cascade will delete versions)
    await file.destroy();
  }

  /**
   * Get file content for download
   * Files in General folder are accessible to all users
   */
  async getFileContent(fileId: number, userId: number, version?: number): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
    const file = await File.findOne({
      where: {
        fileId,
      },
    });

    if (!file) {
      throw new Error('File not found or access denied');
    }

    // Check if file is in General folder - if so, allow access
    const isGeneralFolder = file.folderId ? await SystemFolderService.isGeneralFolderOrDescendant(file.folderId) : false;
    
    // If not in General folder, check if user owns the file
    if (!isGeneralFolder && file.userId !== userId) {
      throw new Error('File not found or access denied');
    }

    const targetVersion = version || file.currentVersion;
    const fileVersion = await FileVersion.findOne({
      where: {
        fileId,
        version: targetVersion,
      },
    });

    if (!fileVersion) {
      throw new Error('File version not found');
    }

    const buffer = await fs.readFile(fileVersion.path);
    return {
      buffer,
      mimeType: fileVersion.mimeType,
      name: file.name,
    };
  }
}

export default new FileService();

