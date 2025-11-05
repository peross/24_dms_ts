import { Response } from 'express';
import multer from 'multer';
import FileService from '../services/file.service';
import { AuthRequest } from '../middleware/auth.middleware';

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
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided' });
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
          const uploadedFile = await FileService.uploadFile(
            {
              name: fileName.trim(),
              folderId: folderIdNum,
              userId: req.user.userId,
              path: fileName.trim(),
              size: file.size,
              mimeType: file.mimetype,
              permissions: permissions || '644',
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
        res.status(400).json({ error: 'Failed to upload any files' });
        return;
      }

      // Return single file object for backward compatibility, or array if multiple
      if (uploadedFiles.length === 1) {
        res.status(201).json({ file: uploadedFiles[0] });
      } else {
        res.status(201).json({ files: uploadedFiles });
      }
    } catch (error: any) {
      if (error.message === 'Folder not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to upload files' });
      }
    }
  }

  /**
   * Get files in a folder
   */
  async getFiles(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const folderId = req.query.folderId as string;
      const folderIdNum = folderId && folderId !== 'null' ? parseInt(folderId, 10) : null;

      const files = await FileService.getFilesInFolder(folderIdNum, req.user.userId);

      res.status(200).json({ files });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get files' });
    }
  }

  /**
   * Get file by ID
   */
  async getFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID' });
        return;
      }

      const file = await FileService.getFileById(fileId, req.user.userId);

      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      res.status(200).json({ file });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get file' });
    }
  }

  /**
   * Upload a new version of an existing file
   */
  async uploadNewVersion(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0 || !files[0]) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      // Only accept single file for version upload
      if (files.length > 1) {
        res.status(400).json({ error: 'Only one file can be uploaded as a new version' });
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
        res.status(400).json({ error: 'Invalid file name' });
        return;
      }

      const updatedFile = await FileService.uploadNewVersion(
        fileId,
        req.user.userId,
        file.buffer,
        file.mimetype,
        file.size
      );

      res.status(200).json({ file: updatedFile });
    } catch (error: any) {
      if (error.message === 'File not found or access denied') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to upload new version' });
      }
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID' });
        return;
      }

      const versions = await FileService.getFileVersions(fileId, req.user.userId);

      res.status(200).json({ versions });
    } catch (error: any) {
      if (error.message === 'File not found or access denied') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Failed to get file versions' });
      }
    }
  }

  /**
   * Download file
   */
  async downloadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID' });
        return;
      }

      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;

      const { buffer, mimeType, name } = await FileService.getFileContent(fileId, req.user.userId, version);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.send(buffer);
    } catch (error: any) {
      if (error.message === 'File not found or access denied' || error.message === 'File version not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Failed to download file' });
      }
    }
  }

  /**
   * Update file metadata
   */
  async updateFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID' });
        return;
      }

      const { name, folderId, permissions } = req.body;

      const file = await FileService.updateFile(fileId, req.user.userId, {
        name,
        folderId: folderId !== undefined ? (folderId === null ? null : parseInt(folderId, 10)) : undefined,
        permissions,
      });

      res.status(200).json({ file });
    } catch (error: any) {
      if (error.message === 'File not found or access denied') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'File with this name already exists in this location' || error.message === 'Folder not found') {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to update file' });
      }
    }
  }

  /**
   * Delete file
   */
  async deleteFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fileId = parseInt(req.params.id, 10);
      if (isNaN(fileId)) {
        res.status(400).json({ error: 'Invalid file ID' });
        return;
      }

      await FileService.deleteFile(fileId, req.user.userId);

      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error: any) {
      if (error.message === 'File not found or access denied') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Failed to delete file' });
      }
    }
  }
}

export default new FileController();

