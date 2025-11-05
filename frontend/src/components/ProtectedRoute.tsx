import { Navigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/features/auth/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Still verifying
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">{t('protectedRoute.loading')}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
