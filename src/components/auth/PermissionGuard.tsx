'use client';

import { useRouter } from 'next/navigation';
import { usePermissionStore } from '@/lib/stores/permission.store';
import { useEffect, useState } from 'react';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: string | string[];
  redirectTo?: string;
}

export default function PermissionGuard({
  children,
  permission,
  redirectTo = '/',
}: PermissionGuardProps) {
  const router = useRouter();
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      const authorized = hasPermission(permission);
      setIsAuthorized(authorized);
      setIsLoading(false);

      if (!authorized) {
        router.push(redirectTo);
      }
    };

    checkPermission();
  }, [permission, hasPermission, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Checking permissions...</h1>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

