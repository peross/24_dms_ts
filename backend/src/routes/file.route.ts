import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import FileController, { uploadMiddleware } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Wrapper for multer middleware to catch and handle errors
 */
const handleMulterUpload = (req: Request, res: Response, next: NextFunction): void => {
  uploadMiddleware(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ 
          error: 'File too large. Maximum file size is 100MB.' 
        });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({ 
          error: 'Too many files. Maximum is 50 files per upload.' 
        });
        return;
      }
      res.status(400).json({ 
        error: `Upload error: ${err.message}` 
      });
      return;
    }
    if (err) {
      res.status(400).json({ 
        error: err.message || 'File upload error' 
      });
      return;
    }
    next();
  });
};

// Upload file with error handling
router.post('/upload', authenticate, handleMulterUpload, FileController.uploadFile.bind(FileController));

// Get files in folder
router.get('/', authenticate, FileController.getFiles.bind(FileController));

// Get file by ID
router.get('/:id', authenticate, FileController.getFile.bind(FileController));

// Upload new version of file
router.post('/:id/versions', authenticate, handleMulterUpload, FileController.uploadNewVersion.bind(FileController));

// Get file versions
router.get('/:id/versions', authenticate, FileController.getFileVersions.bind(FileController));

// Download file
router.get('/:id/download', authenticate, FileController.downloadFile.bind(FileController));

// Update file
router.put('/:id', authenticate, FileController.updateFile.bind(FileController));

// Delete file
router.delete('/:id', authenticate, FileController.deleteFile.bind(FileController));

export default router;

