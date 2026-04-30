'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, extractApiError } from './api';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeUser(payload: unknown): User | null {
  const payloadRecord = asRecord(payload);
  const dataRecord = asRecord(payloadRecord?.data);
  const userRecord = asRecord(payloadRecord?.user);
  const raw = dataRecord ?? userRecord ?? payloadRecord;
  if (!raw) return null;

  const role = raw.role as User['role'] | undefined;
  if (role !== 'admin' && role !== 'super_admin') {
    return null;
  }

  return {
    id: String(raw.id ?? raw.userId ?? ''),
    name: String(raw.name ?? raw.username ?? ''),
    email: String(raw.email ?? ''),
    role,
    is_active: Boolean(raw.is_active),
    created_at: String(raw.created_at ?? ''),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      const normalized = normalizeUser(response.data);
      setUser(normalized);
      return normalized;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function loadUser() {
      await refreshUser();
    }

    void loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      const normalized = normalizeUser(response.data);
      if (!normalized) {
        throw new Error('Only admin accounts can access this dashboard');
      }
      setUser(normalized);
      return normalized;
    } catch (error) {
      throw new Error(extractApiError(error, 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
