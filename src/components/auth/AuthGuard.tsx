'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/services/auth.service';
import { useSessionStore } from '@/lib/stores/session.store';
import { createSessionFromUser } from '@/lib/models/session.model';
import { AuthStatusScreen } from '@/components/auth/auth-status-screen';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authService) {
        setIsLoading(false);
        return;
      }

      const user = await authService.getUser();
      
      if (user && !user.expired) {
        const session = createSessionFromUser(user);
        setSession(session);
        setIsAuthenticated(true);
      } else {
        router.replace(`/auth?return=${encodeURIComponent(pathname + window.location.search)}`);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [router, pathname, setSession]);

  if (isLoading) {
    return <AuthStatusScreen title="Verifying your session…" description="Please wait while we confirm your sign-in." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

