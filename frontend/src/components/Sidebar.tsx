import { LayoutDashboard, Folder, Database, Shield, Globe, Mail, Puzzle, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarItem {
  label: string
  icon: React.ElementType
  active?: boolean
}

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "File manager", icon: Folder, active: true },
  { label: "Databases", icon: Database },
  { label: "Security", icon: Shield },
  { label: "Domains", icon: Globe },
  { label: "Email setup", icon: Mail },
  { label: "Integration", icon: Puzzle },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
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
        <div className={cn(
          "p-4 flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <div className={cn(
            "flex items-center gap-2 transition-opacity",
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">f</span>
            </div>
            <span className="text-lg font-semibold whitespace-nowrap">finalui</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 hidden lg:flex"
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
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.label : undefined}
                onClick={onMobileClose}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
