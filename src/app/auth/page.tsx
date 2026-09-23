'use client';

import { Suspense } from 'react';
import { LoginLanding } from '@/components/auth/login-landing';
import { AuthStatusScreen } from '@/components/auth/auth-status-screen';

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthStatusScreen title="Loading…" description="Preparing the sign-in page." />}>
      <LoginLanding />
    </Suspense>
  );
}
