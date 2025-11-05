import { Router } from 'express';
import FolderController from '../controllers/folder.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create folder
router.post('/', FolderController.createFolder.bind(FolderController));

// Get folder tree
router.get('/tree', FolderController.getFolderTree.bind(FolderController));

// Get root folders
router.get('/root', FolderController.getRootFolders.bind(FolderController));

// Get folder by ID
router.get('/:id', FolderController.getFolder.bind(FolderController));

// Get folder children
router.get('/:id/children', FolderController.getFolderChildren.bind(FolderController));

// Update folder
router.put('/:id', FolderController.updateFolder.bind(FolderController));

// Delete folder
router.delete('/:id', FolderController.deleteFolder.bind(FolderController));

export default router;

