import { useState, useEffect, useRef } from "react"
import { Folder, ChevronDown, ChevronRight, Loader2, Copy, Scissors, Clipboard, Move, Pencil, Trash2, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useFolderTree, useUpdateFolder, useDeleteFolder } from "@/features/folders/hooks/useFolders"
import { useUploadFile } from "@/features/files/hooks/useFiles"
import { useLayout } from "@/components/Layout"
import { useClipboard } from "@/contexts/ClipboardContext"
import type { FolderTreeNode, SystemFolderType } from "@/lib/api/folder.api"
import { folderApi } from "@/lib/api/folder.api"
import { fileApi } from "@/lib/api/file.api"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { RenameDialog } from "@/features/files/components/RenameDialog"
import { MoveDialog } from "@/features/files/components/MoveDialog"
import { PermissionsDialog } from "@/features/folders/components/PermissionsDialog"
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
import type { FileItem } from "@/components/FileGridView"

interface TreeNode {
  folderId: number | null
  name: string
  path: string
  systemFolderType?: SystemFolderType
  isSystemFolder?: boolean
  children?: TreeNode[]
}

interface TreeNodeComponentProps {
  node: TreeNode
  level?: number
  expanded: Set<number>
  selectedFolderId: number | null
  onToggle: (folderId: number) => void
  onSelect: (folderId: number | null, path: string) => void
  onRename?: (folderId: number, name: string) => void
  onMove?: (folderId: number, targetFolderId: number | null) => void
  onCopy?: (folderId: number, name: string) => void
  onCut?: (folderId: number, name: string) => void
  onPaste?: (folderId: number) => void
  onDelete?: (folderId: number, name: string) => void
  onPermissions?: (folderId: number, name: string) => void
  canPaste?: () => boolean
}

