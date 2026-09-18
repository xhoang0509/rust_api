import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Author, LoginRequest, RegisterRequest } from '../types';
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth';

interface AuthContextType {
  token: string | null;
  currentUser: Author | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        try {
          const user = await getMe();
          setCurrentUser(user);
          setToken(storedToken);
        } catch {
          // Stored token is invalid or expired
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [logout]);

  const login = async (data: LoginRequest) => {
    const res = await apiLogin(data);
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setCurrentUser(res.author);
  };

  const register = async (data: RegisterRequest) => {
    const res = await apiRegister(data);
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setCurrentUser(res.author);
  };

  const value: AuthContextType = {
    token,
    currentUser,
    isAuthenticated: !!token && !!currentUser,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
