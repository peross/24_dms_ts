import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { AdminUser } from '../hooks/useAdminUsers'

export interface DeleteUserDialogProps {
  readonly user: AdminUser | null
  readonly open: boolean
  readonly loading: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => void
}

export function DeleteUserDialog(props: Readonly<DeleteUserDialogProps>) {
  const { user, open, loading, onOpenChange, onConfirm } = props
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('admin.users.deleteUser')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('admin.users.deleteUserDescription', {
              email: user?.email ?? '',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('admin.users.deleting')}
              </span>
            ) : (
              <span>{t('common.delete')}</span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

