import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { FileGridView } from "./FileGridView"
import { FileListView } from "./FileListView"
import { useLayout } from "@/components/Layout"
import { useFiles, useUpdateFile, useDeleteFile } from "@/features/files/hooks/useFiles"
import { useFolderTree, useUpdateFolder, useDeleteFolder } from "@/features/folders/hooks/useFolders"
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

export function FileList({ viewMode }: FileListProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { selectedFolderId, navigateToFolder, navigateToRoute } = useLayout()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [uploadVersionDialogOpen, setUploadVersionDialogOpen] = useState(false)
  const [versionHistoryDialogOpen, setVersionHistoryDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<FileItem | null>(null)
  
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
      navigateToFolder(item.id)
    } else if (item.type === "file") {
      // Navigate to file viewer page and add to history
      const filePath = `/dashboard/files/view/${item.id}`
      navigateToRoute(filePath)
    }
  }
  
  // Double-click handler
  const handleDoubleClick = (item: FileItem) => {
    handleOpen(item)
  }

  const handleCopy = (item: FileItem) => {
    // Get selected items or use the clicked item
    const selectedItems = Array.from(selected).map(name => 
      allItems.find(item => item.name === name)
    ).filter((item): item is FileItem => item !== undefined)
    
    const itemsToCopy = selectedItems.length > 0 ? selectedItems : [item]
    
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

    try {
      // Process all clipboard items
      for (const item of clipboard) {
        if (item.type === "file") {
          await updateFileMutation.mutateAsync({
            fileId: item.id,
            data: { folderId: targetFolderId },
          })
        } else if (item.type === "folder") {
          await updateFolderMutation.mutateAsync({
            folderId: item.id,
            data: { parentId: targetFolderId },
          })
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

  const handleCut = (item: FileItem) => {
    // Get selected items or use the clicked item
    const selectedItems = Array.from(selected).map(name => 
      allItems.find(item => item.name === name)
    ).filter((item): item is FileItem => item !== undefined)
    
    const itemsToCut = selectedItems.length > 0 ? selectedItems : [item]
    
    cut(itemsToCut.map(item => ({
      type: item.type,
      id: item.id,
      name: item.name,
    })))
  }

  const handleMove = (item: FileItem) => {
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

  const handleDelete = async (item: FileItem) => {
    // Get selected items or use the clicked item
    const selectedItems = Array.from(selected).map(name => 
      allItems.find(item => item.name === name)
    ).filter((item): item is FileItem => item !== undefined)
    
    const itemsToDelete = selectedItems.length > 0 ? selectedItems : [item]
    
    if (!confirm(t('files.confirmDelete', { name: itemsToDelete.length > 1 ? `${itemsToDelete.length} items` : item.name }))) return

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
                setSelected(prev => {
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
          />
        ) : (
          <FileListView
            files={allItems}
            selected={selected}
            onSelect={(name: string, ctrlKey: boolean) => {
              if (ctrlKey) {
                setSelected(prev => {
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
    </>
  )
}
