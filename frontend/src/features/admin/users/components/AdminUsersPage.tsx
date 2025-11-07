import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Users as UsersIcon,
  UserPlus,
  RefreshCcw,
  Loader2,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Columns3,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleGuard } from '@/components/RoleGuard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  useAdminUsers,
  useAdminRoles,
  useCreateAdminUser,
  useDeleteAdminUser,
  useUpdateAdminUser,
  type AdminUser,
} from '../hooks/useAdminUsers'
import { UserFormDialog, type AdminUserFormValues } from './UserFormDialog'
import { DeleteUserDialog } from './DeleteUserDialog'
import { translateRoleName } from '../utils/roleTranslation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const getUsersLoadErrorMessage = (
  t: ReturnType<typeof useTranslation>['t'],
  error: unknown,
): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any
    return axiosError?.response?.data?.error || axiosError?.message || t('admin.users.errors.failedToLoad')
  }
  if (error instanceof Error) {
    return error.message
  }
  return t('admin.users.errors.failedToLoad')
}

const renderStatus = (
  state: {
    readonly isLoading: boolean
    readonly isError: boolean
    readonly filteredUsersEmpty: boolean
  },
  t: ReturnType<typeof useTranslation>['t'],
  onRetry: () => void,
  errorMessage: string,
) => {
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    )
  }

  if (state.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-sm text-destructive">{errorMessage}</p>
        <Button onClick={onRetry} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>
    )
  }

  if (state.filteredUsersEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <p className="text-sm font-medium">{t('admin.users.noResultsTitle')}</p>
        <p className="text-sm">{t('admin.users.noResultsDescription')}</p>
      </div>
    )
  }

  return null
}

type SortColumn = 'name' | 'email' | 'username' | 'roles' | 'createdAt'
type DateRangeOption = 'all' | '7' | '30' | '90'
type ColumnKey = 'name' | 'email' | 'username' | 'roles' | 'createdAt'

