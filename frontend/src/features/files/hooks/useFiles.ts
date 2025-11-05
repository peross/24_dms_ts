import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fileApi, type FileData, type UploadFileData, type UpdateFileData } from "@/lib/api/file.api"

/**
 * Hook for fetching files in a folder
 */
export function useFiles(folderId?: number | null) {
  return useQuery({
    queryKey: ['files', folderId],
    queryFn: () => fileApi.getFiles(folderId),
    enabled: folderId !== undefined, // Only fetch when folderId is explicitly set (including null)
  })
}

/**
 * Hook for uploading one or more files
 */
export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UploadFileData) => fileApi.uploadFile(data),
    onSuccess: (_, variables) => {
      // Invalidate files query for the folder
      queryClient.invalidateQueries({ queryKey: ['files', variables.folderId] })
      // Also invalidate root files if folderId is undefined
      if (variables.folderId === undefined) {
        queryClient.invalidateQueries({ queryKey: ['files', null] })
      }
      // Invalidate folder tree to refresh folder sizes
      queryClient.invalidateQueries({ queryKey: ['folders', 'tree'] })
    },
  })
}

/**
 * Hook for updating file metadata
 */
export function useUpdateFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: number; data: UpdateFileData }) =>
      fileApi.updateFile(fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

/**
 * Hook for deleting a file
 */
export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fileId: number) => fileApi.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

/**
 * Hook for uploading a new version of a file
 */
export function useUploadNewVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fileId, file }: { fileId: number; file: File }) =>
      fileApi.uploadNewVersion(fileId, file),
    onSuccess: () => {
      // Invalidate files query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['files'] })
      // Invalidate versions for the specific file
      queryClient.invalidateQueries({ queryKey: ['files', 'versions'] })
      // Invalidate folder tree to refresh folder sizes
      queryClient.invalidateQueries({ queryKey: ['folders', 'tree'] })
    },
  })
}

/**
 * Hook for getting file versions
 */
export function useFileVersions(fileId: number) {
  return useQuery({
    queryKey: ['files', fileId, 'versions'],
    queryFn: () => fileApi.getFileVersions(fileId),
    enabled: !!fileId,
  })
}