function TreeNodeComponent({ 
  node, 
  level = 0, 
  expanded, 
  selectedFolderId, 
  onToggle, 
  onSelect,
  onRename,
  onMove,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onPermissions,
  canPaste,
}: TreeNodeComponentProps) {
  const { t } = useTranslation()
  const folderId = node.folderId
  const isSystemFolder = node.isSystemFolder === true || (node.systemFolderType !== null && node.systemFolderType !== undefined && node.folderId === null)
  
  // Map system folder type to system folder ID for expansion/selection
  const systemFolderIdMap: Record<string, number> = {
    'GENERAL': 1,
    'MY_FOLDERS': 2,
    'SHARED_WITH_ME': 3,
  }
  const systemFolderId = isSystemFolder && folderId === null && node.systemFolderType 
    ? systemFolderIdMap[node.systemFolderType] 
    : null
  
  // Use system folder ID for expansion check if it's a system folder
  const expandedId = systemFolderId ?? folderId
  const isExpanded = expandedId !== null ? expanded.has(expandedId) : false
  const hasChildren = node.children && node.children.length > 0
  
  // Check if this node is selected
  // For system folders, compare selectedFolderId with the mapped system folder ID
  let isSelected = false
  if (isSystemFolder && folderId === null) {
    isSelected = selectedFolderId === systemFolderId
  } else {
    isSelected = selectedFolderId === folderId
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // For system folders (virtual nodes), use systemFolderId from systemFolderType mapping
    // System folder IDs: 1 = General, 2 = My Folders, 3 = Shared With Me
    let selectId: number | null = folderId
    if (isSystemFolder && folderId === null) {
      // Map system folder type to system folder ID
      const systemFolderIdMap: Record<string, number> = {
        'GENERAL': 1,
        'MY_FOLDERS': 2,
        'SHARED_WITH_ME': 3,
      }
      selectId = node.systemFolderType ? systemFolderIdMap[node.systemFolderType] || null : null
    }
    onSelect(selectId, node.path)
  }

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (hasChildren) {
      // Use system folder ID for toggle if it's a system folder
      const toggleId = systemFolderId ?? folderId
      if (toggleId !== null) {
        onToggle(toggleId)
      }
    }
  }

  const handleContextMenuOpen = (open: boolean) => {
    // Select folder when context menu opens (right-click)
    if (open) {
      let selectId: number | null = folderId
      if (isSystemFolder && folderId === null) {
        const systemFolderIdMap: Record<string, number> = {
          'GENERAL': 1,
          'MY_FOLDERS': 2,
          'SHARED_WITH_ME': 3,
        }
        selectId = node.systemFolderType ? systemFolderIdMap[node.systemFolderType] || null : null
      }
      onSelect(selectId, node.path)
    }
  }

  return (
    <div>
      <ContextMenu onOpenChange={handleContextMenuOpen}>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors",
              level > 0 && "ml-4",
              isSelected && "bg-primary/15 dark:bg-primary/20 text-primary"
            )}
            onClick={handleClick}
          >
            {hasChildren ? (
              <button
                onClick={handleToggleClick}
                className="shrink-0 p-0.5 hover:bg-accent rounded transition-colors"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}
            <Folder className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm truncate">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => {
            let selectId: number | null = folderId
            if (isSystemFolder && folderId === null) {
              const systemFolderIdMap: Record<string, number> = {
                'GENERAL': 1,
                'MY_FOLDERS': 2,
                'SHARED_WITH_ME': 3,
              }
              selectId = node.systemFolderType ? systemFolderIdMap[node.systemFolderType] || null : null
            }
            onSelect(selectId, node.path)
          }}>
            <Folder className="w-4 h-4 mr-2" />
            {t('contextMenu.open')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          {!isSystemFolder && folderId !== null && (
            <>
              <ContextMenuItem onClick={() => onCopy?.(folderId, node.name)}>
                <Copy className="w-4 h-4 mr-2" />
                {t('contextMenu.copy')}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCut?.(folderId, node.name)}>
                <Scissors className="w-4 h-4 mr-2" />
                {t('contextMenu.cut')}
              </ContextMenuItem>
            </>
          )}
          {canPaste?.() && folderId !== null && (
            <ContextMenuItem onClick={() => onPaste?.(folderId)}>
              <Clipboard className="w-4 h-4 mr-2" />
              {t('contextMenu.paste')}
            </ContextMenuItem>
          )}
          {!isSystemFolder && folderId !== null && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onMove?.(folderId, null)}>
                <Move className="w-4 h-4 mr-2" />
                {t('contextMenu.move')}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onRename?.(folderId, node.name)}>
                <Pencil className="w-4 h-4 mr-2" />
                {t('contextMenu.rename')}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onPermissions?.(folderId, node.name)}>
                <Shield className="w-4 h-4 mr-2" />
                {t('contextMenu.permissions')}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={() => onDelete?.(folderId, node.name)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('contextMenu.delete')}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.folderId ?? `system-${child.name}`}
              node={child}
              level={level + 1}
              expanded={expanded}
              selectedFolderId={selectedFolderId}
              onToggle={onToggle}
              onSelect={onSelect}
              onRename={onRename}
              onMove={onMove}
              onCopy={onCopy}
              onCut={onCut}
              onPaste={onPaste}
              onDelete={onDelete}
              onPermissions={onPermissions}
              canPaste={canPaste}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Convert folder tree from API to TreeNode structure
 */
function convertFolderTree(folders: FolderTreeNode[]): TreeNode[] {
  return folders.map((folder) => ({
    folderId: folder.folderId,
    name: folder.name,
    path: folder.path,
    systemFolderType: folder.systemFolderType,
    isSystemFolder: folder.isSystemFolder,
    children: folder.children ? convertFolderTree(folder.children) : undefined,
  }))
}

/**
 * Find folder by system folder type in tree
 */
