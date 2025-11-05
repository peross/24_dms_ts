import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FolderPlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreateFolder } from "@/features/folders/hooks/useFolders"
import { useLayout } from "@/components/Layout"

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId?: number | null
}

export function CreateFolderDialog({ open, onOpenChange, parentId }: CreateFolderDialogProps) {
  const { t } = useTranslation()
  const { selectedFolderId } = useLayout()
  const [folderName, setFolderName] = useState("")
  const [error, setError] = useState("")

  // Use parentId prop if provided, otherwise use selected folder from context
  const targetParentId = parentId !== undefined ? parentId : selectedFolderId

  const createMutation = useCreateFolder()

  const handleCreate = (name: string) => {
    createMutation.mutate(
      { name, parentId: targetParentId || undefined },
      {
        onSuccess: () => {
          // Reset form and close dialog
          setFolderName("")
          setError("")
          onOpenChange(false)
        },
        onError: (error: any) => {
          setError(error.response?.data?.error || error.message || t('folders.createError'))
        },
      }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!folderName.trim()) {
      setError(t('folders.nameRequired'))
      return
    }

    handleCreate(folderName.trim())
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setFolderName("")
      setError("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            {t('folders.createFolder')}
          </DialogTitle>
          <DialogDescription>
            {t('folders.createFolderDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="folder-name" className="text-sm font-medium">
                {t('folders.folderName')}
              </label>
              <Input
                id="folder-name"
                type="text"
                placeholder={t('folders.folderNamePlaceholder')}
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value)
                  setError("")
                }}
                disabled={createMutation.isPending}
                autoFocus
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !folderName.trim()}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('folders.creating')}
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  {t('folders.create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