export function AdminUsersPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsString = searchParams.toString()
  const lastQueryRef = useRef<string>('')

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [selectedCreatedRange, setSelectedCreatedRange] = useState<DateRangeOption>('all')
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: 'asc' | 'desc' } | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    name: true,
    email: true,
    username: true,
    roles: true,
    createdAt: true,
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)

  const {
    data: users = [],
    isLoading: usersLoading,
    isFetching: usersFetching,
    isError: usersError,
    error: usersErrorObject,
    refetch,
  } = useAdminUsers()

  const { data: roles = [], isLoading: rolesLoading } = useAdminRoles()

  const createMutation = useCreateAdminUser()
  const updateMutation = useUpdateAdminUser()
  const deleteMutation = useDeleteAdminUser()

  const visibleColumnCount = useMemo(
    () => Object.values(visibleColumns).filter(Boolean).length,
    [visibleColumns],
  )

  const roleFilterOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: role.name,
        label: translateRoleName(role.name, t),
      })),
    [roles, t],
  )

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const rangeDays = selectedCreatedRange === 'all' ? null : Number(selectedCreatedRange)
    const now = rangeDays === null ? null : Date.now()

    return users.filter((user) => {
      const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim().toLowerCase()

      const matchesSearch =
        query.length === 0 ||
        user.email.toLowerCase().includes(query) ||
        (user.username ?? '').toLowerCase().includes(query) ||
        fullName.includes(query) ||
        user.roles.join(' ').toLowerCase().includes(query)

      if (matchesSearch) {
        // Continue with additional filters
      } else {
        return false
      }

      if (selectedRoleFilter !== 'all' && !user.roles.includes(selectedRoleFilter)) {
        return false
      }

      if (rangeDays === null) {
        return true
      }

      if (!user.createdAt) {
        return false
      }

      const createdTime = new Date(user.createdAt).getTime()
      if (Number.isNaN(createdTime) || now === null) {
        return false
      }

      const diffDays = (now - createdTime) / (1000 * 60 * 60 * 24)
      return diffDays <= rangeDays
    })
  }, [users, searchTerm, selectedRoleFilter, selectedCreatedRange])

  const sortedUsers = useMemo(() => {
    if (!sortConfig) {
      return filteredUsers
    }

    const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

    const getSortValue = (user: AdminUser) => {
      switch (sortConfig.column) {
        case 'name':
          return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim().toLowerCase()
        case 'email':
          return user.email.toLowerCase()
        case 'username':
          return (user.username ?? '').toLowerCase()
        case 'roles':
          return user.roles.join(', ').toLowerCase()
        case 'createdAt':
          return user.createdAt ? new Date(user.createdAt).getTime() : 0
        default:
          return ''
      }
    }

    return [...filteredUsers].sort((a, b) => {
      const aValue = getSortValue(a)
      const bValue = getSortValue(b)

      let comparison = 0

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = collator.compare(String(aValue), String(bValue))
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [filteredUsers, sortConfig])

  const filtersApplied = selectedRoleFilter !== 'all' || selectedCreatedRange !== 'all'
  const isFilteredView = filtersApplied || searchTerm.trim().length > 0
  const summaryText = isFilteredView
    ? t('admin.users.filteredSummary', { count: filteredUsers.length, total: users.length })
    : t('admin.users.totalUsers', { count: users.length })

  const columnsSelection = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Columns3 className="mr-2 h-4 w-4" />
          {t('admin.users.columnsMenu.trigger')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem
          onClick={() =>
            setVisibleColumns({
              name: true,
              email: true,
              username: true,
              roles: true,
              createdAt: true,
            })
          }
        >
          <Check className="mr-2 h-4 w-4" />
          <span>{t('admin.users.columnsMenu.showAll')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {(
          [
            { key: 'name' as ColumnKey, label: t('admin.users.columns.name') },
            { key: 'email' as ColumnKey, label: t('admin.users.columns.email') },
            { key: 'username' as ColumnKey, label: t('admin.users.columns.username') },
            { key: 'roles' as ColumnKey, label: t('admin.users.columns.roles') },
            { key: 'createdAt' as ColumnKey, label: t('admin.users.columns.createdAt') },
          ] as Array<{ key: ColumnKey; label: string }>
        ).map(({ key, label }) => {
          const checked = visibleColumns[key]
          const disabled = checked && visibleColumnCount <= 1

          return (
            <DropdownMenuItem
              key={key}
              className="flex items-center gap-2"
              onClick={() => {
                if (disabled) return
                setVisibleColumns((prev) => ({
                  ...prev,
                  [key]: !prev[key],
                }))
              }}
            >
              <Check className={`h-4 w-4 ${checked ? 'opacity-100' : 'opacity-0'}`} />
              <span className={disabled ? 'text-muted-foreground' : undefined}>{label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) => {
      if (prev?.column !== column) {
        return { column, direction: 'asc' }
      }

      if (prev.direction === 'asc') {
        return { column, direction: 'desc' }
      }

      return null
    })
  }

  const renderSortIcon = (column: SortColumn) => {
    if (sortConfig?.column !== column) {
      return <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
    }

    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-2 h-3.5 w-3.5" />
    )
  }

  const resetFilters = () => {
    setSelectedRoleFilter('all')
    setSelectedCreatedRange('all')
    setSearchTerm('')
    setSortConfig(null)
  }

  const usersLoadErrorMessage = getUsersLoadErrorMessage(t, usersErrorObject)

  const handleCreate = async (values: AdminUserFormValues) => {
    await createMutation.mutateAsync({
      email: values.email,
      password: values.password ?? '',
      username: values.username,
      firstName: values.firstName,
      lastName: values.lastName,
      roleNames: values.roleNames,
    })
    toast.success(t('admin.users.notifications.userCreated', { email: values.email }))
  }

  const handleUpdate = async (values: AdminUserFormValues) => {
    if (!editUser) return
    await updateMutation.mutateAsync({
      userId: editUser.userId,
      data: {
        email: values.email,
        username: values.username ?? null,
        firstName: values.firstName ?? null,
        lastName: values.lastName ?? null,
        password: values.password ? values.password : undefined,
        roleNames: values.roleNames,
      },
    })
    toast.success(t('admin.users.notifications.userUpdated', { email: values.email }))
  }

  const handleDelete = () => {
    if (!deleteUser) return
    deleteMutation.mutate(deleteUser.userId, {
      onSuccess: () => {
        toast.success(t('admin.users.notifications.userDeleted', { email: deleteUser.email }))
        setDeleteUser(null)
      },
      onError: (err: any) => {
        const message = err?.response?.data?.error || err?.message || t('admin.users.errors.generic')
        toast.error(message)
      },
    })
  }

  const status = renderStatus(
    {
      isLoading: usersLoading,
      isError: usersError,
      filteredUsersEmpty: !usersLoading && !usersError && filteredUsers.length === 0,
    },
    t,
    () => refetch(),
    usersLoadErrorMessage,
  )

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString)

    const urlSearch = params.get('q') ?? ''
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch)
    }

    const urlRole = params.get('role') ?? 'all'
    if (urlRole !== selectedRoleFilter) {
      setSelectedRoleFilter(urlRole)
    }

    const urlCreated = params.get('created')
    if (urlCreated === '7' || urlCreated === '30' || urlCreated === '90') {
      if (urlCreated !== selectedCreatedRange) {
        setSelectedCreatedRange(urlCreated)
      }
    } else if (selectedCreatedRange !== 'all') {
      setSelectedCreatedRange('all')
    }

    const urlSort = params.get('sort')
    const urlDir = params.get('dir') === 'desc' ? 'desc' : 'asc'
    if (urlSort && ['name', 'email', 'username', 'roles', 'createdAt'].includes(urlSort)) {
      if (sortConfig?.column !== urlSort || sortConfig?.direction !== urlDir) {
        setSortConfig({ column: urlSort as SortColumn, direction: urlDir })
      }
    } else if (sortConfig) {
      setSortConfig(null)
    }
  }, [searchParamsString])

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim())
    }
    if (selectedRoleFilter !== 'all') {
      params.set('role', selectedRoleFilter)
    }
    if (selectedCreatedRange !== 'all') {
      params.set('created', selectedCreatedRange)
    }
    if (sortConfig) {
      params.set('sort', sortConfig.column)
      params.set('dir', sortConfig.direction)
    }

    const nextQuery = params.toString()
    if (nextQuery !== lastQueryRef.current) {
      lastQueryRef.current = nextQuery
      setSearchParams(params, { replace: true })
    }
  }, [searchTerm, selectedRoleFilter, selectedCreatedRange, sortConfig, setSearchParams])

  return (
    <RoleGuard requireSuperAdmin showError>
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold">
                <UsersIcon className="h-8 w-8" />
                {t('sidebar.users')}
              </h1>
              <p className="mt-2 text-muted-foreground">{t('admin.users.description')}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={usersFetching || usersLoading} onClick={() => refetch()} variant="outline">
                {usersFetching || usersLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('admin.users.refreshing')}
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t('common.refresh')}
                  </>
                )}
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('admin.users.addUser')}
              </Button>
            </div>
          </div>

          <div className="space-y-6 rounded-lg border border-border bg-card p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
                <label className="flex w-full min-w-[220px] flex-col gap-1 text-xs font-medium text-muted-foreground lg:w-64">
                  {t('admin.users.filters.searchLabel')}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder={t('admin.users.searchPlaceholder') ?? ''}
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    {t('admin.users.filters.roleLabel')}
                    <select
                      value={selectedRoleFilter}
                      onChange={(event) => setSelectedRoleFilter(event.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      disabled={rolesLoading}
                    >
                      <option value="all">{t('admin.users.filters.roleAll')}</option>
                      {roleFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    {t('admin.users.filters.createdLabel')}
                    <select
                      value={selectedCreatedRange}
                      onChange={(event) => {
                        const value = event.target.value
                        if (value === 'all' || value === '7' || value === '30' || value === '90') {
                          setSelectedCreatedRange(value)
                        }
                      }}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="all">{t('admin.users.filters.createdAny')}</option>
                      <option value="7">{t('admin.users.filters.created7')}</option>
                      <option value="30">{t('admin.users.filters.created30')}</option>
                      <option value="90">{t('admin.users.filters.created90')}</option>
                    </select>
                  </label>
                </div>

                {(filtersApplied || searchTerm.trim().length > 0 || sortConfig) && (
                  <Button onClick={resetFilters} variant="ghost" size="sm" className="h-9">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    {t('admin.users.filters.reset')}
                  </Button>
                )}
              </div>

              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <p className="text-sm text-muted-foreground">{summaryText}</p>
                {columnsSelection}
              </div>
            </div>

            {status ?? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      {visibleColumns.name && (
                        <th className="px-2 py-3 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort('name')}
                            className="flex items-center text-xs font-medium uppercase tracking-wide"
                          >
                            {t('admin.users.columns.name')}
                            {renderSortIcon('name')}
                          </button>
                        </th>
                      )}
                      {visibleColumns.email && (
                        <th className="px-2 py-3 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort('email')}
                            className="flex items-center text-xs font-medium uppercase tracking-wide"
                          >
                            {t('admin.users.columns.email')}
                            {renderSortIcon('email')}
                          </button>
                        </th>
                      )}
                      {visibleColumns.username && (
                        <th className="px-2 py-3 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort('username')}
                            className="flex items-center text-xs font-medium uppercase tracking-wide"
                          >
                            {t('admin.users.columns.username')}
                            {renderSortIcon('username')}
                          </button>
                        </th>
                      )}
                      {visibleColumns.roles && (
                        <th className="px-2 py-3 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort('roles')}
                            className="flex items-center text-xs font-medium uppercase tracking-wide"
                          >
                            {t('admin.users.columns.roles')}
                            {renderSortIcon('roles')}
                          </button>
                        </th>
                      )}
                      {visibleColumns.createdAt && (
                        <th className="px-2 py-3 font-medium whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort('createdAt')}
                            className="flex items-center text-xs font-medium uppercase tracking-wide"
                          >
                            {t('admin.users.columns.createdAt')}
                            {renderSortIcon('createdAt')}
                          </button>
                        </th>
                      )}
                      <th className="px-2 py-3 font-medium text-right">{t('common.options')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {sortedUsers.map((user) => {
                      const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                      const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'
                      const isCurrentUser = currentUser?.userId === user.userId

                      return (
                        <tr key={user.userId} className="transition-colors hover:bg-accent/40">
                          {visibleColumns.name && (
                            <td className="px-2 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium">{fullName || t('admin.users.unknownName')}</span>
                                <span className="text-xs text-muted-foreground">ID: {user.userId}</span>
                              </div>
                            </td>
                          )}
                          {visibleColumns.email && <td className="px-2 py-3">{user.email}</td>}
                          {visibleColumns.username && (
                            <td className="px-2 py-3">{user.username || <span className="text-muted-foreground">—</span>}</td>
                          )}
                          {visibleColumns.roles && (
                            <td className="px-2 py-3">
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map((role) => (
                                  <span
                                    key={role}
                                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary"
                                  >
                                    {translateRoleName(role, t)}
                                  </span>
                                ))}
                              </div>
                            </td>
                          )}
                          {visibleColumns.createdAt && (
                            <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">{createdAt}</td>
                          )}
                          <td className="px-2 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="icon"
                                title={t('common.edit') ?? ''}
                                variant="ghost"
                                onClick={() => setEditUser(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                title={t('common.delete') ?? ''}
                                variant="ghost"
                                disabled={isCurrentUser || deleteMutation.isPending}
                                className={isCurrentUser ? 'cursor-not-allowed opacity-40' : ''}
                                onClick={() => setDeleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <UserFormDialog
        mode="create"
        open={createDialogOpen}
        loading={createMutation.isPending}
        roles={roles}
        rolesLoading={rolesLoading}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
      />

      <UserFormDialog
        mode="edit"
        open={Boolean(editUser)}
        loading={updateMutation.isPending}
        roles={roles}
        rolesLoading={rolesLoading}
        initialUser={editUser}
        onOpenChange={(open) => {
          if (!open) {
            setEditUser(null)
          }
        }}
        onSubmit={handleUpdate}
      />

      <DeleteUserDialog
        user={deleteUser}
        open={Boolean(deleteUser)}
        loading={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteUser(null)
          }
        }}
        onConfirm={handleDelete}
      />
    </RoleGuard>
  )
}

