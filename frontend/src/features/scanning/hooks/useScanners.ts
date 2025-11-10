import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scannerApi } from '@/lib/api/scanner.api';

export function useScanners() {
  return useQuery({
    queryKey: ['scanners'],
    queryFn: () => scannerApi.getScanners(),
  });
}

export function useStartScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scannerId: string) => scannerApi.startScan(scannerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanners'] });
    },
  });
}
