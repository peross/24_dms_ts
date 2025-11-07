import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api/client'

export interface AdminRole {
  readonly roleId: number
  readonly name: string
  readonly description?: string | null
  readonly createdAt?: string
  readonly updatedAt?: string
}

export interface AdminUser {
  readonly userId: number
  readonly email: string
  readonly username?: string | null
  readonly firstName?: string | null
  readonly lastName?: string | null
  readonly roles: string[]
  readonly createdAt?: string
  readonly updatedAt?: string
}

export interface CreateAdminUserInput {
  readonly email: string
  readonly password: string
  readonly username?: string
  readonly firstName?: string
  readonly lastName?: string
  readonly roleNames?: string[]
}

export interface UpdateAdminUserInput {
  readonly email?: string
  readonly password?: string
  readonly username?: string | null
  readonly firstName?: string | null
  readonly lastName?: string | null
  readonly roleNames?: string[]
}

const ADMIN_USERS_QUERY_KEY = ['admin', 'users'] as const
const ADMIN_ROLES_QUERY_KEY = ['admin', 'roles'] as const

const fetchAdminUsers = async (): Promise<AdminUser[]> => {
  const response = await apiClient.get<{ users: AdminUser[] }>('/admin/users')
  return response.data.users
}

const fetchAdminRoles = async (): Promise<AdminRole[]> => {
  const response = await apiClient.get<{ roles: AdminRole[] }>('/admin/roles')
  return response.data.roles
}

const createAdminUser = async (data: CreateAdminUserInput): Promise<AdminUser> => {
  const response = await apiClient.post<{ user: AdminUser }>('/admin/users', data)
  return response.data.user
}

const updateAdminUser = async (userId: number, data: UpdateAdminUserInput): Promise<AdminUser> => {
  const response = await apiClient.put<{ user: AdminUser }>(`/admin/users/${userId}`, data)
  return response.data.user
}

const deleteAdminUser = async (userId: number): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/admin/users/${userId}`)
  return response.data
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: fetchAdminUsers,
  })
}

export function useAdminRoles() {
  return useQuery<AdminRole[]>({
    queryKey: ADMIN_ROLES_QUERY_KEY,
    queryFn: fetchAdminRoles,
  })
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAdminUserInput) => createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY })
    },
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateAdminUserInput }) =>
      updateAdminUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY })
    },
  })
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: number) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY })
    },
  })
}

