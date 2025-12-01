'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services/auth.service';
import { useSessionStore } from '@/lib/stores/session.store';
import { createSessionFromUser } from '@/lib/models/session.model';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authService) return;

      const user = await authService.getUser();
      
      if (user && !user.expired) {
        const session = createSessionFromUser(user);
        setSession(session);
        
        const returnUrl = searchParams.get('return') || '/';
        router.push(returnUrl);
      } else {
        await authService.login();
      }
    };

    checkAuth();
  }, [router, searchParams, setSession]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to login...</h1>
        <p className="text-gray-600">Please wait while we redirect you to the authentication page.</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}

