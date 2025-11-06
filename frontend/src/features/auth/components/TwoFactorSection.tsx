import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { authApi } from '@/lib/api/auth.api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function TwoFactorSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Get 2FA status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['auth', 'two-factor', 'status'],
    queryFn: () => authApi.getTwoFactorStatus(),
  });

  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string; backupCodes: string[] } | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const setupMutation = useMutation({
    mutationFn: () => authApi.setupTwoFactor(),
    onSuccess: (data) => {
      setSetupData(data);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (token: string) => authApi.verifyTwoFactorSetup(token),
    onSuccess: () => {
      setSetupData(null);
      setVerificationToken('');
      queryClient.invalidateQueries({ queryKey: ['auth', 'two-factor', 'status'] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (password: string) => authApi.disableTwoFactor(password),
    onSuccess: () => {
      setDisablePassword('');
      setShowDisableDialog(false);
      queryClient.invalidateQueries({ queryKey: ['auth', 'two-factor', 'status'] });
    },
  });

  const handleCopyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  if (statusLoading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">{t('auth.profile.loading2FAStatus')}</div>
      </div>
    );
  }

  const isEnabled = status?.enabled || false;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5" />
          {t('auth.profile.twoFactorAuth')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('auth.profile.twoFactorDisabled')}
        </p>
      </div>

      {isEnabled ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              {t('auth.profile.twoFactorEnabled')}
            </span>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDisableDialog(true)}
            disabled={disableMutation.isPending}
          >
            <ShieldOff className="w-4 h-4 mr-2" />
            {t('auth.profile.disable2FA')}
          </Button>
        </div>
      ) : setupData ? (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
              {t('auth.profile.scanQRCode')}
            </p>
            <div className="flex justify-center mb-4">
              <img src={setupData.qrCodeUrl} alt="QR Code" className="border rounded-lg" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.profile.enterVerificationCode')}</label>
              <Input
                type="text"
                placeholder={t('auth.login.twoFactorCodePlaceholder')}
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <Button
                onClick={() => verifyMutation.mutate(verificationToken)}
                disabled={verificationToken.length !== 6 || verifyMutation.isPending}
                className="w-full"
              >
                {verifyMutation.isPending ? t('auth.profile.verifying') : t('auth.profile.verifyAndEnable')}
              </Button>
              {verifyMutation.error && (
                <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                  {(verifyMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error || t('auth.profile.verificationFailed')}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('auth.profile.backupCodes')}</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyBackupCodes}
              >
                {copiedCodes ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {t('auth.profile.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    {t('auth.profile.copy')}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {t('auth.profile.backupCodesHint')}
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {setupData.backupCodes.map((code, index) => (
                <div key={index} className="p-2 bg-background rounded border">
                  {code}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Button
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
          >
            <Shield className="w-4 h-4 mr-2" />
            {setupMutation.isPending ? t('auth.profile.settingUp') : t('auth.profile.enable2FA')}
          </Button>
        </div>
      )}

      {/* Disable 2FA Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('auth.profile.disable2FATitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('auth.profile.disable2FADescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('auth.profile.password')}</label>
              <Input
                type="password"
                placeholder={t('auth.profile.passwordPlaceholder')}
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && disablePassword) {
                    disableMutation.mutate(disablePassword);
                  }
                }}
              />
            </div>
            {disableMutation.error && (
              <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                {(disableMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error || t('auth.profile.disable2FAFailed')}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisablePassword('')}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableMutation.mutate(disablePassword)}
              disabled={!disablePassword || disableMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disableMutation.isPending ? t('auth.profile.disabling') : t('auth.profile.disable2FA')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

