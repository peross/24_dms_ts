import { createContext, useContext } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { 
  FolderOpen, Copy, Clipboard, Move, Download, Pencil, Trash2, Upload, History,
  Scissors
} from "lucide-react"
import type { FileItem } from "@/components/FileGridView"
import { useClipboard } from "@/contexts/ClipboardContext"
import { useLayout } from "@/components/Layout"

interface FileContextMenuProps {
  item: FileItem
  children: React.ReactNode
  onOpen?: (item: FileItem) => void
  onCopy?: (item: FileItem) => void
  onCut?: (item: FileItem) => void
  onPaste?: (targetItem: FileItem) => void
  onMove?: (item: FileItem) => void
  onDownload?: (item: FileItem) => void
  onRename?: (item: FileItem) => void
  onDelete?: (item: FileItem) => void
  onUploadNewVersion?: (item: FileItem) => void
  onVersionHistory?: (item: FileItem) => void
}

const FileContextMenuHandlersContext = createContext<Omit<FileContextMenuProps, 'item' | 'children'> | null>(null)

// Export the interface for use in FileContextMenuHandlersProvider
export type FileContextMenuHandlers = Omit<FileContextMenuProps, 'item' | 'children'>

export function FileContextMenuHandlersProvider({ 
  children, 
  ...handlers 
}: { children: React.ReactNode } & Omit<FileContextMenuProps, 'item' | 'children'>) {
  return (
    <FileContextMenuHandlersContext.Provider value={handlers}>
      {children}
    </FileContextMenuHandlersContext.Provider>
  )
}

export function useFileContextMenuHandlers() {
  const handlers = useContext(FileContextMenuHandlersContext)
  return handlers || {}
}

export function FileContextMenu({
  item,
  children,
  onOpen,
  onCopy,
  onCut,
  onPaste,
  onMove,
  onDownload,
  onRename,
  onDelete,
  onUploadNewVersion,
  onVersionHistory,
}: FileContextMenuProps) {
  const { t } = useTranslation()
  const { clipboard, copy, cut, canPaste } = useClipboard()
  const { selectedFolderId, setSelectedFolderId, setSelectedFolderPath } = useLayout()
  const handlers = useFileContextMenuHandlers()
  
  // Use handlers from context if available, otherwise use props
  const finalHandlers = {
    onOpen: onOpen || handlers.onOpen,
    onCopy: onCopy || handlers.onCopy,
    onCut: onCut || handlers.onCut,
    onPaste: onPaste || handlers.onPaste,
    onMove: onMove || handlers.onMove,
    onDownload: onDownload || handlers.onDownload,
    onRename: onRename || handlers.onRename,
    onDelete: onDelete || handlers.onDelete,
    onUploadNewVersion: onUploadNewVersion || handlers.onUploadNewVersion,
    onVersionHistory: onVersionHistory || handlers.onVersionHistory,
  }

  const handleOpen = () => {
    if (item.type === "folder") {
      // Navigate to folder
      setSelectedFolderId(item.id)
      // TODO: Update selectedFolderPath based on folder path
    }
    finalHandlers.onOpen?.(item)
  }
  
  const handleCut = () => {
    // Cut will be handled by FileList to get selected items
    finalHandlers.onCut?.(item)
  }

  const handleCopy = () => {
    // Copy will be handled by FileList to get selected items
    finalHandlers.onCopy?.(item)
  }

  const handlePaste = () => {
    finalHandlers.onPaste?.(item)
  }

  const handleMove = () => {
    finalHandlers.onMove?.(item)
  }

  const handleDownload = () => {
    finalHandlers.onDownload?.(item)
  }

  const handleRename = () => {
    finalHandlers.onRename?.(item)
  }

  const handleDelete = () => {
    finalHandlers.onDelete?.(item)
  }

  const handleUploadNewVersion = () => {
    finalHandlers.onUploadNewVersion?.(item)
  }

  const handleVersionHistory = () => {
    finalHandlers.onVersionHistory?.(item)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleOpen}>
          <FolderOpen className="w-4 h-4 mr-2" />
          {t('contextMenu.open')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" />
          {t('contextMenu.copy')}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCut}>
          <Scissors className="w-4 h-4 mr-2" />
          {t('contextMenu.cut')}
        </ContextMenuItem>
        {canPaste() && item.type === "folder" && (
          <ContextMenuItem onClick={handlePaste}>
            <Clipboard className="w-4 h-4 mr-2" />
            {t('contextMenu.paste')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleMove}>
          <Move className="w-4 h-4 mr-2" />
          {t('contextMenu.move')}
        </ContextMenuItem>
        {item.type === "file" && (
          <ContextMenuItem onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            {t('contextMenu.download')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleRename}>
          <Pencil className="w-4 h-4 mr-2" />
          {t('contextMenu.rename')}
        </ContextMenuItem>
        {item.type === "file" && (
          <ContextMenuItem onClick={handleUploadNewVersion}>
            <Upload className="w-4 h-4 mr-2" />
            {t('contextMenu.uploadNewVersion')}
          </ContextMenuItem>
        )}
        {item.type === "file" && (
          <ContextMenuItem onClick={handleVersionHistory}>
            <History className="w-4 h-4 mr-2" />
            {t('contextMenu.versionHistory')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          {t('contextMenu.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

