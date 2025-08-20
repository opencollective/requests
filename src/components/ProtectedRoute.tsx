import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
}) => {
  const navigate = useNavigate();
  const { isConfigured } = useNostr();

  useEffect(() => {
    if (requireAuth && !isConfigured) {
      // Redirect to login if authentication is required but user is not configured
      navigate('/login');
    } else if (!requireAuth && isConfigured) {
      // Redirect to dashboard if user is configured but trying to access login page
      navigate('/dashboard');
    }
  }, [isConfigured, requireAuth, navigate]);

  // Show loading while checking authentication
  if (requireAuth && !isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while checking if user should be redirected away
  if (!requireAuth && isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
