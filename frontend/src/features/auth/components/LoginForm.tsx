import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const { login, loginLoading } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login({ 
        emailOrUsername, 
        password,
        twoFactorToken: requiresTwoFactor ? twoFactorToken : undefined,
      });

      // Check if 2FA is required
      if (result && 'requiresTwoFactor' in result && result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        return;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
      // Reset 2FA state on error
      if (requiresTwoFactor) {
        setRequiresTwoFactor(false);
        setTwoFactorToken('');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="emailOrUsername" className="text-sm font-medium">
          Email or Username
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="emailOrUsername"
            type="text"
            placeholder="email@example.com or username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            className="pl-10"
            required
            disabled={loginLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            required
            disabled={loginLoading || requiresTwoFactor}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={loginLoading || requiresTwoFactor}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {requiresTwoFactor && (
        <div className="space-y-2">
          <label htmlFor="twoFactorToken" className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Two-Factor Authentication Code
          </label>
          <Input
            id="twoFactorToken"
            type="text"
            placeholder="000000"
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center text-lg tracking-widest"
            required
            disabled={loginLoading}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code from your authenticator app or a backup code
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={
          loginLoading || 
          !emailOrUsername || 
          !password || 
          (requiresTwoFactor && twoFactorToken.length !== 6)
        }
      >
        {loginLoading ? 'Signing in...' : requiresTwoFactor ? 'Verify and Sign in' : 'Sign in'}
      </Button>
    </form>
  );
}

