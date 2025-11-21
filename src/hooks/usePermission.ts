'use client';

import { usePermissionStore } from '@/lib/stores/permission.store';

export function usePermission(permission: string | string[]): boolean {
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  return hasPermission(permission);
}

