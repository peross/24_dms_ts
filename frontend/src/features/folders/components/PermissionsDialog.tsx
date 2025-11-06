import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Shield, Loader2 } from "lucide-react"
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
import { useUpdateFolder } from "@/features/folders/hooks/useFolders"
import type { FileItem } from "@/components/FileGridView"

interface PermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: FileItem | null
}

export function PermissionsDialog({ open, onOpenChange, item }: PermissionsDialogProps) {
  const { t } = useTranslation()
  const [permissions, setPermissions] = useState("755")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const updateFolderMutation = useUpdateFolder()

  useEffect(() => {
    if (item && open) {
      setPermissions(item.permission || "755")
      setError("")
    }
  }, [item, open])

  const handleSave = async () => {
    if (!item) return

    // Validate permissions format (3 digits, each 0-7)
    const permissionsRegex = /^[0-7]{3}$/
    if (!permissionsRegex.test(permissions)) {
      setError(t('folders.invalidPermissions'))
      return
    }

    setError("")
    setIsLoading(true)

    try {
      await updateFolderMutation.mutateAsync({
        folderId: item.id,
        data: { permissions },
      })
      onOpenChange(false)
      setPermissions("755")
    } catch (err: any) {
      setError(err.message || t('folders.permissionsError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setPermissions("755")
      setError("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('folders.permissions')}
          </DialogTitle>
          <DialogDescription>
            {t('folders.permissionsDescription', { name: item?.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="permissions" className="text-sm font-medium">
              {t('folders.permissions')}
            </label>
            <Input
              id="permissions"
              value={permissions}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 3)
                setPermissions(value)
                setError("")
              }}
              disabled={isLoading}
              placeholder="755"
              maxLength={3}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave()
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t('folders.permissionsHint')}
            </p>
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
            onClick={handleSave}
            disabled={isLoading || !permissions || permissions.length !== 3}
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

