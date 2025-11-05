import { useState } from "react"
import { Bell, Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type?: "info" | "success" | "warning" | "error"
}

// Mock notifications - replace with real data from API
const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "File Upload Complete",
    message: "document.pdf has been successfully uploaded",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false,
    type: "success",
  },
  {
    id: "2",
    title: "Shared with You",
    message: "John Doe shared a folder with you",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    type: "info",
  },
  {
    id: "3",
    title: "Storage Warning",
    message: "You're using 85% of your storage quota",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    type: "warning",
  },
  {
    id: "4",
    title: "Storage Warning",
    message: "You're using 85% of your storage quota",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    type: "warning",
  },
  {
    id: "5",
    title: "Storage Warning",
    message: "You're using 85% of your storage quota",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    type: "warning",
  },
  {
    id: "6",
    title: "Storage Warning",
    message: "You're using 85% of your storage quota",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    type: "warning",
  },
  {
    id: "7",
    title: "Storage Warning",
    message: "You're using 85% of your storage quota",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    type: "warning",
  },
  {
    id: "8",
    title: "Storage Warning",
    message: "You're using 85% of your storage quota",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    type: "warning",
  },
  {
    id: "9",
    title: "Storage Warning",
    message: "You're using 85% of your storage quota",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    type: "warning",
  },
  {
    id: "10",
    title: "Storage Warning",
    message: "You're using 85% of your storage quota",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    type: "warning",
  },
]

export function NotificationDropdown() {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return t("notifications.justNow", "Just now")
    if (diffInSeconds < 3600) return t("notifications.minutesAgo", "{{minutes}}m ago", { minutes: Math.floor(diffInSeconds / 60) })
    if (diffInSeconds < 86400) return t("notifications.hoursAgo", "{{hours}}h ago", { hours: Math.floor(diffInSeconds / 3600) })
    if (diffInSeconds < 604800) return t("notifications.daysAgo", "{{days}}d ago", { days: Math.floor(diffInSeconds / 86400) })
    return date.toLocaleDateString()
  }

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-10 sm:w-10 relative"
          title={t("header.notifications")}
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-semibold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 max-w-[calc(100vw-2rem)] overflow-x-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 gap-2">
          <DropdownMenuLabel className="px-0 flex-1 min-w-0 truncate">
            {t("notifications.title", "Notifications")}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs shrink-0"
              onClick={handleMarkAllAsRead}
            >
              {t("notifications.markAllRead", "Mark all read")}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t("notifications.noNotifications", "No notifications")}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <div key={notification.id}>
                  <DropdownMenuItem
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 cursor-pointer overflow-hidden",
                      !notification.read && "bg-accent/50"
                    )}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between w-full gap-2 min-w-0">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium truncate flex-1 min-w-0",
                              !notification.read && "font-semibold"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs"
                onClick={handleClearAll}
              >
                {t("notifications.clearAll", "Clear all")}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

