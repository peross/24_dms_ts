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
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "./ThemeToggle"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { ProfileModal } from "@/features/auth/components/ProfileModal"

interface HeaderProps {
  readonly onMobileMenuClick?: () => void
  readonly viewMode?: "grid" | "list"
  readonly onViewModeChange?: (mode: "grid" | "list") => void
}

export function Header({ onMobileMenuClick, viewMode, onViewModeChange }: HeaderProps) {
  const { logout, user } = useAuth()
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    }
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
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <FilePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add file</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add folder</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">Copy</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <FolderInput className="w-4 h-4" />
          <span className="hidden sm:inline">Move</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Pencil className="w-4 h-4" />
          <span className="hidden md:inline">Rename</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Archive className="w-4 h-4" />
          <span className="hidden md:inline">Archive</span>
        </Button>
        <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
          <Key className="w-4 h-4" />
          <span className="hidden md:inline">Permission</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1 sm:gap-2 shrink-0">
              <MoreVertical className="w-4 h-4" />
              <span className="hidden sm:inline">All tools</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>More options...</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Second Row: Navigation Controls, Path, Search, User Icons */}
      <div className="h-14 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-0">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="Main">
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="Back">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="Forward">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="Up">
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="Refresh">
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Path Display */}
        <div className="flex-1 min-w-0">
          <Input
            value="Path://public_html/files/Web assets/"
            readOnly
            className="bg-background w-full text-xs sm:text-sm"
          />
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Q Search"
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
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => onViewModeChange("list")}
              title="List view"
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        )}

        {/* User/Settings Icons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="Notifications">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 hover:bg-primary/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                title="User menu"
              >
                <span className="text-xs sm:text-sm">
                  {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "👤"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
                <User className="w-4 h-4 mr-2" />
                <span>View Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Profile Modal */}
        <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      </div>
    </div>
  )
}
