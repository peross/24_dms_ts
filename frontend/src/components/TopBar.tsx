import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Menu, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "./ThemeToggle"
import { LanguageSelector } from "./LanguageSelector"
import { NotificationDropdown } from "./NotificationDropdown"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { ProfileModal } from "@/features/auth/components/ProfileModal"

interface TopBarProps {
  readonly onMobileMenuClick?: () => void
}

export function TopBar({ onMobileMenuClick }: TopBarProps) {
  const { t } = useTranslation()
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
    <>
      <div className="bg-card border-b border-border h-14 flex items-center justify-between px-4">
        {/* Mobile Menu Button */}
        {onMobileMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuClick}
            className="h-8 w-8 sm:h-10 sm:w-10 lg:hidden"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        )}

        {/* Spacer for mobile menu button */}
        {!onMobileMenuClick && <div />}

        {/* Right side: User controls */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
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
    </>
  )
}

