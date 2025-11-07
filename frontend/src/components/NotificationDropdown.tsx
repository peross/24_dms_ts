import { useMemo, useState } from "react"
import { Bell, Check, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn, formatFileSize } from "@/lib/utils"
import { useNotifications } from "@/features/notifications/hooks/useNotifications"
import type { NotificationDto } from "@/lib/api/notification.api"

const parseDate = (value: string): Date => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return parsed
}

const messageByType: Record<string, string> = {
  file_uploaded: "notifications.types.fileUploaded",
  file_updated: "notifications.types.fileUpdated",
  file_deleted: "notifications.types.fileDeleted",
  folder_created: "notifications.types.folderCreated",
  folder_updated: "notifications.types.folderUpdated",
  folder_deleted: "notifications.types.folderDeleted",
}

const MAX_DESCRIPTION_LENGTH = 120

const truncate = (value: string, limit = MAX_DESCRIPTION_LENGTH) => {
  if (value.length <= limit) {
    return value
  }
  return `${value.slice(0, limit - 1)}…`
}

const formatTimeAgo = (date: Date, t: ReturnType<typeof useTranslation>["t"]): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return t("notifications.justNow", "Just now")
  if (diffInSeconds < 3600)
    return t("notifications.minutesAgo", "{{minutes}}m ago", { minutes: Math.floor(diffInSeconds / 60) })
  if (diffInSeconds < 86400)
    return t("notifications.hoursAgo", "{{hours}}h ago", { hours: Math.floor(diffInSeconds / 3600) })
  if (diffInSeconds < 604800)
    return t("notifications.daysAgo", "{{days}}d ago", { days: Math.floor(diffInSeconds / 86400) })
  return date.toLocaleDateString()
}

const getNotificationMetadata = (notification: NotificationDto): Record<string, unknown> => {
  const { metadata } = notification
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>
  }
  return {}
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const formatSize = (value: unknown): string | null => {
  const numeric = toNumber(value)
  if (numeric === null) {
    return null
  }
  return formatFileSize(numeric)
}

const getPath = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value
  }
  return null
}

const getText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return null
}

type DescriptionContext = {
  path: string | null
  size: string | null
  fileName: string | null
  folderId: number | null
  folderName: string | null
  systemFolderId: number | null
  systemFolderName: string | null
  parentId: number | null
  parentFolderName: string | null
  t: ReturnType<typeof useTranslation>["t"]
}

const fileChangeDescriptionRules = [
  ({ fileName, t }: DescriptionContext) =>
    fileName ? t("notifications.descriptions.fileName", { name: fileName }) : null,
  ({ folderName, t }: DescriptionContext) =>
    folderName ? t("notifications.descriptions.folderName", { name: folderName }) : null,
  ({ path, t }: DescriptionContext) => (path ? t("notifications.descriptions.path", { path }) : null),
  ({ size, t }: DescriptionContext) => (size ? t("notifications.descriptions.size", { size }) : null),
  ({ systemFolderName, t }: DescriptionContext) =>
    systemFolderName ? t("notifications.descriptions.systemFolderName", { name: systemFolderName }) : null,
  ({ folderId, t }: DescriptionContext) =>
    folderId ? t("notifications.descriptions.folderId", { id: folderId }) : null,
]

const fileDeletedDescriptionRules = [
  ({ fileName, t }: DescriptionContext) =>
    fileName ? t("notifications.descriptions.fileName", { name: fileName }) : null,
  ({ folderName, t }: DescriptionContext) =>
    folderName ? t("notifications.descriptions.folderName", { name: folderName }) : null,
  ({ path, t }: DescriptionContext) =>
    path ? t("notifications.descriptions.previousPath", { path }) : null,
  ({ systemFolderName, t }: DescriptionContext) =>
    systemFolderName ? t("notifications.descriptions.systemFolderName", { name: systemFolderName }) : null,
  ({ folderId, t }: DescriptionContext) =>
    folderId ? t("notifications.descriptions.folderId", { id: folderId }) : null,
]

