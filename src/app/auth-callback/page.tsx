'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, safeReturnPath } from '@/lib/services/auth.service';
import { permissionService } from '@/lib/services/permission.service';
import { useSessionStore } from '@/lib/stores/session.store';
import { usePermissionStore } from '@/lib/stores/permission.store';
import { createSessionFromUser } from '@/lib/models/session.model';
import { AuthStatusScreen } from '@/components/auth/auth-status-screen';

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

        const state = user.state as { returnUrl?: unknown } | undefined;
        router.replace(safeReturnPath(state?.returnUrl));
      } catch (err: any) {
        console.error('Authentication error:', err);
        setError(err.message || 'Authentication failed');
      }
    };

    completeAuth();
  }, [router, setSession, setPermissions]);

  if (error) {
    return (
      <AuthStatusScreen
        variant="error"
        title="We couldn't complete your sign-in"
        description={error}
        action={
          <button
            type="button"
            onClick={() => router.push('/auth')}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600"
          >
            Back to sign in
          </button>
        }
      />
    );
  }

  return <AuthStatusScreen title="Completing sign-in…" description="Verifying your account and loading your dashboard permissions." />;
}