function findSystemFolder(folders: FolderTreeNode[], type: SystemFolderType): FolderTreeNode | null {
  for (const folder of folders) {
    if (folder.systemFolderType === type) {
      return folder
    }
    if (folder.children) {
      const found = findSystemFolder(folder.children, type)
      if (found) return found
    }
  }
  return null
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: number | null, path: string) => void
}

export function FolderTree({ onFolderSelect }: FolderTreeProps) {
  const { t } = useTranslation()
  const { selectedFolderId, setSelectedFolderId, setSelectedFolderPath, navigateToFolder } = useLayout()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [currentFolder, setCurrentFolder] = useState<{ id: number; name: string } | null>(null)
  const folderTreeRef = useRef<HTMLDivElement>(null)
  const hasAutoSelectedRef = useRef(false)

  const { data, isLoading, error, refetch } = useFolderTree()
  const { clipboard, clear: clearClipboard, canPaste, cut, copy } = useClipboard()
  const updateFolderMutation = useUpdateFolder()
  const deleteFolderMutation = useDeleteFolder()
  const uploadFileMutation = useUploadFile()

  // Auto-select "My Folders" on initial load only (once when data is first loaded)
  useEffect(() => {
    if (data?.tree && !hasAutoSelectedRef.current && selectedFolderId === null) {
      const myFoldersFolder = findSystemFolder(data.tree, 'MY_FOLDERS')
      if (myFoldersFolder) {
        // Use system folder ID 2 for My Folders
        setSelectedFolderId(2)
        setSelectedFolderPath(myFoldersFolder.path)
        // Auto-expand My Folders (use system folder ID 2)
        setExpanded(new Set([2]))
        hasAutoSelectedRef.current = true
      }
    }
  }, [data?.tree, selectedFolderId, setSelectedFolderId, setSelectedFolderPath])

  const handleToggle = (folderId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleSelect = async (folderId: number | null, path: string) => {
    setSelectedFolderId(folderId)
    setSelectedFolderPath(path)
    
    // Update URL when folder is selected
    if (folderId !== null) {
      // Check if it's a system folder ID (1, 2, or 3)
      if ([1, 2, 3].includes(folderId)) {
        navigateToFolder(folderId)
      } else {
        // For regular folders, fetch folder data to get systemFolderId
        try {
          const folderData = await folderApi.getFolder(folderId)
          const systemFolderId = folderData.folder.systemFolderId
          if (systemFolderId) {
            navigateToFolder(folderId, systemFolderId)
          } else {
            // Fallback if systemFolderId is not available
            navigateToFolder(folderId)
          }
        } catch (error) {
          console.error('Failed to fetch folder data:', error)
          // Navigate anyway with just folder_id
          navigateToFolder(folderId)
        }
      }
    } else {
      navigateToFolder(null)
    }
    
    if (onFolderSelect && folderId !== null) {
      onFolderSelect(folderId, path)
    }
  }

  // Handle click outside to deselect folder - simplified
  // The onClick handler on the container div handles clicking on empty space

  // Folder operation handlers
  const handleRename = (folderId: number, name: string) => {
    setCurrentFolder({ id: folderId, name })
    setRenameDialogOpen(true)
  }

  const handleRenameConfirm = async (item: FileItem, newName: string) => {
    await updateFolderMutation.mutateAsync({
      folderId: item.id,
      data: { name: newName },
    })
  }

  const handleMove = (folderId: number) => {
    setCurrentFolder({ id: folderId, name: "" })
    setMoveDialogOpen(true)
  }

  const handleMoveConfirm = async (item: FileItem, targetFolderId: number | null) => {
    await updateFolderMutation.mutateAsync({
      folderId: item.id,
      data: { parentId: targetFolderId },
    })
  }

  const handleCopy = (folderId: number, name: string) => {
    copy([{
      type: "folder",
      id: folderId,
      name: name,
    }])
  }

  const handleCut = (folderId: number, name: string) => {
    cut([{
      type: "folder",
      id: folderId,
      name: name,
    }])
  }

  const handlePaste = async (targetFolderId: number) => {
    if (!clipboard || clipboard.length === 0) return

    const hasCut = clipboard.some(item => item.action === "cut")

    try {
      for (const item of clipboard) {
        if (item.type === "folder") {
          // Skip system folders - they cannot be copied or moved
          const isSystemFolder = data?.tree && findSystemFolderById(data.tree, item.id)
          if (isSystemFolder) {
            console.warn(`Cannot ${item.action} system folder: ${item.name}`)
            continue
          }

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

      if (hasCut) {
        clearClipboard()
      }
    } catch (error) {
      console.error("Paste failed:", error)
    }
  }

  /**
   * Find folder by ID in folder tree to check if it's a system folder
   */
  const findSystemFolderById = (folders: FolderTreeNode[], folderId: number): boolean => {
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

  const handleDelete = (folderId: number, name: string) => {
    setCurrentFolder({ id: folderId, name })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!currentFolder) return
    try {
      await deleteFolderMutation.mutateAsync(currentFolder.id)
      setDeleteDialogOpen(false)
      setCurrentFolder(null)
      // Deselect if deleted folder was selected
      if (selectedFolderId === currentFolder.id) {
        setSelectedFolderId(null)
        setSelectedFolderPath("")
      }
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  const handlePermissions = (folderId: number, name: string) => {
    setCurrentFolder({ id: folderId, name })
    setPermissionsDialogOpen(true)
  }

  const treeData = data?.tree ? convertFolderTree(data.tree) : []

  const currentFolderItem: FileItem | null = currentFolder ? {
    id: currentFolder.id,
    name: currentFolder.name,
    type: "folder",
    lastModified: "",
    permission: "755",
    size: "-",
  } : null

  return (
    <>
      <div 
        ref={folderTreeRef}
        className="w-full lg:w-80 bg-card border-r border-border h-full overflow-y-auto shrink-0 flex flex-col folder-tree-section"
        onClick={(e) => {
          // Deselect if clicking on empty space (the container itself)
          if (e.target === e.currentTarget) {
            setSelectedFolderId(null)
            setSelectedFolderPath("")
          }
        }}
      >
        <div className="p-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-sm sm:text-base">{t('folders.title')}</h2>
        </div>
        <div 
          className="flex-1 overflow-y-auto p-2"
          onClick={(e) => {
            // Deselect if clicking on empty space (the scrollable container itself)
            if (e.target === e.currentTarget) {
              setSelectedFolderId(null)
              setSelectedFolderPath("")
            }
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-destructive mb-2">{t('folders.failedToLoad')}</p>
              <button
                onClick={() => refetch()}
                className="text-xs text-primary hover:underline"
              >
                {t('folders.retry')}
              </button>
            </div>
          ) : treeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Folder className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">{t('folders.noFolders')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('folders.createFirstFolder')}</p>
            </div>
          ) : (
            treeData.map((node) => (
              <div key={node.folderId ?? `system-${node.systemFolderType ?? node.name}`} data-folder-item>
                <TreeNodeComponent
                  node={node}
                  expanded={expanded}
                  selectedFolderId={selectedFolderId}
                  onToggle={handleToggle}
                  onSelect={handleSelect}
                  onRename={handleRename}
                  onMove={handleMove}
                  onCopy={handleCopy}
                  onCut={handleCut}
                  onPaste={handlePaste}
                  onDelete={handleDelete}
                  onPermissions={handlePermissions}
                  canPaste={canPaste}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rename Dialog */}
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        item={currentFolderItem}
        onRename={handleRenameConfirm}
      />

      {/* Move Dialog */}
      <MoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        item={currentFolderItem}
        onMove={handleMoveConfirm}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('folders.deleteFolder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('folders.deleteFolderDescription', { name: currentFolder?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Dialog */}
      <PermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        item={currentFolderItem}
      />
    </>
  )
}
