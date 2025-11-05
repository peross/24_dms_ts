import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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
import { Mail, User, Lock, Eye, EyeOff, Save, Monitor, LogOut, AlertCircle, Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { authApi, type Session } from '@/lib/api/auth.api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Profile
          </DialogTitle>
          <DialogDescription>
            Manage your profile information and security settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 flex overflow-hidden">
          <TabsList className="flex flex-col h-auto w-48 border-r rounded-none p-2 bg-muted/50 justify-start">
            <TabsTrigger 
              value="profile" 
              className="w-full justify-start data-[state=active]:bg-background"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="w-full justify-start data-[state=active]:bg-background"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="profile" className="m-0 p-6 space-y-6">
              <ProfileTab />
            </TabsContent>

            <TabsContent value="security" className="m-0 p-6 space-y-6">
              <SecurityTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ProfileTab() {
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
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || err.message || 'Failed to update profile.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Profile Information</h3>
        <p className="text-sm text-muted-foreground">
          Update your personal information and contact details.
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
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="modal-email"
              type="email"
              placeholder="name@example.com"
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
            Username
            <span className="text-xs text-muted-foreground ml-2">(optional)</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="modal-username"
              type="text"
              placeholder="username"
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
            Letters, numbers, and underscores only. 3-30 characters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="modal-firstName" className="text-sm font-medium">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="modal-firstName"
                type="text"
                placeholder="Your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-10"
                disabled={updateProfileLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="modal-lastName" className="text-sm font-medium">
              Last Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="modal-lastName"
                type="text"
                placeholder="Your last name"
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
          {updateProfileLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-8">
      {/* Change Password Section */}
      <ChangePasswordSection />

      {/* Two-Factor Authentication Section */}
      <TwoFactorSection />

      {/* Active Sessions Section */}
      <ActiveSessionsSection />
    </div>
  );
}

function ChangePasswordSection() {
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
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    try {
      await updatePassword({ currentPassword, newPassword });
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || err.message || 'Failed to update password.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5" />
          Change Password
        </h3>
        <p className="text-sm text-muted-foreground">
          Update your password to keep your account secure.
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
            Current Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="modal-currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder="Enter current password"
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
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="modal-newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password"
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
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="modal-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
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
          {updatePasswordLoading ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </div>
  );
}

function TwoFactorSection() {
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
        <div className="text-sm text-muted-foreground">Loading 2FA status...</div>
      </div>
    );
  }

  const isEnabled = status?.enabled || false;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5" />
          Two-Factor Authentication
        </h3>
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security to your account.
        </p>
      </div>

      {isEnabled ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              2FA is enabled for your account
            </span>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDisableDialog(true)}
            disabled={disableMutation.isPending}
          >
            <ShieldOff className="w-4 h-4 mr-2" />
            Disable 2FA
          </Button>
        </div>
      ) : setupData ? (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center mb-4">
              <img src={setupData.qrCodeUrl} alt="QR Code" className="border rounded-lg" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter verification code</label>
              <Input
                type="text"
                placeholder="000000"
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
                {verifyMutation.isPending ? 'Verifying...' : 'Verify and Enable'}
              </Button>
              {verifyMutation.error && (
                <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                  {(verifyMutation.error as any)?.response?.data?.error || 'Verification failed'}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Backup Codes</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyBackupCodes}
              >
                {copiedCodes ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Save these codes in a safe place. You can use them to access your account if you lose your device.
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
            {setupMutation.isPending ? 'Setting up...' : 'Enable 2FA'}
          </Button>
        </div>
      )}

      {/* Disable 2FA Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your password to disable 2FA. This will make your account less secure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
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
                {(disableMutation.error as any)?.response?.data?.error || 'Failed to disable 2FA'}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisablePassword('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableMutation.mutate(disablePassword)}
              disabled={!disablePassword || disableMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disableMutation.isPending ? 'Disabling...' : 'Disable 2FA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActiveSessionsSection() {
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
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceName = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device';
    
    // Try to detect device type
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'Mobile Device';
    }
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'Tablet';
    }
    
    // Try to detect browser
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    
    return 'Desktop';
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
          Active Sessions
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage your active login sessions across different devices.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-sm text-muted-foreground">No active sessions</div>
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
                      Current
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>{session.userAgent || 'Unknown device'}</div>
                  <div>IP: {session.ipAddress || 'Unknown'}</div>
                  <div>Last active: {formatDate(session.createdAt)}</div>
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
                  Revoke
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
            If you see any unknown devices, revoke them immediately to secure your account.
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
            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
            <AlertDialogDescription>
              {sessionToRevoke?.isCurrent
                ? 'Are you sure you want to revoke your current session? You will be logged out and need to sign in again.'
                : 'Are you sure you want to revoke this session? This will sign out the device associated with this session.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={revokeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
