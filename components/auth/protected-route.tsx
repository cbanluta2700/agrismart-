import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute = ({
  children,
  roles = [],
  redirectTo = '/auth/login',
}: ProtectedRouteProps) => {
  const router = useRouter();
  const { isAuthenticated, hasRole, user } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(`${redirectTo}?redirect=${router.asPath}`);
      return;
    }

    // Check role requirements if specified
    if (roles.length > 0) {
      const hasRequiredRole = roles.some((role) => hasRole(role));
      if (!hasRequiredRole) {
        router.push('/403'); // Forbidden page
      }
    }
  }, [isAuthenticated, hasRole, roles, router, redirectTo]);

  // Show loading state while checking auth
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Show forbidden message if role check fails
  if (roles.length > 0 && !roles.some((role) => hasRole(role))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600 mt-2">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

// HOC wrapper for convenience
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) => {
  return function WithAuthComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// Usage example:
// const ProtectedPage = withAuth(MyPage, { roles: ['admin'] });
// export default ProtectedPage;