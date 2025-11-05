import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import File from '../models/file.model';
import FileVersion from '../models/file-version.model';
import Folder from '../models/folder.model';

export interface CreateFileDto {
  name: string;
  folderId?: number;
  userId: number;
  path: string;
  size: number;
  mimeType: string;
  permissions?: string;
}

export interface UpdateFileDto {
  name?: string;
  folderId?: number | null;
  permissions?: string;
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
   */
  async getFileById(fileId: number, userId: number): Promise<File | null> {
    const file = await File.findOne({
      where: {
        fileId,
        userId, // Ensure user owns the file
      },
      include: [
        {
          model: Folder,
          as: 'folder',
        },
      ],
    });

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
   * Get files in a folder
   */
  async getFilesInFolder(folderId: number | null, userId: number): Promise<File[]> {
    const whereClause: any = {
      userId,
    };

    if (folderId === null) {
      whereClause[Op.or] = [
        { folderId: null },
        { folderId: { [Op.is]: null } },
      ];
    } else {
      whereClause.folderId = folderId;
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
  async updateFile(fileId: number, userId: number, data: UpdateFileDto): Promise<File> {
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
   */
  async getFileContent(fileId: number, userId: number, version?: number): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
    const file = await File.findOne({
      where: {
        fileId,
        userId,
      },
    });

    if (!file) {
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

