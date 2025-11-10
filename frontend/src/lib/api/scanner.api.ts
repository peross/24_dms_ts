import apiClient from './client';

export interface Scanner {
  id: string;
  name: string;
  location?: string;
  manufacturer?: string;
  status: 'idle' | 'busy' | 'offline';
  lastUsedAt?: string;
}

export interface ScannerJob {
  jobId: string;
  scannerId: string;
  startedAt: string;
  status: 'started' | 'completed' | 'failed';
}

export const scannerApi = {
  async getScanners(): Promise<{ scanners: Scanner[] }> {
    const response = await apiClient.get<{ scanners: Scanner[] }>('/scanners');
    return response.data;
  },

  async startScan(scannerId: string): Promise<{ job: ScannerJob }> {
    const response = await apiClient.post<{ job: ScannerJob }>(`/scanners/${scannerId}/start`);
    return response.data;
  },
};
