import { useState, useMemo } from "react"
import { FileGridView } from "./FileGridView"
import { FileListView } from "./FileListView"
import { useLayout } from "@/components/Layout"
import { useFiles, useUpdateFile, useDeleteFile, useUploadFile } from "@/features/files/hooks/useFiles"
import { useFolderTree, useUpdateFolder, useDeleteFolder } from "@/features/folders/hooks/useFolders"
import { folderApi } from "@/lib/api/folder.api"
import { useClipboard } from "@/contexts/ClipboardContext"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { FileItem } from "./FileGridView"
import { RenameDialog } from "@/features/files/components/RenameDialog"
import { MoveDialog } from "@/features/files/components/MoveDialog"
import { UploadNewVersionDialog } from "@/features/files/components/UploadNewVersionDialog"
import { VersionHistoryDialog } from "@/features/files/components/VersionHistoryDialog"
import { FileContextMenu, FileContextMenuHandlersProvider } from "@/features/files/components/FileContextMenu"
import { fileApi } from "@/lib/api/file.api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { SystemFolderType } from "@/lib/api/folder.api"

export type ViewMode = "grid" | "list"

interface FileListProps {
  viewMode: ViewMode
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
}

function formatDate(dateString: string, locale: string = 'en'): string {
  const date = new Date(dateString)
  
  if (locale === 'sr') {
    // Format as DD.MM.YYYY. for Serbian
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}.${month}.${year}. ${hours}:${minutes}`
  }
  
  // Default format for English and other locales
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Find folder by ID in folder tree to check if it's a system folder
 */
function findSystemFolderById(folders: FolderTreeNode[], folderId: number): boolean {
  for (const folder of folders) {
    if (folder.folderId === folderId) {
      return folder.systemFolderType !== null && folder.systemFolderType !== undefined
    }
    if (folder.children) {
      const found = findSystemFolderById(folder.children, folderId)
      if (found) return true
    }
  }
  return false
}

function getSystemFolderIdFromType(systemFolderType?: SystemFolderType | null): number | undefined {
  if (!systemFolderType) return undefined
  switch (systemFolderType) {
    case "GENERAL":
      return 1
    case "MY_FOLDERS":
      return 2
    case "SHARED_WITH_ME":
      return 3
    default:
      return undefined
  }
}

export function FileList({ viewMode }: FileListProps) {
  const { t, i18n } = useTranslation()
  const { selectedFolderId, navigateToFolder, navigateToRoute, selectedItems, setSelectedItems } = useLayout()
  const selected = selectedItems
  const setSelected = (value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (typeof value === 'function') {
      setSelectedItems(value(selectedItems))
    } else {
      setSelectedItems(value)
    }
  }
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [uploadVersionDialogOpen, setUploadVersionDialogOpen] = useState(false)
  const [versionHistoryDialogOpen, setVersionHistoryDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<FileItem | null>(null)
  const [itemsToDelete, setItemsToDelete] = useState<FileItem[]>([])
  
  const { clipboard, clear: clearClipboard, canPaste, cut, copy } = useClipboard()
  const updateFileMutation = useUpdateFile()
  const updateFolderMutation = useUpdateFolder()
  const deleteFileMutation = useDeleteFile()
  const deleteFolderMutation = useDeleteFolder()
  
  // Always call hooks in the same order - hooks must be called before any conditional returns
  // Only fetch files when a folder is explicitly selected (not undefined)
  const { data: filesData, isLoading: filesLoading, error: filesError } = useFiles(
    selectedFolderId !== null ? selectedFolderId : undefined
  )
  const { data: foldersData } = useFolderTree()

  // Convert folders to FileItem format - must be called before any conditional returns
  const folderItems = useMemo(() => {
    if (!foldersData?.tree || selectedFolderId === null) return []
    
    // Find the selected folder and get its children
    const findFolderChildren = (folders: any[], parentId: number): any[] => {
      for (const folder of folders) {
        if (folder.folderId === parentId) {
          return folder.children || []
        }
        if (folder.children) {
          const found = findFolderChildren(folder.children, parentId)
          if (found.length > 0) return found
        }
      }
      return []
    }

    const children = findFolderChildren(foldersData.tree, selectedFolderId)

    return children.map((folder: any): FileItem => ({
      id: folder.folderId,
      name: folder.name,
      type: "folder" as const,
      lastModified: formatDate(folder.updatedAt, i18n.language),
      permission: "755",
      size: folder.size !== undefined ? formatFileSize(folder.size) : "-",
      systemFolderType: folder.systemFolderType,
    }))
  }, [foldersData, selectedFolderId, i18n.language])

  // Convert files to FileItem format - must be called before any conditional returns
  const fileItems = useMemo(() => {
    if (!filesData?.files) return []
    return filesData.files.map((file): FileItem => ({
      id: file.fileId,
      name: file.name,
      type: "file" as const,
      lastModified: formatDate(file.updatedAt, i18n.language),
      permission: file.permissions,
      size: formatFileSize(file.size),
      mimeType: file.mimeType,
    }))
  }, [filesData, i18n.language])

  // Combine folders and files - must be called before any conditional returns
  const allItems: FileItem[] = useMemo(() => {
    return [...folderItems, ...fileItems]
  }, [folderItems, fileItems])

  // Context menu handlers
  const handleOpen = (item: FileItem) => {
    if (item.type === "folder") {
      const systemFolderId = getSystemFolderIdFromType(item.systemFolderType)
      navigateToFolder(item.id, systemFolderId)
    } else if (item.type === "file") {
      // Navigate to file viewer page and add to history
      // Get current folder context for the file URL
      const currentFolderId = selectedFolderId
      let filePath = `/files/view/${item.id}`
      
      // Add folder context to URL if available
      if (currentFolderId !== null) {
        const params = new URLSearchParams()
        // Check if it's a system folder ID
        if ([1, 2, 3].includes(currentFolderId)) {
          params.set('system_folder_id', currentFolderId.toString())
        } else {
          params.set('folder_id', currentFolderId.toString())
        }
        filePath += `?${params.toString()}`
      }
      
      navigateToRoute(filePath)
    }
  }
  
  // Double-click handler
  const handleDoubleClick = (item: FileItem) => {
    handleOpen(item)
  }

  const handleCopy = (item: FileItem) => {
    // Prevent copying system folders
    if (item.type === "folder" && item.systemFolderType) {
      return
    }

    // Get selected items or use the clicked item
    const selectedItems = Array.from(selected).map(name => 
      allItems.find(item => item.name === name)
    ).filter((item): item is FileItem => item !== undefined)
    
    // Filter out system folders from selected items
    const itemsToCopy = (selectedItems.length > 0 ? selectedItems : [item])
      .filter(item => !(item.type === "folder" && item.systemFolderType))
    
    if (itemsToCopy.length === 0) return
    
    copy(itemsToCopy.map(item => ({
      type: item.type,
      id: item.id,
      name: item.name,
    })))
  }

  const handlePaste = async (targetItem?: FileItem) => {
    if (!clipboard || clipboard.length === 0) return

    // Use selectedFolderId if targetItem is not provided (for header paste button)
    // If targetItem is provided, it must be a folder
    const targetFolderId = targetItem ? (targetItem.type === "folder" ? targetItem.id : null) : selectedFolderId
    if (targetFolderId === null) return

    const hasCut = clipboard.some(item => item.action === "cut")
    const hasCopy = clipboard.some(item => item.action === "copy")

    try {
      // Process all clipboard items
      for (const item of clipboard) {
        // Skip system folders - they cannot be copied or moved
        if (item.type === "folder") {
          // Check if this is a system folder by looking it up in the folder tree
          const isSystemFolder = foldersData?.tree && findSystemFolderById(foldersData.tree, item.id)
          if (isSystemFolder) {
            console.warn(`Cannot ${item.action} system folder: ${item.name}`)
            continue
          }
        }

        if (item.type === "file") {
          if (item.action === "copy") {
            // Copy: Download file and upload it again
            try {
              const blob = await fileApi.downloadFile(item.id)
              const file = new File([blob], item.name, { type: blob.type })
              await uploadFileMutation.mutateAsync({
                files: [file],
                folderId: targetFolderId,
              })
            } catch (error) {
              console.error(`Failed to copy file ${item.name}:`, error)
            }
          } else {
            // Cut: Move file
            await updateFileMutation.mutateAsync({
              fileId: item.id,
              data: { folderId: targetFolderId },
            })
          }
        } else if (item.type === "folder") {
          if (item.action === "copy") {
            // Copy: Create new folder and recursively copy contents
            await copyFolderRecursively(item.id, item.name, targetFolderId)
          } else {
            // Cut: Move folder
            await updateFolderMutation.mutateAsync({
              folderId: item.id,
              data: { parentId: targetFolderId },
            })
          }
        }
      }

      // Clear clipboard only if it was a cut operation
      if (hasCut) {
        clearClipboard()
      }
    } catch (error) {
      console.error("Paste failed:", error)
    }
  }

  // Helper function to recursively copy a folder and its contents
  const copyFolderRecursively = async (sourceFolderId: number, folderName: string, targetParentId: number | null) => {
    try {
      // Create new folder
      const newFolder = await folderApi.createFolder({
        name: folderName,
        parentId: targetParentId,
      })

      // Get files and subfolders in the source folder
      const filesData = await fileApi.getFiles(sourceFolderId)
      const foldersData = await folderApi.getFolderChildren(sourceFolderId)

      // Copy all files
      for (const file of filesData.files) {
        try {
          const blob = await fileApi.downloadFile(file.fileId)
          const fileObj = new File([blob], file.name, { type: file.mimeType })
          await uploadFileMutation.mutateAsync({
            files: [fileObj],
            folderId: newFolder.folder.folderId,
            permissions: file.permissions,
          })
        } catch (error) {
          console.error(`Failed to copy file ${file.name}:`, error)
        }
      }

      // Recursively copy all subfolders
      for (const subfolder of foldersData.folders) {
        await copyFolderRecursively(subfolder.folderId, subfolder.name, newFolder.folder.folderId)
      }
    } catch (error) {
      console.error(`Failed to copy folder ${folderName}:`, error)
      throw error
    }
  }

  const handleCut = (item: FileItem) => {
    // Prevent cutting system folders
    if (item.type === "folder" && item.systemFolderType) {
      return
    }

    // Get selected items or use the clicked item
    const selectedItems = Array.from(selected).map(name => 
      allItems.find(item => item.name === name)
    ).filter((item): item is FileItem => item !== undefined)
    
    // Filter out system folders from selected items
    const itemsToCut = (selectedItems.length > 0 ? selectedItems : [item])
      .filter(item => !(item.type === "folder" && item.systemFolderType))
    
    if (itemsToCut.length === 0) return
    
    cut(itemsToCut.map(item => ({
      type: item.type,
      id: item.id,
      name: item.name,
    })))
  }

  const handleMove = (item: FileItem) => {
    // Prevent moving system folders
    if (item.type === "folder" && item.systemFolderType) {
      return
    }
    setCurrentItem(item)
    setMoveDialogOpen(true)
  }

  const handleMoveConfirm = async (item: FileItem, targetFolderId: number | null) => {
    if (item.type === "file") {
      await updateFileMutation.mutateAsync({
        fileId: item.id,
        data: { folderId: targetFolderId },
      })
    } else {
      await updateFolderMutation.mutateAsync({
        folderId: item.id,
        data: { parentId: targetFolderId },
      })
    }
  }

  const handleDownload = async (item: FileItem) => {
    if (item.type !== "file") return

    try {
      const blob = await fileApi.downloadFile(item.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = item.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const handleRename = (item: FileItem) => {
    setCurrentItem(item)
    setRenameDialogOpen(true)
  }

  const handleRenameConfirm = async (item: FileItem, newName: string) => {
    if (item.type === "file") {
      await updateFileMutation.mutateAsync({
        fileId: item.id,
        data: { name: newName },
      })
    } else {
      await updateFolderMutation.mutateAsync({
        folderId: item.id,
        data: { name: newName },
      })
    }
  }

  const handleDelete = (item: FileItem) => {
    // Get selected items or use the clicked item
    const selectedItems = Array.from(selected).map(name => 
      allItems.find(item => item.name === name)
    ).filter((item): item is FileItem => item !== undefined)
    
    const itemsToDeleteData = selectedItems.length > 0 ? selectedItems : [item]
    setItemsToDelete(itemsToDeleteData)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      for (const itemToDelete of itemsToDelete) {
        if (itemToDelete.type === "file") {
          await deleteFileMutation.mutateAsync(itemToDelete.id)
        } else {
          await deleteFolderMutation.mutateAsync(itemToDelete.id)
        }
      }
      // Clear selection after delete
      setSelected(new Set())
      setDeleteDialogOpen(false)
      setItemsToDelete([])
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  const handleUploadNewVersion = (item: FileItem) => {
    if (item.type !== "file") return
    setCurrentItem(item)
    setUploadVersionDialogOpen(true)
  }

  const handleVersionHistory = (item: FileItem) => {
    if (item.type !== "file") return
    setCurrentItem(item)
    setVersionHistoryDialogOpen(true)
  }

  // Show message if no folder is selected (after all hooks are called)
  if (selectedFolderId === null) {
    return (
      <div className="flex-1 bg-card h-full overflow-y-auto flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-sm text-muted-foreground mb-2">{t('files.selectFolder')}</p>
          <p className="text-xs text-muted-foreground/80">{t('files.selectFolderDescription')}</p>
        </div>
      </div>
    )
  }

  if (filesLoading) {
    return (
      <div className="flex-1 bg-card h-full overflow-y-auto flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (filesError) {
    return (
      <div className="flex-1 bg-card h-full overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">{t('files.failedToLoad')}</p>
        </div>
      </div>
    )
  }

  if (allItems.length === 0) {
    // Create a dummy folder item for empty folder paste
    const emptyFolderItem: FileItem = {
      id: selectedFolderId!,
      name: '',
      type: 'folder',
      lastModified: '',
      permission: '755',
      size: '-',
    }

    return (
      <FileContextMenuHandlersProvider
        onOpen={handleOpen}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onMove={handleMove}
        onDownload={handleDownload}
        onRename={handleRename}
        onDelete={handleDelete}
        onUploadNewVersion={handleUploadNewVersion}
        onVersionHistory={handleVersionHistory}
      >
        <FileContextMenu
          item={emptyFolderItem}
        >
          <div className="flex-1 bg-card h-full overflow-y-auto flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('files.emptyFolder')}</p>
              {canPaste() && (
                <p className="text-xs text-muted-foreground/60 mt-2">
                  {t('files.rightClickToPaste')}
                </p>
              )}
            </div>
          </div>
        </FileContextMenu>
      </FileContextMenuHandlersProvider>
    )
  }

  return (
    <>
      <FileContextMenuHandlersProvider
        onOpen={handleOpen}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onMove={handleMove}
        onDownload={handleDownload}
        onRename={handleRename}
        onDelete={handleDelete}
        onUploadNewVersion={handleUploadNewVersion}
        onVersionHistory={handleVersionHistory}
      >
        {viewMode === "grid" ? (
          <FileGridView
            files={allItems}
            selected={selected}
            onSelect={(name: string, ctrlKey: boolean) => {
              if (ctrlKey) {
                setSelected((prev: Set<string>) => {
                  const next = new Set(prev)
                  if (next.has(name)) {
                    next.delete(name)
                  } else {
                    next.add(name)
                  }
                  return next
                })
              } else {
                setSelected(new Set([name]))
              }
            }}
            onDeselectAll={() => setSelected(new Set())}
          />
        ) : (
          <FileListView
            files={allItems}
            selected={selected}
            onSelect={(name: string, ctrlKey: boolean) => {
              if (ctrlKey) {
                setSelected((prev: Set<string>) => {
                  const next = new Set(prev)
                  if (next.has(name)) {
                    next.delete(name)
                  } else {
                    next.add(name)
                  }
                  return next
                })
              } else {
                setSelected(new Set([name]))
              }
            }}
            onDoubleClick={handleDoubleClick}
            onDeselectAll={() => setSelected(new Set())}
          />
        )}
      </FileContextMenuHandlersProvider>
      
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        item={currentItem}
        onRename={handleRenameConfirm}
      />
      
      <MoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        item={currentItem}
        onMove={handleMoveConfirm}
      />
      
      {currentItem?.type === "file" && (
        <>
          <UploadNewVersionDialog
            open={uploadVersionDialogOpen}
            onOpenChange={setUploadVersionDialogOpen}
            file={currentItem}
          />
          <VersionHistoryDialog
            open={versionHistoryDialogOpen}
            onOpenChange={setVersionHistoryDialogOpen}
            file={currentItem}
          />
        </>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {itemsToDelete.length > 1
                ? t('files.confirmDelete', { name: `${itemsToDelete.length} items` })
                : t('files.confirmDelete', { name: itemsToDelete[0]?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
