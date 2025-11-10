import { randomUUID } from 'crypto';

export interface ScannerDevice {
  id: string;
  name: string;
  location?: string;
  manufacturer?: string;
  status: 'idle' | 'busy' | 'offline';
  lastUsedAt?: Date;
}

export interface ScanJob {
  jobId: string;
  scannerId: string;
  startedAt: Date;
  status: 'started' | 'completed' | 'failed';
}

class ScannerService {
  private scanners: ScannerDevice[] = [
    {
      id: 'scanner-1',
      name: 'Front Desk Scanner',
      location: 'Main Office',
      manufacturer: 'Fujitsu',
      status: 'idle',
    },
    {
      id: 'scanner-2',
      name: 'Archive Room Scanner',
      location: 'Archive Room',
      manufacturer: 'Canon',
      status: 'idle',
    },
  ];

  private activeJobs: Map<string, ScanJob> = new Map();

  async getActiveScanners(): Promise<ScannerDevice[]> {
    return this.scanners;
  }

  async startScan(scannerId: string): Promise<ScanJob> {
    const scanner = this.scanners.find((device) => device.id === scannerId);
    if (!scanner) {
      throw new Error('Scanner not found');
    }

    if (scanner.status === 'offline') {
      throw new Error('Scanner is offline');
    }

    if (scanner.status === 'busy') {
      throw new Error('Scanner is already running a job');
    }

    scanner.status = 'busy';

    const job: ScanJob = {
      jobId: randomUUID(),
      scannerId: scanner.id,
      startedAt: new Date(),
      status: 'started',
    };

    this.activeJobs.set(job.jobId, job);

    // Simulate async completion without blocking the response
    setTimeout(() => {
      scanner.status = 'idle';
      scanner.lastUsedAt = new Date();
      const existing = this.activeJobs.get(job.jobId);
      if (existing) {
        existing.status = 'completed';
        this.activeJobs.set(job.jobId, existing);
      }
    }, 2000);

    return job;
  }
}

export default new ScannerService();
