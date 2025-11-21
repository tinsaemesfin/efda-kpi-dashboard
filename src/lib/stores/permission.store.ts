'use client';

import { create } from 'zustand';

interface PermissionState {
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
  hasPermission: (permission: string | string[]) => boolean;
  clearPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  
  setPermissions: (permissions: string[]) => {
    set({ permissions });
  },
  
  hasPermission: (permission: string | string[]) => {
    const { permissions } = get();
    if (Array.isArray(permission)) {
      return permission.some(perm => permissions.includes(perm));
    }
    return permissions.includes(permission);
  },
  
  clearPermissions: () => {
    set({ permissions: [] });
  },
}));

