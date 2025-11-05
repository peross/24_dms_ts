import { Router } from 'express';
import AdminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require super admin role
router.use(authenticate);
router.use(requireSuperAdmin);

// User management routes
router.get('/users', AdminController.getAllUsers.bind(AdminController));
router.post('/users', AdminController.createUser.bind(AdminController));
router.put('/users/:id', AdminController.updateUser.bind(AdminController));
router.delete('/users/:id', AdminController.deleteUser.bind(AdminController));

// Role management routes
router.get('/roles', AdminController.getAllRoles.bind(AdminController));
router.post('/roles', AdminController.createRole.bind(AdminController));
router.put('/roles/:id', AdminController.updateRole.bind(AdminController));
router.delete('/roles/:id', AdminController.deleteRole.bind(AdminController));

// User-role assignment routes
router.get('/user-roles', AdminController.getUserRoles.bind(AdminController));

export default router;

