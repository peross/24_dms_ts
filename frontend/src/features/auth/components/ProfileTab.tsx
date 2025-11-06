import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, User, Save } from 'lucide-react';

export function ProfileTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { updateProfile, updateProfileLoading } = useProfile();

  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setUsername(user.username || '');
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    try {
      await updateProfile({
        email: email !== user?.email ? email : undefined,
        username: username !== user?.username ? username : undefined,
        firstName: firstName !== user?.firstName ? firstName : undefined,
        lastName: lastName !== user?.lastName ? lastName : undefined,
      });
      setProfileSuccess(t('auth.profile.profileUpdated'));
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setProfileError(error.response?.data?.error || error.message || t('auth.profile.updateFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('auth.profile.profileInformation')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('auth.profile.profileDescription')}
        </p>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-4">
        {profileError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm p-3 rounded-md">
            {profileSuccess}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="modal-email" className="text-sm font-medium">
            {t('auth.profile.email')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="modal-email"
              type="email"
              placeholder={t('auth.profile.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              disabled={updateProfileLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="modal-username" className="text-sm font-medium">
            {t('auth.profile.username')}
            <span className="text-xs text-muted-foreground ml-2">{t('auth.profile.usernameOptional')}</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="modal-username"
              type="text"
              placeholder={t('auth.profile.usernamePlaceholder')}
              value={username}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                setUsername(value);
              }}
              className="pl-10"
              disabled={updateProfileLoading}
              minLength={3}
              maxLength={30}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('auth.profile.usernameHint')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="modal-firstName" className="text-sm font-medium">
              {t('auth.profile.firstName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="modal-firstName"
                type="text"
                placeholder={t('auth.profile.firstNamePlaceholder')}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-10"
                disabled={updateProfileLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="modal-lastName" className="text-sm font-medium">
              {t('auth.profile.lastName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="modal-lastName"
                type="text"
                placeholder={t('auth.profile.lastNamePlaceholder')}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="pl-10"
                disabled={updateProfileLoading}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={updateProfileLoading}>
          <Save className="w-4 h-4 mr-2" />
          {updateProfileLoading ? t('auth.profile.saving') : t('auth.profile.saveChanges')}
        </Button>
      </form>
    </div>
  );
}

