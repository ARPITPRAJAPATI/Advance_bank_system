import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route Protection Guard Component
 * 
 * Concept Explanation for Learning:
 * - If user tries to access `/dashboard` or `/send` without being logged in, this route guard intercepts and redirects them to `/login`.
 * - Preserves the location state so user can be redirected back after successful login.
 */
export default function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
