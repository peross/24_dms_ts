/**
 * Translate API error codes to user-friendly messages
 * @param errorCode - The error code from the API response
 * @param errorMessage - Fallback error message if code is not found
 * @param t - Translation function from i18next
 * @returns Translated error message
 */
export function translateError(
  errorCode: string | undefined,
  errorMessage: string | undefined,
  t: (key: string, options?: any) => string
): string {
  if (errorCode && errorCode.startsWith('FILE_')) {
    const translationKey = `files.errors.${errorCode}`;
    const translated = t(translationKey);
    // If translation exists (not the same as the key), return it
    if (translated !== translationKey) {
      return translated;
    }
  }
  
  // Fallback to original error message or a generic error
  return errorMessage || t('common.error');
}

