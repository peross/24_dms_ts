import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AdminRole, AdminUser } from '../hooks/useAdminUsers'
import { translateRoleDescription, translateRoleName } from '../utils/roleTranslation'

export interface AdminUserFormValues {
  readonly email: string
  readonly username?: string
  readonly firstName?: string
  readonly lastName?: string
  readonly password?: string
  readonly roleNames: string[]
}

export interface UserFormDialogProps {
  readonly mode: 'create' | 'edit'
  readonly open: boolean
  readonly loading: boolean
  readonly roles: readonly AdminRole[]
  readonly rolesLoading: boolean
  readonly initialUser?: AdminUser | null
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: AdminUserFormValues) => Promise<void>
}

const defaultFormState: AdminUserFormValues = {
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  password: '',
  roleNames: ['member'],
}

export function UserFormDialog(props: Readonly<UserFormDialogProps>) {
  const { mode, open, loading, roles, rolesLoading, initialUser, onOpenChange, onSubmit } = props
  const { t } = useTranslation()
  const [formValues, setFormValues] = useState<AdminUserFormValues>(defaultFormState)
  const [error, setError] = useState('')

  const initialRoleNames = useMemo(() => {
    if (initialUser?.roles && initialUser.roles.length > 0) {
      return [...initialUser.roles]
    }
    return ['member']
  }, [initialUser])

  useEffect(() => {
    if (!open) return

    setFormValues({
      email: initialUser?.email ?? '',
      username: initialUser?.username ?? '',
      firstName: initialUser?.firstName ?? '',
      lastName: initialUser?.lastName ?? '',
      password: '',
      roleNames: initialRoleNames,
    })
    setError('')
  }, [initialRoleNames, initialUser, open])

  const handleRoleToggle = (roleName: string) => {
    setFormValues((prev) => {
      const hasRole = prev.roleNames.includes(roleName)
      let nextRoles = hasRole
        ? prev.roleNames.filter((role) => role !== roleName)
        : [...prev.roleNames, roleName]

      if (nextRoles.length === 0) {
        nextRoles = ['member']
      }

      return {
        ...prev,
        roleNames: nextRoles,
      }
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!formValues.email.trim()) {
      setError(t('admin.users.errors.emailRequired'))
      return
    }

    if (mode === 'create' && !formValues.password?.trim()) {
      setError(t('admin.users.errors.passwordRequired'))
      return
    }

    const payload: AdminUserFormValues = {
      email: formValues.email.trim(),
      username: formValues.username?.trim() || undefined,
      firstName: formValues.firstName?.trim() || undefined,
      lastName: formValues.lastName?.trim() || undefined,
      password: formValues.password?.trim() || undefined,
      roleNames: formValues.roleNames.length > 0 ? formValues.roleNames : ['member'],
    }

    try {
      await onSubmit(payload)
      onOpenChange(false)
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || t('admin.users.errors.generic')
      setError(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {mode === 'create' ? t('admin.users.addUser') : t('admin.users.editUser')}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' ? t('admin.users.addUserDescription') : t('admin.users.editUserDescription')}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-user-email">
                {t('admin.users.form.email')}
              </label>
              <Input
                id="admin-user-email"
                type="email"
                value={formValues.email}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-user-username">
                {t('admin.users.form.username')}
                <span className="text-xs text-muted-foreground"> {t('admin.users.form.optional')}</span>
              </label>
              <Input
                id="admin-user-username"
                value={formValues.username ?? ''}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    username: event.target.value,
                  }))
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-user-first-name">
                {t('admin.users.form.firstName')}
                <span className="text-xs text-muted-foreground"> {t('admin.users.form.optional')}</span>
              </label>
              <Input
                id="admin-user-first-name"
                value={formValues.firstName ?? ''}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-user-last-name">
                {t('admin.users.form.lastName')}
                <span className="text-xs text-muted-foreground"> {t('admin.users.form.optional')}</span>
              </label>
              <Input
                id="admin-user-last-name"
                value={formValues.lastName ?? ''}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    lastName: event.target.value,
                  }))
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="admin-user-password">
                {t('admin.users.form.password')}
                {mode === 'create' ? null : (
                  <span className="text-xs text-muted-foreground"> {t('admin.users.form.passwordOptional')}</span>
                )}
              </label>
              <Input
                id="admin-user-password"
                type="password"
                value={formValues.password ?? ''}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder={mode === 'create' ? undefined : t('admin.users.form.passwordPlaceholder') ?? undefined}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">{t('admin.users.form.roles')}</p>
            {rolesLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('admin.users.loadingRoles')}
              </div>
            )}
            {!rolesLoading && roles.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('admin.users.noRolesDefined')}</p>
            )}
            {!rolesLoading && roles.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roles.map((role) => {
                  const checked = formValues.roleNames.includes(role.name)
                  const label = translateRoleName(role.name, t)
                  const description = translateRoleDescription(role.name, t, role.description)

                  return (
                    <label
                      key={role.roleId}
                      className={`flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent ${
                        checked ? 'bg-accent border-primary/60' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleRoleToggle(role.name)}
                        disabled={loading}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium capitalize">{label}</p>
                        {description && (
                          <p className="text-xs text-muted-foreground leading-snug">{description}</p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t('admin.users.form.rolesHint')}</p>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button disabled={loading} type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={loading || (mode === 'create' && !formValues.password)} type="submit">
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? t('admin.users.saving') : t('admin.users.updating')}
                </span>
              ) : (
                <span>{mode === 'create' ? t('admin.users.create') : t('admin.users.update')}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

