'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/lib/services/auth.service';
import { User } from 'oidc-client-ts';
import { useSessionStore } from '@/lib/stores/session.store';
import { createSessionFromUser } from '@/lib/models/session.model';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    const loadUser = async () => {
      if (!authService) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          const session = createSessionFromUser(currentUser);
          setSession(session);
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [setSession]);

  const login = async () => {
    if (!authService) return;
    await authService.login();
  };

  const logout = async () => {
    if (!authService) return;
    await authService.logout();
  };

  return {
    user,
    loading,
    isAuthenticated: user !== null && !user.expired,
    login,
    logout,
    accessToken: user?.access_token || null,
    profile: user?.profile || null,
  };
}

