import { createContext, useContext, useRef, cloneElement, isValidElement } from "react"
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
  readonly item: FileItem
  readonly children: React.ReactNode
  readonly onSelect?: (item: FileItem, ctrlKey: boolean) => void
  readonly onOpen?: (item: FileItem) => void
  readonly onCopy?: (item: FileItem) => void
  readonly onCut?: (item: FileItem) => void
  readonly onPaste?: (targetItem: FileItem) => void
  readonly onMove?: (item: FileItem) => void
  readonly onDownload?: (item: FileItem) => void
  readonly onRename?: (item: FileItem) => void
  readonly onDelete?: (item: FileItem) => void
  readonly onUploadNewVersion?: (item: FileItem) => void
  readonly onVersionHistory?: (item: FileItem) => void
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
  onSelect,
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
  const { canPaste } = useClipboard()
  const { setSelectedFolderId } = useLayout()
  const handlers = useFileContextMenuHandlers()
  const ctrlKeyRef = useRef(false)
  
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

  const handleContextMenuOpen = (open: boolean) => {
    // When context menu opens, select the item
    if (open && onSelect) {
      onSelect(item, ctrlKeyRef.current)
      // Reset the ref after use
      ctrlKeyRef.current = false
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    // Capture Ctrl/Cmd key state before context menu opens
    ctrlKeyRef.current = e.ctrlKey || e.metaKey
  }

  // Clone children to add onContextMenu handler if it's a valid React element
  const childrenWithHandler = isValidElement(children)
    ? cloneElement(children, {
        onContextMenu: (e: React.MouseEvent) => {
          handleContextMenu(e)
          // Call original onContextMenu if it exists
          const originalHandler = (children.props as any)?.onContextMenu
          if (originalHandler) {
            originalHandler(e)
          }
        },
      } as any)
    : children

  // Check if item is a system folder
  const isSystemFolder = item.type === "folder" && item.systemFolderType !== null && item.systemFolderType !== undefined

  return (
    <ContextMenu onOpenChange={handleContextMenuOpen}>
      <ContextMenuTrigger asChild>
        {childrenWithHandler}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleOpen}>
          <FolderOpen className="w-4 h-4 mr-2" />
          {t('contextMenu.open')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {!isSystemFolder && (
          <>
            <ContextMenuItem onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              {t('contextMenu.copy')}
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCut}>
              <Scissors className="w-4 h-4 mr-2" />
              {t('contextMenu.cut')}
            </ContextMenuItem>
          </>
        )}
        {canPaste() && item.type === "folder" && (
          <ContextMenuItem onClick={handlePaste}>
            <Clipboard className="w-4 h-4 mr-2" />
            {t('contextMenu.paste')}
          </ContextMenuItem>
        )}
        {!isSystemFolder && (
          <>
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
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