const folderChangeDescriptionRules = [
  ({ folderName, t }: DescriptionContext) =>
    folderName ? t("notifications.descriptions.folderName", { name: folderName }) : null,
  ({ systemFolderName, t }: DescriptionContext) =>
    systemFolderName ? t("notifications.descriptions.systemFolderName", { name: systemFolderName }) : null,
  ({ path, t }: DescriptionContext) => (path ? t("notifications.descriptions.path", { path }) : null),
  ({ systemFolderId, t }: DescriptionContext) =>
    systemFolderId ? t("notifications.descriptions.systemFolderId", { id: systemFolderId }) : null,
]

const folderDeletedDescriptionRules = [
  ({ folderName, t }: DescriptionContext) =>
    folderName ? t("notifications.descriptions.folderName", { name: folderName }) : null,
  ({ parentFolderName, t }: DescriptionContext) =>
    parentFolderName ? t("notifications.descriptions.parentFolderName", { name: parentFolderName }) : null,
  ({ path, t }: DescriptionContext) =>
    path ? t("notifications.descriptions.previousPath", { path }) : null,
  ({ parentId, t }: DescriptionContext) =>
    parentId ? t("notifications.descriptions.parentId", { id: parentId }) : null,
  ({ systemFolderName, t }: DescriptionContext) =>
    systemFolderName ? t("notifications.descriptions.systemFolderName", { name: systemFolderName }) : null,
  ({ systemFolderId, t }: DescriptionContext) =>
    systemFolderId ? t("notifications.descriptions.systemFolderId", { id: systemFolderId }) : null,
]

const descriptionRulesMap: Record<string, Array<(context: DescriptionContext) => string | null>> = {
  file_uploaded: fileChangeDescriptionRules,
  file_updated: fileChangeDescriptionRules,
  file_deleted: fileDeletedDescriptionRules,
  folder_created: folderChangeDescriptionRules,
  folder_updated: folderChangeDescriptionRules,
  folder_deleted: folderDeletedDescriptionRules,
}

const getDescription = (
  notification: NotificationDto,
  metadata: Record<string, unknown>,
  t: ReturnType<typeof useTranslation>["t"]
): string | null => {
  const context: DescriptionContext = {
    path: getPath(metadata.path),
    size: formatSize(metadata.size),
    fileName: getText(metadata.fileName),
    folderId: toNumber(metadata.folderId),
    folderName: getText(metadata.folderName),
    systemFolderId: toNumber(metadata.systemFolderId),
    systemFolderName: getText(metadata.systemFolderName),
    parentId: toNumber(metadata.parentId),
    parentFolderName: getText(metadata.parentFolderName),
    t,
  }

  let systemFolderInfo: string | null = null
  if (context.systemFolderName) {
    systemFolderInfo = t("notifications.descriptions.systemFolderName", { name: context.systemFolderName })
  } else if (context.systemFolderId) {
    systemFolderInfo = t("notifications.descriptions.systemFolderId", { id: context.systemFolderId })
  }

  const rules = descriptionRulesMap[notification.type] ?? []
  for (const rule of rules) {
    const result = rule(context)
    if (result) {
      return result
    }
  }

  return systemFolderInfo
}

const getDefaultMessage = (notification: NotificationDto, t: ReturnType<typeof useTranslation>["t"]): string => {
  const translationKey = messageByType[notification.type]
  if (translationKey) {
    return t(translationKey, notification.message)
  }
  return notification.message
}

