import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, registerApi, logoutApi } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('kube_pay_user') || localStorage.getItem('navya_pay_user') || localStorage.getItem('nova_pay_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('kube_pay_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kube_pay_user');
      localStorage.removeItem('navya_pay_user');
      localStorage.removeItem('nova_pay_user');
    }
  }, [user]);

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

  const logout = async () => {
    setLoading(true);
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('kube_pay_user');
      localStorage.removeItem('navya_pay_user');
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
