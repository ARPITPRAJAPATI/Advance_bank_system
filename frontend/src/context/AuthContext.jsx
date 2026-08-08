import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, registerApi, logoutApi } from '../services/auth.service';

/**
 * Authentication Global State Context
 * 
 * Concept Explanation for Learning:
 * - `AuthContext`: React Context object that holds global user state across all pages.
 * - Persistent State: Reads stored user from `localStorage` on initial mount so refreshing the page doesn't kick user out.
 * - HTTP-Only Cookies: Backend manages JWT token cookies automatically via `withCredentials: true`.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('nova_pay_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  // Sync user state to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('nova_pay_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nova_pay_user');
    }
  }, [user]);

  // Login handler
  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await loginApi(credentials);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await registerApi(userData);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setLoading(true);
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Logout API non-blocking error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('nova_pay_user');
      setLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom Hook to consume AuthContext cleanly in any component
 * Example usage: `const { user, login, logout } = useAuth();`
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
