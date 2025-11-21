import { StorageService } from './storage.service';
import { apiConfig } from '@/lib/config/auth.config';
import { authService } from './auth.service';

class PermissionService {
  private permissions: string[] = [];

  async fetchPermissions(): Promise<string[]> {
    if (typeof window === 'undefined') return [];
    
    const token = authService?.getToken();
    if (!token) {
      console.warn('No access token available');
      return [];
    }

    try {
      const response = await fetch(`${apiConfig.baseUrl}/Account/User/Permissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch permissions: ${response.statusText}`);
      }

      const permissions = await response.json();
      this.permissions = permissions;
      
      StorageService.setItem('PERMISSIONS', JSON.stringify(permissions));
      
      return permissions;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  }

  loadPermissions(): string[] {
    const stored = StorageService.getItem('PERMISSIONS');
    if (stored) {
      try {
        this.permissions = JSON.parse(stored);
        return this.permissions;
      } catch (error) {
        console.error('Error parsing stored permissions:', error);
        return [];
      }
    }
    return [];
  }

  hasPermission(permission: string | string[]): boolean {
    if (Array.isArray(permission)) {
      return permission.some(perm => this.permissions.includes(perm));
    }
    return this.permissions.includes(permission);
  }

  getPermissions(): string[] {
    return [...this.permissions];
  }

  clearPermissions(): void {
    this.permissions = [];
    StorageService.removeItem('PERMISSIONS');
  }
}

export const permissionService = typeof window !== 'undefined' ? new PermissionService() : null;

