import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
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
import { Monitor, LogOut, AlertCircle } from 'lucide-react';
import { authApi, type Session } from '@/lib/api/auth.api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export function ActiveSessionsSection() {
  const { t, i18n } = useTranslation();
  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authApi.getActiveSessions(),
  });

  const sessions = sessionsResponse?.sessions || [];

  const queryClient = useQueryClient();
  const revokeMutation = useMutation({
    mutationFn: (refreshTokenId: number) => authApi.revokeSession(refreshTokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
  });

  // State for alert dialog
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<{ refreshTokenId: number; isCurrent: boolean } | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(i18n.language === 'sr' ? 'sr-RS' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceName = (userAgent?: string) => {
    if (!userAgent) return t('auth.profile.unknownDevice');
    
    // Try to detect device type
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return t('auth.profile.mobileDevice');
    }
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return t('auth.profile.tablet');
    }
    
    // Try to detect browser
    if (userAgent.includes('Chrome')) return t('auth.profile.chrome');
    if (userAgent.includes('Firefox')) return t('auth.profile.firefox');
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return t('auth.profile.safari');
    if (userAgent.includes('Edge')) return t('auth.profile.edge');
    
    return t('auth.profile.desktop');
  };

  const handleRevokeClick = (refreshTokenId: number, isCurrent: boolean) => {
    setSessionToRevoke({ refreshTokenId, isCurrent });
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!sessionToRevoke) return;

    try {
      await revokeMutation.mutateAsync(sessionToRevoke.refreshTokenId);
      setRevokeDialogOpen(false);
      setSessionToRevoke(null);
      
      if (sessionToRevoke.isCurrent) {
        // If current session was revoked, logout will be handled by the auth system
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Monitor className="w-5 h-5" />
          {t('auth.profile.activeSessions')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('auth.profile.manageSessions')}
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">{t('auth.profile.loadingSessions')}</div>
      ) : sessions.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('auth.profile.noActiveSessions')}</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session: Session) => (
            <div
              key={session.refreshTokenId}
              className={cn(
                "flex items-start justify-between p-3 rounded-lg border",
                session.isCurrent
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-background border-border'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {getDeviceName(session.userAgent)}
                  </span>
                  {session.isCurrent && (
                    <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                      {t('auth.profile.current')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>{session.userAgent || t('auth.profile.unknownDevice')}</div>
                  <div>{t('auth.profile.ipAddress')}: {session.ipAddress || t('auth.profile.unknown')}</div>
                  <div>{t('auth.profile.lastActive')}: {formatDate(session.createdAt)}</div>
                </div>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeClick(session.refreshTokenId, false)}
                  disabled={revokeMutation.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  {t('auth.profile.revoke')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {sessions.length > 1 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div className="text-xs text-yellow-700 dark:text-yellow-300">
            {t('auth.profile.sessionInfo')}
          </div>
        </div>
      )}

      {/* Revoke Session Confirmation Dialog */}
      <AlertDialog 
        open={revokeDialogOpen} 
        onOpenChange={(open) => {
          setRevokeDialogOpen(open);
          if (!open) {
            setSessionToRevoke(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('auth.profile.revokeSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {sessionToRevoke?.isCurrent
                ? t('auth.profile.revokeCurrentSession')
                : t('auth.profile.revokeOtherSession')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={revokeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending ? t('auth.profile.revoking') : t('auth.profile.revokeSession')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

