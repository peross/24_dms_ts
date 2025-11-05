import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { FileItem } from "@/components/FileGridView"

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: FileItem | null
  onRename: (item: FileItem, newName: string) => Promise<void>
}

export function RenameDialog({ open, onOpenChange, item, onRename }: RenameDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (item && open) {
      setName(item.name)
      setError("")
    }
  }, [item, open])

  const handleRename = async () => {
    if (!item) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t('files.nameRequired'))
      return
    }

    if (trimmedName === item.name) {
      onOpenChange(false)
      return
    }

    setError("")
    setIsLoading(true)

    try {
      await onRename(item, trimmedName)
      onOpenChange(false)
      setName("")
    } catch (err: any) {
      setError(err.message || t('files.renameError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setName("")
      setError("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            {t('files.rename')}
          </DialogTitle>
          <DialogDescription>
            {t('files.renameDescription', { name: item?.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              {item?.type === "folder" ? t('folders.name') : t('files.name')}
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename()
                }
              }}
              autoFocus
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
            onClick={handleRename}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

