import {
  ScanText,
  FolderPlus,
  Upload,
  Copy,
  FolderInput,
  Download,
  Pencil,
  Trash2,
  Archive,
  Key,
  MoreVertical,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RefreshCw,
  Search,
  Menu,
  LogOut,
  User,
  Grid3x3,
  List,
  Save,
  Clipboard,
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "./ThemeToggle"
import { LanguageSelector } from "./LanguageSelector"
import { NotificationDropdown } from "./NotificationDropdown"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { ProfileModal } from "@/features/auth/components/ProfileModal"
import { CreateFolderDialog } from "@/features/folders/components/CreateFolderDialog"
import { UploadFileDialog } from "@/features/files/components/UploadFileDialog"
import { useLayout } from "@/components/Layout"
import { useClipboard } from "@/contexts/ClipboardContext"
import { useUpdateFile, useUploadFile } from "@/features/files/hooks/useFiles"
import { useUpdateFolder, useFolderTree } from "@/features/folders/hooks/useFolders"
import { folderApi, type FolderTreeNode } from "@/lib/api/folder.api"
import { fileApi } from "@/lib/api/file.api"

interface HeaderProps {
  readonly onMobileMenuClick?: () => void
  readonly viewMode?: "grid" | "list"
  readonly onViewModeChange?: (mode: "grid" | "list") => void
}

export function Header({ onMobileMenuClick, viewMode, onViewModeChange }: HeaderProps) {
  const { t } = useTranslation()
  const { logout, user } = useAuth()
  const { 
    selectedFolderPath, 
    selectedFolderId, 
    selectedItems,
    isTextFile, 
    getTextFileSaveHandler,
    navigateToFolder,
    navigateBack,
    navigateForward,
    canNavigateBack,
    canNavigateForward
  } = useLayout()
  
  const hasSelectedItems = selectedItems.size > 0
  const { clipboard, canPaste, clear: clearClipboard } = useClipboard()
  const updateFileMutation = useUpdateFile()
  const updateFolderMutation = useUpdateFolder()
  const uploadFileMutation = useUploadFile()
  const queryClient = useQueryClient()
  const { data: foldersData } = useFolderTree()
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [uploadFileDialogOpen, setUploadFileDialogOpen] = useState(false)
  const systemRootNames = new Set(['My Folders', 'General', 'Shared With Me'])
  const isSystemRootSelected = selectedFolderPath ? systemRootNames.has(selectedFolderPath) : false
  
  // Responsive button overflow handling
  const buttonsContainerRef = useRef<HTMLDivElement>(null)
  const buttonsWrapperRef = useRef<HTMLDivElement>(null)
  const overflowButtonRef = useRef<HTMLButtonElement>(null)
  const [overflowButtonCount, setOverflowButtonCount] = useState(0)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handlePaste = async () => {
    if (!clipboard || clipboard.length === 0 || selectedFolderId === null) return

    const hasCut = clipboard.some(item => item.action === "cut")

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
                folderId: selectedFolderId,
              })
            } catch (error) {
              console.error(`Failed to copy file ${item.name}:`, error)
            }
          } else {
            // Cut: Move file
            await updateFileMutation.mutateAsync({
              fileId: item.id,
              data: { folderId: selectedFolderId },
            })
          }
        } else if (item.type === "folder") {
          if (item.action === "copy") {
            // Copy: Create new folder and recursively copy contents
            await copyFolderRecursively(item.id, item.name, selectedFolderId)
          } else {
            // Cut: Move folder
            await updateFolderMutation.mutateAsync({
              folderId: item.id,
              data: { parentId: selectedFolderId },
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

  const handleSaveTextFile = async () => {
    const saveHandler = getTextFileSaveHandler()
    if (saveHandler) {
      try {
        await saveHandler()
      } catch (error) {
        console.error("Save failed:", error)
      }
    }
  }

  const handleHome = () => {
    navigateToFolder(null)
  }

  const handleNavigateUp = async () => {
    if (selectedFolderId === null) return
    
    try {
      const folderData = await folderApi.getFolder(selectedFolderId)
      const parentId = folderData.folder.parentId ?? null
      navigateToFolder(parentId)
    } catch (error) {
      console.error("Failed to get parent folder:", error)
    }
  }

  const handleRefresh = () => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['files'] })
    queryClient.invalidateQueries({ queryKey: ['folders', 'tree'] })
  }

  // All buttons that can be moved to dropdown (defined after handlers are available)
  const allButtons = [
    { id: 'save', condition: isTextFile, icon: Save, label: t('files.save'), onClick: handleSaveTextFile, disabled: false },
    { id: 'startScanning', condition: true, icon: ScanText, label: t('header.startScanning'), onClick: () => {}, disabled: false },
    { id: 'addFolder', condition: true, icon: FolderPlus, label: t('header.addFolder'), onClick: () => setCreateFolderDialogOpen(true), disabled: false },
    { id: 'upload', condition: true, icon: Upload, label: t('header.upload'), onClick: () => setUploadFileDialogOpen(true), disabled: selectedFolderId === null || isSystemRootSelected },
    { id: 'paste', condition: canPaste() && selectedFolderId !== null, icon: Clipboard, label: t('header.paste'), onClick: handlePaste, disabled: false },
    { id: 'copy', condition: true, icon: Copy, label: t('header.copy'), onClick: () => {}, disabled: !hasSelectedItems },
    { id: 'move', condition: true, icon: FolderInput, label: t('header.move'), onClick: () => {}, disabled: !hasSelectedItems },
    { id: 'download', condition: true, icon: Download, label: t('header.download'), onClick: () => {}, disabled: !hasSelectedItems },
    { id: 'rename', condition: true, icon: Pencil, label: t('header.rename'), onClick: () => {}, disabled: !hasSelectedItems },
    { id: 'delete', condition: true, icon: Trash2, label: t('header.delete'), onClick: () => {}, disabled: !hasSelectedItems },
    { id: 'archive', condition: true, icon: Archive, label: t('header.archive'), onClick: () => {}, disabled: !hasSelectedItems },
    { id: 'permission', condition: true, icon: Key, label: t('header.permission'), onClick: () => {}, disabled: false },
  ]
  
  const enabledButtons = allButtons.filter(btn => btn.condition)
  
  useEffect(() => {
    const updateOverflow = () => {
      if (!buttonsContainerRef.current || !buttonsWrapperRef.current) {
        setOverflowButtonCount(0)
        return
      }
      
      const container = buttonsContainerRef.current
      const wrapper = buttonsWrapperRef.current
      
      const containerWidth = container.offsetWidth
      const mobileMenuWidth = onMobileMenuClick ? 40 : 0
      const padding = 32 // Total padding on both sides
      const overflowButtonWidth = overflowButtonRef.current?.offsetWidth || 120 // Fallback if not rendered yet
      
      // Available width for buttons (reserve space for overflow button if needed)
      const availableWidth = containerWidth - mobileMenuWidth - padding - overflowButtonWidth
      
      // Get all button container divs (each button is wrapped in a div)
      const buttonContainers = Array.from(wrapper.children) as HTMLElement[]
      
      let totalWidth = 0
      let visibleCount = 0
      
      // Calculate which buttons fit
      for (let i = 0; i < buttonContainers.length; i++) {
        const container = buttonContainers[i]
        const button = container.querySelector('button') as HTMLElement
        
        if (!button) continue
        
        const containerWidth = container.offsetWidth || container.getBoundingClientRect().width
        
        // Check if there's a separator before this button (rough estimate)
        const hasSeparatorBefore = i > 0 && (i === 4 || i === 8)
        const separatorWidth = hasSeparatorBefore ? 24 : 0
        
        if (totalWidth + containerWidth + separatorWidth > availableWidth) {
          break
        }
        
        totalWidth += containerWidth + separatorWidth
        visibleCount++
      }
      
      // Calculate overflow count
      const totalButtons = enabledButtons.length
      const overflowCount = Math.max(0, totalButtons - visibleCount)
      
      setOverflowButtonCount(overflowCount)
    }
    
    // Initial update after DOM is ready
    const timeout = setTimeout(updateOverflow, 100)
    
    const resizeObserver = new ResizeObserver(() => {
      updateOverflow()
    })
    
    if (buttonsContainerRef.current) {
      resizeObserver.observe(buttonsContainerRef.current)
    }
    
    window.addEventListener('resize', updateOverflow)
    
    return () => {
      clearTimeout(timeout)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [onMobileMenuClick, enabledButtons.length, isTextFile, canPaste, selectedFolderId, hasSelectedItems, isSystemRootSelected])
  
  const visibleButtons = enabledButtons.slice(0, Math.max(0, enabledButtons.length - overflowButtonCount))
  const overflowButtons = enabledButtons.slice(Math.max(0, enabledButtons.length - overflowButtonCount))

  return (
    <div className="bg-card border-b border-border flex flex-col">
      {/* First Row: Action Buttons */}
      <div 
        ref={buttonsContainerRef}
        className="h-14 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 border-b border-border overflow-x-auto"
      >
        {/* Mobile Menu Button */}
        {onMobileMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuClick}
            className="h-8 w-8 sm:h-10 sm:w-10 lg:hidden shrink-0 mr-1"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        )}
        
        {/* Visible Buttons */}
        <div ref={buttonsWrapperRef} className="flex items-center gap-1 sm:gap-2 shrink-0">
          {visibleButtons.map((button, index) => {
            const Icon = button.icon
            // Add separator after groups of buttons
            const showSeparator = index > 0 && (index === 3 || index === 7)
            
            return (
              <div key={button.id} className="flex items-center gap-1 sm:gap-2">
                {showSeparator && <Separator orientation="vertical" className="h-6 hidden sm:block" />}
                <Button 
                  variant="ghost" 
                  className="gap-1 sm:gap-2 shrink-0"
                  onClick={button.onClick}
                  title={button.label}
                  disabled={button.disabled}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{button.label}</span>
                </Button>
              </div>
            )
          })}
        </div>
        
        {/* Overflow Dropdown (only show if there are overflow buttons) */}
        {overflowButtonCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                ref={overflowButtonRef}
                variant="ghost" 
                className="gap-1 sm:gap-2 shrink-0"
              >
                <MoreVertical className="w-4 h-4" />
                <span className="hidden sm:inline">{t('header.allTools')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {overflowButtons.map((button) => {
                const Icon = button.icon
                return (
                  <DropdownMenuItem 
                    key={button.id} 
                    onClick={button.disabled ? undefined : button.onClick}
                    disabled={button.disabled}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    <span>{button.label}</span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Second Row: Navigation Controls, Path, Search, User Icons */}
      <div className="h-14 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-0">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.main')}
            onClick={handleHome}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.back')}
            onClick={navigateBack}
            disabled={!canNavigateBack}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.forward')}
            onClick={navigateForward}
            disabled={!canNavigateForward}
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.up')}
            onClick={handleNavigateUp}
            disabled={selectedFolderId === null}
          >
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.refresh')}
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Path Display */}
        <div className="flex-1 min-w-0">
          <Input
            value={selectedFolderPath ? `/${selectedFolderPath}` : "/"}
            readOnly
            className="bg-background w-full text-xs sm:text-sm"
          />
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('header.searchPlaceholder')}
            className="pl-9 w-full sm:w-48 md:w-64"
          />
        </div>

        {/* View Toggle */}
        {viewMode !== undefined && onViewModeChange && (
          <div className="flex items-center gap-1 border-r border-border pr-2 sm:pr-4 shrink-0">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => onViewModeChange("grid")}
              title={t('header.gridView')}
            >
              <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => onViewModeChange("list")}
              title={t('header.listView')}
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        )}

        {/* User/Settings Icons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <NotificationDropdown />
          <LanguageSelector />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 hover:bg-primary/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                title={t('header.userMenu')}
              >
                <span className="text-xs sm:text-sm">
                  {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "👤"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
                <User className="w-4 h-4 mr-2" />
                <span>{t('auth.viewProfile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                <span>{t('auth.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

      {/* Profile Modal */}
      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />

      {/* Create Folder Dialog */}
      <CreateFolderDialog 
        open={createFolderDialogOpen} 
        onOpenChange={setCreateFolderDialogOpen}
      />

      {/* Upload File Dialog */}
      <UploadFileDialog 
        open={uploadFileDialogOpen} 
        onOpenChange={setUploadFileDialogOpen}
      />
    </div>
  )
}
