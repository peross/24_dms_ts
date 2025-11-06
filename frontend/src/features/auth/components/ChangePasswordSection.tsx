import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, Save } from 'lucide-react';

export function ChangePasswordSection() {
  const { t } = useTranslation();
  const { updatePassword, updatePasswordLoading } = useProfile();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.profile.passwordsDoNotMatch'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('auth.profile.passwordTooShort'));
      return;
    }

    try {
      await updatePassword({ currentPassword, newPassword });
      setPasswordSuccess(t('auth.profile.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setPasswordError(error.response?.data?.error || error.message || t('auth.profile.passwordUpdateFailed'));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5" />
          {t('auth.profile.changePassword')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('auth.profile.updatePasswordDescription')}
        </p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        {passwordError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm p-3 rounded-md">
            {passwordSuccess}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="modal-currentPassword" className="text-sm font-medium">
            {t('auth.profile.currentPassword')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="modal-currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder={t('auth.profile.currentPasswordPlaceholder')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="pl-10 pr-10"
              required
              disabled={updatePasswordLoading}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={updatePasswordLoading}
            >
              {showCurrentPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="modal-newPassword" className="text-sm font-medium">
              {t('auth.profile.newPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="modal-newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder={t('auth.profile.newPasswordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={updatePasswordLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={updatePasswordLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="modal-confirmPassword" className="text-sm font-medium">
              {t('auth.profile.confirmPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="modal-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('auth.profile.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={updatePasswordLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={updatePasswordLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={updatePasswordLoading || !currentPassword || !newPassword || !confirmPassword}>
          <Save className="w-4 h-4 mr-2" />
          {updatePasswordLoading ? t('auth.profile.updating') : t('auth.profile.updatePassword')}
        </Button>
      </form>
    </div>
  );
}

