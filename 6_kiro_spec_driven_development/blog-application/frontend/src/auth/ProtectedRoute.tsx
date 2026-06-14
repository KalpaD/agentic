import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }} role="status">
        Loading…
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
