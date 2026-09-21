'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services/auth.service';
import { useSessionStore } from '@/lib/stores/session.store';
import { createSessionFromUser } from '@/lib/models/session.model';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authService) return;

      try {
        const user = await authService.getUser();
        
        if (user && !user.expired) {
          const session = createSessionFromUser(user);
          setSession(session);

          const returnUrl = searchParams.get('return') || '/';
          router.push(returnUrl);
        } else {
          await authService.login();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        console.error('Authentication error:', err);
        setError(message);
      }
    };

    checkAuth();
  }, [router, searchParams, setSession]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-xl text-center px-6">
          <h1 className="text-2xl font-bold mb-4">Unable to start login</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to login...</h1>
        <p className="text-muted-foreground">Please wait while we redirect you to the authentication page.</p>
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

