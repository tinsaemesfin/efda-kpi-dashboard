'use client';

import { useEffect } from 'react';
import { permissionService } from '@/lib/services/permission.service';
import { usePermissionStore } from '@/lib/stores/permission.store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setPermissions = usePermissionStore((state) => state.setPermissions);

  useEffect(() => {
    if (permissionService) {
      const permissions = permissionService.loadPermissions();
      if (permissions.length > 0) {
        setPermissions(permissions);
      }
    }
  }, [setPermissions]);

  return <>{children}</>;
}

