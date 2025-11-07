import type { TFunction } from 'i18next'

const normalizeRoleName = (roleName: string) => roleName.replaceAll('_', ' ')

export const translateRoleName = (roleName: string, t: TFunction): string => {
  const translationKey = `roles.${roleName}.name`
  const translation = t(translationKey)
  if (translation !== translationKey) {
    return translation
  }
  return normalizeRoleName(roleName)
}

export const translateRoleDescription = (
  roleName: string,
  t: TFunction,
  fallback?: string | null,
): string | undefined => {
  const translationKey = `roles.${roleName}.description`
  const translation = t(translationKey)
  if (translation !== translationKey) {
    return translation
  }
  return fallback ?? undefined
}

