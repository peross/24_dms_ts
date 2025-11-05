import { useState } from "react"
import { LayoutDashboard, Folder, Users, Clock, Trash2, Settings, ChevronLeft, ChevronRight, X, BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRole } from "@/hooks/useRole"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

interface SidebarSubItem {
  label: string
  path: string
  translationKey: string
}

interface SidebarItem {
  label: string
  icon: React.ElementType
  path?: string
  translationKey: string
  allowedRoles?: string[]
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
  subItems?: SidebarSubItem[]
}

// Base sidebar items available to all authenticated users
const baseSidebarItems: SidebarItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", translationKey: "sidebar.dashboard" },
  { label: "Files", icon: Folder, path: "/dashboard/files", translationKey: "sidebar.files" },
  { label: "Shared", icon: Users, path: "/dashboard/shared", translationKey: "sidebar.shared" },
  { label: "Recent", icon: Clock, path: "/dashboard/recent", translationKey: "sidebar.recent" },
  { label: "Trash", icon: Trash2, path: "/dashboard/trash", translationKey: "sidebar.trash" },
]

// Admin-only sidebar items
const adminSidebarItems: SidebarItem[] = [
  { label: "Settings", icon: Settings, path: "/dashboard/settings", translationKey: "sidebar.settings", requireAdmin: true },
]

// Super admin sidebar items with dropdown
const superAdminSidebarItems: SidebarItem[] = [
  {
    label: "Šifarnici",
    icon: BookOpen,
    translationKey: "sidebar.referenceTables",
    requireSuperAdmin: true,
    subItems: [
      { label: "Users", path: "/dashboard/admin/users", translationKey: "sidebar.users" },
      { label: "Roles", path: "/dashboard/admin/roles", translationKey: "sidebar.roles" },
      { label: "User Roles", path: "/dashboard/admin/user-roles", translationKey: "sidebar.userRoles" },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { hasRole: checkRole, isAdmin, isSuperAdmin } = useRole()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Check if a path is active (including nested routes)
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/"
    }
    return location.pathname.startsWith(path)
  }

  // Check if any sub-item is active
  const hasActiveSubItem = (item: SidebarItem): boolean => {
    if (!item.subItems) return false
    return item.subItems.some(subItem => isActive(subItem.path))
  }

  // Toggle expanded state for dropdown items
  const toggleExpanded = (itemKey: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemKey)) {
        next.delete(itemKey)
      } else {
        next.add(itemKey)
      }
      return next
    })
  }

  // Filter sidebar items based on user roles
  const getVisibleItems = (): SidebarItem[] => {
    const items: SidebarItem[] = [...baseSidebarItems]

    // Add admin items if user has admin privileges
    for (const item of adminSidebarItems) {
      if (item.requireSuperAdmin && isSuperAdmin()) {
        items.push(item)
      } else if (item.requireAdmin && isAdmin()) {
        items.push(item)
      } else if (item.allowedRoles && checkRole(item.allowedRoles)) {
        items.push(item)
      }
    }

    // Add super admin items
    for (const item of superAdminSidebarItems) {
      if (item.requireSuperAdmin && isSuperAdmin()) {
        items.push(item)
      } else if (item.allowedRoles && checkRole(item.allowedRoles)) {
        items.push(item)
      }
    }

    return items
  }

  const visibleItems = getVisibleItems()
  
  // Auto-expand items with active sub-items
  const shouldBeExpanded = (item: SidebarItem): boolean => {
    if (!item.subItems) return false
    const itemKey = item.translationKey
    // Auto-expand if has active sub-item or manually expanded
    return hasActiveSubItem(item) || expandedItems.has(itemKey)
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-card border-r border-border h-screen flex flex-col transition-all duration-300 z-50",
        "fixed lg:relative",
        collapsed ? "w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo/Header */}
        <div className={cn(
          "px-[0.71rem] py-[0.71rem] flex items-center border-b border-border",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <div className={cn(
            "flex items-center gap-2 transition-opacity",
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">DMS</span>
            </div>
            <span className="text-lg font-semibold whitespace-nowrap">DMS</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 hidden lg:flex"
              title={collapsed ? t('common.expand') : t('common.collapse')}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileClose}
              className="h-8 w-8 lg:hidden"
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={300}>
          <nav className="flex-1 p-2 overflow-y-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isExpanded = shouldBeExpanded(item)
              const active = item.path ? isActive(item.path) : hasActiveSubItem(item)
              
              // Render dropdown item when collapsed - use HoverCard for hover
              if (hasSubItems && collapsed) {
                return (
                  <HoverCard key={item.translationKey} openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center justify-center px-3 py-2 rounded-md text-sm transition-colors relative",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent side="right" align="start" className="w-56 p-1">
                      <div className="space-y-1">
                        {item.subItems!.map((subItem) => {
                          const subActive = isActive(subItem.path)
                          return (
                            <button
                              key={subItem.path}
                              onClick={() => {
                                navigate(subItem.path)
                                onMobileClose?.()
                              }}
                              className={cn(
                                "w-full flex items-center px-3 py-2 rounded-sm text-sm transition-colors text-left",
                                subActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              {t(subItem.translationKey)}
                            </button>
                          )
                        })}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )
              }
            
            // Render dropdown item when expanded - use collapsible
            if (hasSubItems && !collapsed) {
              return (
                <div key={item.translationKey} className="mb-1">
                  <button
                    onClick={() => toggleExpanded(item.translationKey)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="whitespace-nowrap">{t(item.translationKey)}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subItems!.map((subItem) => {
                        const subActive = isActive(subItem.path)
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            onClick={onMobileClose}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                              subActive
                                ? "bg-primary/80 text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <span className="whitespace-nowrap">{t(subItem.translationKey)}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }
            
              // Render regular item
              if (!item.path) return null
              
              // Regular item - use Tooltip when collapsed
              if (collapsed) {
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.path}
                        onClick={onMobileClose}
                        className={cn(
                          "w-full flex items-center justify-center px-3 py-2 rounded-md text-sm transition-colors relative",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      <p>{t(item.translationKey)}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onMobileClose}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap">{t(item.translationKey)}</span>
                </NavLink>
              )
            })}
          </nav>
        </TooltipProvider>
      </div>
    </>
  )
}
