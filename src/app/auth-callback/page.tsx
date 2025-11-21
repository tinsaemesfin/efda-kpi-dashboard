'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/auth.service';
import { permissionService } from '@/lib/services/permission.service';
import { useSessionStore } from '@/lib/stores/session.store';
import { usePermissionStore } from '@/lib/stores/permission.store';
import { createSessionFromUser } from '@/lib/models/session.model';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const setSession = useSessionStore((state) => state.setSession);
  const setPermissions = usePermissionStore((state) => state.setPermissions);

  useEffect(() => {
    const completeAuth = async () => {
      if (!authService || !permissionService) {
        setError('Services not initialized');
        return;
      }

      try {
        const user = await authService.completeAuthentication();
        
        const session = createSessionFromUser(user);
        setSession(session);

        const permissions = await permissionService.fetchPermissions();
        setPermissions(permissions);

        router.push('/');
      } catch (err: any) {
        console.error('Authentication error:', err);
        setError(err.message || 'Authentication failed');
      }
    };

    completeAuth();
  }, [router, setSession, setPermissions]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing authentication...</h1>
        <p className="text-gray-600">Please wait while we complete your login.</p>
      </div>
    </div>
  );
}

