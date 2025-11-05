import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Move, Loader2, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFolderTree } from "@/features/folders/hooks/useFolders"
import { Loader2 as Spinner } from "lucide-react"
import type { FileItem } from "@/components/FileGridView"
import { cn } from "@/lib/utils"

interface MoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: FileItem | null
  onMove: (item: FileItem, targetFolderId: number | null) => Promise<void>
}

function FolderTreeSelect({ 
  selectedId, 
  onSelect 
}: { 
  selectedId: number | null
  onSelect: (folderId: number | null) => void 
}) {
  const { data: foldersData, isLoading } = useFolderTree()

  const flattenFolders = (folders: any[], level: number = 0): any[] => {
    const result: any[] = []
    folders.forEach((folder) => {
      result.push({
        ...folder,
        level,
      })
      if (folder.children && folder.children.length > 0) {
        result.push(...flattenFolders(folder.children, level + 1))
      }
    })
    return result
  }

  const allFolders = foldersData?.tree ? flattenFolders(foldersData.tree) : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-h-60 overflow-y-auto border rounded-md p-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "w-full text-left px-3 py-2 rounded-sm text-sm transition-colors flex items-center gap-2",
          selectedId === null
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent"
        )}
      >
        <Folder className="w-4 h-4" />
        <span>Root</span>
      </button>
      {allFolders.map((folder) => (
        <button
          key={folder.folderId}
          onClick={() => onSelect(folder.folderId)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-sm text-sm transition-colors flex items-center gap-2",
            selectedId === folder.folderId
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          )}
          style={{ paddingLeft: `${(folder.level || 0) * 20 + 12}px` }}
        >
          <Folder className="w-4 h-4 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </button>
      ))}
    </div>
  )
}

export function MoveDialog({ open, onOpenChange, item, onMove }: MoveDialogProps) {
  const { t } = useTranslation()
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (item && open) {
      // Set initial folder ID based on item's current location
      setSelectedFolderId(null) // Will be set based on item's folderId if needed
      setError("")
    }
  }, [item, open])

  const handleMove = async () => {
    if (!item) return

    setError("")
    setIsLoading(true)

    try {
      await onMove(item, selectedFolderId)
      onOpenChange(false)
      setSelectedFolderId(null)
    } catch (err: any) {
      setError(err.message || t('files.moveError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setSelectedFolderId(null)
      setError("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-5 h-5" />
            {t('files.move')}
          </DialogTitle>
          <DialogDescription>
            {t('files.moveDescription', { name: item?.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('files.selectDestinationFolder')}
            </label>
            <FolderTreeSelect
              selectedId={selectedFolderId}
              onSelect={setSelectedFolderId}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleMove}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.moving')}
              </>
            ) : (
              t('files.move')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

