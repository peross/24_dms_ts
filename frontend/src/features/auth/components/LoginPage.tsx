import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 space-y-6">
          {/* Logo and Title */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">f</span>
              </div>
              <span className="text-2xl font-bold">finalui</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Welcome back</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Sign in to your account to continue
              </p>
            </div>
          </div>

          {/* Login Form */}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

