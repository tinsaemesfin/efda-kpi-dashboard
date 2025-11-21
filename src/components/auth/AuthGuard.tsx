'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/services/auth.service';
import { useSessionStore } from '@/lib/stores/session.store';
import { createSessionFromUser } from '@/lib/models/session.model';

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
        router.push(`/auth?return=${encodeURIComponent(pathname)}`);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [router, pathname, setSession]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-gray-600">Please wait while we verify your authentication.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

