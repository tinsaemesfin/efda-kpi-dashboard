'use client';

import { create } from 'zustand';
import { Session, Profile } from '@/lib/models/session.model';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  accessToken: string | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: false,
  accessToken: null,
  profile: null,
  isAuthenticated: false,
  
  setSession: (session: Session | null) => {
    set({
      session,
      accessToken: session?.access_token || null,
      profile: session?.profile || null,
      isAuthenticated: !!session?.access_token,
    });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

