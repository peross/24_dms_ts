import { Response } from 'express';
import multer from 'multer';
import FileService from '../services/file.service';
import { AuthRequest } from '../middleware/auth.middleware';
import UserService from '../services/user.service';
import { FileErrorCode } from '../utils/error-codes';
import { eventBus, AppEvent } from '../events/event-bus';

/**
 * Map error messages to error codes for translation
 */
function getErrorCode(errorMessage: string): string {
  const errorMap: Record<string, string> = {
    'Unauthorized': FileErrorCode.UNAUTHORIZED,
    'No files provided': FileErrorCode.NO_FILES_PROVIDED,
    'Failed to upload any files': FileErrorCode.FAILED_TO_UPLOAD_ANY,
    'Folder not found': FileErrorCode.FOLDER_NOT_FOUND,
    'Failed to upload files': FileErrorCode.FAILED_TO_UPLOAD,
    'Failed to get files': FileErrorCode.FAILED_TO_GET_FILES,
    'Invalid file ID': FileErrorCode.INVALID_FILE_ID,
    'File not found': FileErrorCode.FILE_NOT_FOUND,
    'Failed to get file': FileErrorCode.FAILED_TO_GET_FILE,
    'No file provided': FileErrorCode.NO_FILE_PROVIDED,
    'Only one file can be uploaded as a new version': FileErrorCode.ONLY_ONE_FILE_VERSION,
    'Invalid file name': FileErrorCode.INVALID_FILE_NAME,
    'File not found or access denied': FileErrorCode.FILE_NOT_FOUND_OR_ACCESS_DENIED,
    'Failed to upload new version': FileErrorCode.FAILED_TO_UPLOAD_NEW_VERSION,
    'Failed to get file versions': FileErrorCode.FAILED_TO_GET_VERSIONS,
    'File version not found': FileErrorCode.FILE_VERSION_NOT_FOUND,
    'Failed to download file': FileErrorCode.FAILED_TO_DOWNLOAD,
    'File with this name already exists in this location': FileErrorCode.FILE_NAME_EXISTS,
    'Failed to update file': FileErrorCode.FAILED_TO_UPDATE,
    'Failed to delete file': FileErrorCode.FAILED_TO_DELETE,
    'Cannot upload file to another user\'s folder': FileErrorCode.CANNOT_UPLOAD_TO_FOLDER,
    'Only administrators can upload files to the General folder': FileErrorCode.CANNOT_UPLOAD_TO_GENERAL,
    'Files can only be uploaded to "My Folders" or "General" (admin only)': FileErrorCode.FILES_ONLY_IN_MY_FOLDERS,
    'Files must be uploaded to "My Folders" or "General" (admin only)': FileErrorCode.FILES_MUST_BE_IN_SYSTEM_FOLDER,
    'Only administrators can move files to the General folder': FileErrorCode.CANNOT_MOVE_TO_GENERAL,
    'Files can only be moved to "My Folders" or "General" (admin only)': FileErrorCode.FILES_ONLY_MOVE_TO_MY_FOLDERS,
  };

  return errorMap[errorMessage] || FileErrorCode.FAILED_TO_UPLOAD;
}

/**
 * Custom storage to preserve UTF-8 filename encoding
 */
const storage = multer.memoryStorage();

// Configure multer for memory storage with UTF-8 support
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

export const uploadMiddleware = upload.array('files', 50); // Allow up to 50 files

export class FileController {
  private serializeFile(file: any) {
    const systemFolderName = file.folder?.systemFolder?.name;
    const folderPath = file.folder?.path;
    const segments: string[] = [];
    if (systemFolderName) {
      segments.push(systemFolderName);
    }
    if (folderPath) {
      segments.push(folderPath);
    }
    segments.push(file.name);
    const relativePath = segments.filter(Boolean).join('/');

    return {
      fileId: file.fileId,
      name: file.name,
      folderId: file.folderId ?? null,
      systemFolderId: file.folder?.systemFolderId ?? null,
      path: relativePath || file.path || file.name || null,
      size: Number(file.size ?? 0),
      mimeType: file.mimeType,
    };
  }

  /**
   * Decode filename with proper UTF-8 handling
   */
  private decodeFileName(originalFileName: string): string {
    let fileName = originalFileName;
    
    // Try to fix corrupted encoding (common issue: latin1 interpreted as utf8)
    try {
      // Check if filename appears corrupted (contains mojibake patterns)
      const hasMojibake = /[ÐÑÅ]/.test(fileName) && 
        (fileName.match(/[ÐÑÅ]/g)?.length || 0) > 2;
      
      if (hasMojibake) {
        // Try converting from latin1 to utf8 (common fix for mojibake)
        const latin1Buffer = Buffer.from(fileName, 'latin1');
        const utf8String = latin1Buffer.toString('utf8');
        
        // If the conversion produces valid UTF-8 characters, use it
        if (utf8String !== fileName) {
          fileName = utf8String;
        }
      } else if (fileName.includes('%')) {
        // If URL encoded, decode it
        fileName = decodeURIComponent(fileName);
      }
    } catch (e) {
      console.warn('Filename decoding warning:', e);
    }
    
    return fileName;
  }

