import { Router } from 'express';
import ScannerController from '../controllers/scanner.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, (req, res) => ScannerController.getScanners(req, res));
router.post('/:id/start', authenticate, (req, res) => ScannerController.startScan(req, res));

export default router;