export function NotificationDropdown() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, markAsRead, markAsReadAsync, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)

  const orderedNotifications = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        const aTime = parseDate(a.createdAt).getTime()
        const bTime = parseDate(b.createdAt).getTime()
        return bTime - aTime
      }),
    [notifications]
  )

  const markAsReadOnly = (notificationId: number) => {
    markAsRead(notificationId)
  }

  const getFolderRoute = (metadata: Record<string, unknown>): string | null => {
    const folderId = toNumber(metadata.folderId)
    if (folderId) {
      return `/files/folder/${folderId}`
    }
    const systemFolderId = toNumber(metadata.systemFolderId)
    if (systemFolderId) {
      return `/files/system/${systemFolderId}`
    }
    return null
  }

  const getFileRoute = (metadata: Record<string, unknown>): string | null => {
    const fileId = toNumber(metadata.fileId)
    if (!fileId) {
      return null
    }

    const params = new URLSearchParams()
    const folderId = toNumber(metadata.folderId)
    const systemFolderId = toNumber(metadata.systemFolderId)

    if (folderId) {
      params.set("folder_id", folderId.toString())
    } else if (systemFolderId) {
      params.set("system_folder_id", systemFolderId.toString())
    }

    const query = params.toString()
    return query ? `/files/view/${fileId}?${query}` : `/files/view/${fileId}`
  }

  const getParentFolderRoute = (metadata: Record<string, unknown>): string | null => {
    const parentId = toNumber(metadata.parentId)
    if (parentId) {
      return `/files/folder/${parentId}`
    }
    return getFolderRoute(metadata)
  }

  const resolveNavigationTarget = (notification: NotificationDto): string => {
    const metadata = getNotificationMetadata(notification)

    switch (notification.type) {
      case "file_uploaded":
      case "file_updated":
        return getFileRoute(metadata) ?? getFolderRoute(metadata) ?? "/files"
      case "file_deleted":
        return getFolderRoute(metadata) ?? "/files"
      case "folder_created":
      case "folder_updated":
        return getFolderRoute(metadata) ?? "/files"
      case "folder_deleted":
        return getParentFolderRoute(metadata) ?? "/files"
      default:
        return "/files"
    }
  }

  const handleNotificationClick = (notification: NotificationDto) => {
    if (!notification.read) {
      void markAsReadAsync(notification.notificationId)
    }

    const target = resolveNavigationTarget(notification)
    setOpen(false)
    navigate(target)
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const renderNotificationItem = (notification: NotificationDto) => {
    const createdAt = parseDate(notification.createdAt)
    const message = getDefaultMessage(notification, t)
    const metadata = getNotificationMetadata(notification)
    const description = getDescription(notification, metadata, t)
    const truncatedDescription = description ? truncate(description) : null

    return (
      <div key={notification.notificationId}>
        <DropdownMenuItem
          className={cn(
            "flex flex-col items-start gap-1 p-3 cursor-pointer overflow-hidden",
            !notification.read && "bg-accent/50"
          )}
          onClick={() => handleNotificationClick(notification)}
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {t("notifications.new", "New")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{message}</p>
              {truncatedDescription && (
                <p className="text-[11px] text-muted-foreground/80 line-clamp-2">
                  {truncatedDescription}
                </p>
              )}
            </div>
            {!notification.read && (
              <button
                type="button"
                className="text-primary/80 hover:text-primary shrink-0 mt-0.5"
                onClick={(event) => {
                  event.stopPropagation()
                  markAsReadOnly(notification.notificationId)
                }}
                title={t("notifications.markRead", "Mark as read")}
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground uppercase">{formatTimeAgo(createdAt, t)}</p>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </div>
    )
  }

  let notificationsContent: JSX.Element

  if (isLoading) {
    notificationsContent = (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        {t("notifications.loading", "Loading notifications...")}
      </div>
    )
  } else if (orderedNotifications.length === 0) {
    notificationsContent = (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <Bell className="w-12 h-12 text-muted-foreground mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground">
          {t("notifications.noNotifications", "No notifications")}
        </p>
      </div>
    )
  } else {
    notificationsContent = <div className="py-1">{orderedNotifications.map(renderNotificationItem)}</div>
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 relative" title={t("header.notifications")}>
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
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs shrink-0" onClick={handleMarkAllAsRead}>
              {t("notifications.markAllRead", "Mark all read")}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">{notificationsContent}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