  /**
   * Upload one or more files
   */
  async uploadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', errorCode: FileErrorCode.UNAUTHORIZED });
        return;
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided', errorCode: FileErrorCode.NO_FILES_PROVIDED });
        return;
      }

      const { folderId, permissions } = req.body;
      const folderIdNum = folderId ? parseInt(folderId, 10) : undefined;
      const names = req.body.names ? (Array.isArray(req.body.names) ? req.body.names : [req.body.names]) : null;

      const uploadedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Get filename from names array if provided, otherwise use file originalname
        let fileName: string;
        if (names && names[i]) {
          fileName = names[i].includes('%') ? decodeURIComponent(names[i]) : names[i];
        } else {
          fileName = this.decodeFileName(file.originalname);
        }

        if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
          continue; // Skip files with invalid names
        }

        try {
          // Get user roles for permission checking
          const userRoles = req.user.roles || await UserService.getUserRoles(req.user.userId);

          const uploadedFile = await FileService.uploadFile(
            {
              name: fileName.trim(),
              folderId: folderIdNum,
              userId: req.user.userId,
              path: fileName.trim(),
              size: file.size,
              mimeType: file.mimetype,
              permissions: permissions || '644',
              userRoles,
            },
            file.buffer
          );
          uploadedFiles.push(uploadedFile);
        } catch (error: any) {
          // Continue with other files if one fails
          console.error(`Failed to upload file ${fileName}:`, error.message);
        }
      }

      if (uploadedFiles.length === 0) {
        res.status(400).json({ 
          error: 'Failed to upload any files',
          errorCode: FileErrorCode.FAILED_TO_UPLOAD_ANY
        });
        return;
      }

      // Return single file object for backward compatibility, or array if multiple
      uploadedFiles.forEach((file) => {
        console.log(`[FileController] Created file ${file.fileId} for user ${req.user!.userId}`);
        eventBus.emit(AppEvent.FILE_CREATED, {
          userId: req.user!.userId,
          file: this.serializeFile(file),
        });
      });

      if (uploadedFiles.length === 1) {
        res.status(201).json({ file: uploadedFiles[0] });
      } else {
        res.status(201).json({ files: uploadedFiles });
      }
    } catch (error: any) {
      const errorCode = getErrorCode(error.message || 'Failed to upload files');
      if (error.message === 'Folder not found') {
        res.status(404).json({ error: error.message, errorCode });
      } else {
        res.status(400).json({ error: error.message || 'Failed to upload files', errorCode });
      }
    }
  }

  /**
   * Get files in a folder
   */
  async getFiles(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', errorCode: FileErrorCode.UNAUTHORIZED });
        return;
      }

      const folderId = req.query.folderId as string;
      const folderIdNum = folderId && folderId !== 'null' ? parseInt(folderId, 10) : null;

      const files = await FileService.getFilesInFolder(folderIdNum, req.user.userId);

      res.status(200).json({ files });
    } catch (error: any) {
      const errorCode = getErrorCode(error.message || 'Failed to get files');
      res.status(500).json({ error: error.message || 'Failed to get files', errorCode });
    }
  }

  /**
   * Get file by ID
   */
  async getFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', errorCode: FileErrorCode.UNAUTHORIZED });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID', errorCode: FileErrorCode.INVALID_FILE_ID });
        return;
      }

      const file = await FileService.getFileById(fileId, req.user.userId);

      if (!file) {
        res.status(404).json({ error: 'File not found', errorCode: FileErrorCode.FILE_NOT_FOUND });
        return;
      }

      res.status(200).json({ file });
    } catch (error: any) {
      const errorCode = getErrorCode(error.message || 'Failed to get file');
      res.status(500).json({ error: error.message || 'Failed to get file', errorCode });
    }
  }

  /**
   * Upload a new version of an existing file
   */
  async uploadNewVersion(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', errorCode: FileErrorCode.UNAUTHORIZED });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID', errorCode: FileErrorCode.INVALID_FILE_ID });
        return;
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0 || !files[0]) {
        res.status(400).json({ error: 'No file provided', errorCode: FileErrorCode.NO_FILE_PROVIDED });
        return;
      }

      // Only accept single file for version upload
      if (files.length > 1) {
        res.status(400).json({ error: 'Only one file can be uploaded as a new version', errorCode: FileErrorCode.ONLY_ONE_FILE_VERSION });
        return;
      }

      const file = files[0];
      
      // Get filename from names array if provided, otherwise use file originalname
      let fileName: string;
      const names = req.body.names ? (Array.isArray(req.body.names) ? req.body.names : [req.body.names]) : null;
      if (names && names[0]) {
        fileName = names[0].includes('%') ? decodeURIComponent(names[0]) : names[0];
      } else {
        fileName = this.decodeFileName(file.originalname);
      }

      if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
        res.status(400).json({ error: 'Invalid file name', errorCode: FileErrorCode.INVALID_FILE_NAME });
        return;
      }

      const updatedFile = await FileService.uploadNewVersion(
        fileId,
        req.user.userId,
        file.buffer,
        file.mimetype,
        file.size
      );

      console.log(`[FileController] Uploaded new version for file ${updatedFile.fileId} by user ${req.user.userId}`);
      eventBus.emit(AppEvent.FILE_UPDATED, {
        userId: req.user.userId,
        file: this.serializeFile(updatedFile),
      });

      res.status(200).json({ file: updatedFile });
    } catch (error: any) {
      const errorCode = getErrorCode(error.message || 'Failed to upload new version');
      if (error.message === 'File not found or access denied') {
        res.status(404).json({ error: error.message, errorCode });
      } else {
        res.status(400).json({ error: error.message || 'Failed to upload new version', errorCode });
      }
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', errorCode: FileErrorCode.UNAUTHORIZED });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID', errorCode: FileErrorCode.INVALID_FILE_ID });
        return;
      }

      const versions = await FileService.getFileVersions(fileId, req.user.userId);

      res.status(200).json({ versions });
    } catch (error: any) {
      const errorCode = getErrorCode(error.message || 'Failed to get file versions');
      if (error.message === 'File not found or access denied') {
        res.status(404).json({ error: error.message, errorCode });
      } else {
        res.status(500).json({ error: error.message || 'Failed to get file versions', errorCode });
      }
    }
  }

  /**
   * Download file
   */
  async downloadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', errorCode: FileErrorCode.UNAUTHORIZED });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID', errorCode: FileErrorCode.INVALID_FILE_ID });
        return;
      }

      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;

      const { buffer, mimeType, name } = await FileService.getFileContent(fileId, req.user.userId, version);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.send(buffer);
    } catch (error: any) {
      const errorCode = getErrorCode(error.message || 'Failed to download file');
      if (error.message === 'File not found or access denied' || error.message === 'File version not found') {
        res.status(404).json({ error: error.message, errorCode });
      } else {
        res.status(500).json({ error: error.message || 'Failed to download file', errorCode });
      }
    }
  }

  /**
   * Update file metadata
   */
  async updateFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', errorCode: FileErrorCode.UNAUTHORIZED });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID', errorCode: FileErrorCode.INVALID_FILE_ID });
        return;
      }

      const { name, folderId, permissions } = req.body;

      // Get user roles for permission checking
      const userRoles = req.user.roles || await UserService.getUserRoles(req.user.userId);

      const file = await FileService.updateFile(
        fileId,
        req.user.userId,
        {
          name,
          folderId: folderId !== undefined ? (folderId === null ? null : parseInt(folderId, 10)) : undefined,
          permissions,
        },
        userRoles
      );

      console.log(`[FileController] Updated file ${file.fileId} for user ${req.user.userId}`);
      eventBus.emit(AppEvent.FILE_UPDATED, {
        userId: req.user.userId,
        file: this.serializeFile(file),
      });

      res.status(200).json({ file });
    } catch (error: any) {
      const errorCode = getErrorCode(error.message || 'Failed to update file');
      if (error.message === 'File not found or access denied') {
        res.status(404).json({ error: error.message, errorCode });
      } else if (error.message === 'File with this name already exists in this location' || error.message === 'Folder not found') {
        res.status(409).json({ error: error.message, errorCode });
      } else {
        res.status(400).json({ error: error.message || 'Failed to update file', errorCode });
      }
    }
  }

  /**
   * Delete file
   */
  async deleteFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', errorCode: FileErrorCode.UNAUTHORIZED });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID', errorCode: FileErrorCode.INVALID_FILE_ID });
        return;
      }

      const deletedFile = await FileService.deleteFile(fileId, req.user.userId);

      console.log(`[FileController] Deleted file ${fileId} for user ${req.user.userId}`);
      eventBus.emit(AppEvent.FILE_DELETED, {
        userId: req.user.userId,
        file: this.serializeFile(deletedFile),
      });

      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error: any) {
      const errorCode = getErrorCode(error.message || 'Failed to delete file');
      if (error.message === 'File not found or access denied') {
        res.status(404).json({ error: error.message, errorCode });
      } else {
        res.status(500).json({ error: error.message || 'Failed to delete file', errorCode });
      }
    }
  }
}

export default new FileController();

