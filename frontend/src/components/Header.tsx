import {
  FilePlus,
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
  Bell,
  Menu,
  LogOut,
  User,
  Grid3x3,
  List,
  Save,
} from "lucide-react"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "./ThemeToggle"
import { LanguageSelector } from "./LanguageSelector"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { ProfileModal } from "@/features/auth/components/ProfileModal"
import { CreateFolderDialog } from "@/features/folders/components/CreateFolderDialog"
import { UploadFileDialog } from "@/features/files/components/UploadFileDialog"
import { useLayout } from "@/components/Layout"
import { useClipboard } from "@/contexts/ClipboardContext"
import { Clipboard } from "lucide-react"
import { useUpdateFile } from "@/features/files/hooks/useFiles"
import { useUpdateFolder } from "@/features/folders/hooks/useFolders"
import { folderApi } from "@/lib/api/folder.api"

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
    isTextFile, 
    getTextFileSaveHandler,
    navigateToFolder,
    navigateToRoute,
    navigateBack,
    navigateForward,
    canNavigateBack,
    canNavigateForward
  } = useLayout()
  const { clipboard, canPaste, clear: clearClipboard } = useClipboard()
  const updateFileMutation = useUpdateFile()
  const updateFolderMutation = useUpdateFolder()
  const queryClient = useQueryClient()
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [uploadFileDialogOpen, setUploadFileDialogOpen] = useState(false)

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
        if (item.type === "file") {
          await updateFileMutation.mutateAsync({
            fileId: item.id,
            data: { folderId: selectedFolderId },
          })
        } else if (item.type === "folder") {
          await updateFolderMutation.mutateAsync({
            folderId: item.id,
            data: { parentId: selectedFolderId },
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

  return (
    <div className="bg-card border-b border-border flex flex-col">
      {/* First Row: Action Buttons */}
      <div className="h-14 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 border-b border-border overflow-x-auto">
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
        {isTextFile && (
          <Button 
            variant="ghost" 
            className="gap-1 sm:gap-2 shrink-0"
            onClick={handleSaveTextFile}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">{t('files.save')}</span>
          </Button>
        )}
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <FilePlus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('header.addFile')}</span>
        </Button>
        <Button 
          variant="ghost" 
          className="gap-1 sm:gap-2 shrink-0"
          onClick={() => setCreateFolderDialogOpen(true)}
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('header.addFolder')}</span>
        </Button>
        <Button 
          variant="ghost" 
          className="gap-1 sm:gap-2 shrink-0"
          onClick={() => setUploadFileDialogOpen(true)}
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">{t('header.upload')}</span>
        </Button>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        {canPaste() && selectedFolderId !== null && (
          <Button 
            variant="ghost" 
            className="gap-1 sm:gap-2 shrink-0"
            onClick={handlePaste}
            title={t('header.paste')}
          >
            <Clipboard className="w-4 h-4" />
            <span className="hidden sm:inline">{t('header.paste')}</span>
          </Button>
        )}
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">{t('header.copy')}</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <FolderInput className="w-4 h-4" />
          <span className="hidden sm:inline">{t('header.move')}</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{t('header.download')}</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Pencil className="w-4 h-4" />
          <span className="hidden md:inline">{t('header.rename')}</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">{t('header.delete')}</span>
        </Button>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Archive className="w-4 h-4" />
          <span className="hidden md:inline">{t('header.archive')}</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Key className="w-4 h-4" />
          <span className="hidden md:inline">{t('header.permission')}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
              <MoreVertical className="w-4 h-4" />
              <span className="hidden sm:inline">{t('header.allTools')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>{t('header.moreOptions')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Second Row: Navigation Controls, Path, Search, User Icons */}
      <div className="h-14 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-0">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.main')}
            onClick={handleHome}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.back')}
            onClick={navigateBack}
            disabled={!canNavigateBack}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.forward')}
            onClick={navigateForward}
            disabled={!canNavigateForward}
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 sm:h-10 sm:w-10" 
            title={t('header.up')}
            onClick={handleNavigateUp}
            disabled={selectedFolderId === null}
          >
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button 
            variant="ghost" 
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
            value={selectedFolderPath ? `Path: ${selectedFolderPath}` : "Path: /"}
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
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title={t('header.notifications')}>
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
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
