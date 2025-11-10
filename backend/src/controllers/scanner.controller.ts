import { Request, Response } from 'express';
import ScannerService from '../services/scanner.service';

export class ScannerController {
  async getScanners(_req: Request, res: Response): Promise<void> {
    try {
      const scanners = await ScannerService.getActiveScanners();
      res.status(200).json({ scanners });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load scanners' });
    }
  }

  async startScan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Scanner ID is required' });
        return;
      }

      const job = await ScannerService.startScan(id);
      res.status(202).json({ job });
    } catch (error: any) {
      const message = error.message || 'Failed to start scan';
      const status = message.includes('not found') ? 404 : 400;
      res.status(status).json({ error: message });
    }
  }
}

export default new ScannerController();
