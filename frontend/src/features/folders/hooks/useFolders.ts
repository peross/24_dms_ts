import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { folderApi, type CreateFolderData, type UpdateFolderData } from "@/lib/api/folder.api"

/**
 * Hook for fetching folder tree
 */
export function useFolderTree() {
  return useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: () => folderApi.getFolderTree(),
  })
}

/**
 * Hook for creating a folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFolderData) => folderApi.createFolder(data),
    onSuccess: () => {
      // Invalidate folder tree query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['folders', 'tree'] })
      queryClient.invalidateQueries({ queryKey: ['folders', 'root'] })
    },
  })
}

/**
 * Hook for updating a folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ folderId, data }: { folderId: number; data: UpdateFolderData }) =>
      folderApi.updateFolder(folderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', 'tree'] })
      queryClient.invalidateQueries({ queryKey: ['folders', 'root'] })
    },
  })
}

/**
 * Hook for deleting a folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (folderId: number) => folderApi.deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', 'tree'] })
      queryClient.invalidateQueries({ queryKey: ['folders', 'root'] })
    },
  })
}

