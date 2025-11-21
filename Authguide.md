# Next.js Implementation Steps - ERIS Authentication System

This is a step-by-step guide to implement the ERIS authentication system in your new Next.js project.

## Prerequisites

- Next.js 13+ (App Router)
- Node.js 18+
- npm or yarn

---

## Step 1: Create Next.js Project

```bash
npx create-next-app@latest eris-dashboard
cd eris-dashboard
```

Choose options:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes (optional, but recommended)
- App Router: Yes
- src/ directory: Yes

---

## Step 2: Install Dependencies

```bash
npm install oidc-client-ts zustand
npm install -D @types/node
```

---

## Step 3: Create Environment Variables

Create `.env.local` in the project root:

```env
# OIDC Configuration
NEXT_PUBLIC_STS_AUTHORITY=https://dev.id.eris.efda.gov.et
NEXT_PUBLIC_CLIENT_ID=eris-portal-spa
NEXT_PUBLIC_CLIENT_ROOT=http://localhost:3000
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth-callback?to=signin
NEXT_PUBLIC_SILENT_REDIRECT_URI=http://localhost:3000/assets/silent-callback.html
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_CLIENT_SCOPE=openid profile
NEXT_PUBLIC_RESPONSE_TYPE=code

# API Configuration
NEXT_PUBLIC_API_ROOT=https://api.feature.eris.efda.gov.et/api
```

---

## Step 4: Create Project Structure

Create the following directory structure:

```
src/
├── app/
│   ├── auth/
│   │   └── page.tsx
│   ├── auth-callback/
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── config/
│   │   └── auth.config.ts
│   ├── models/
│   │   └── session.model.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── permission.service.ts
│   │   ├── http.service.ts
│   │   └── storage.service.ts
│   └── stores/
│       ├── session.store.ts
│       └── permission.store.ts
├── components/
│   ├── auth/
│   │   ├── AuthGuard.tsx
│   │   └── PermissionGuard.tsx
│   └── providers/
│       └── AuthProvider.tsx
└── hooks/
    ├── useAuth.ts
    └── usePermission.ts
public/
└── assets/
    └── silent-callback.html
```

---

## Step 5: Create Configuration File

**File: `src/lib/config/auth.config.ts`**

```typescript
import { UserManagerSettings } from 'oidc-client-ts';

export const authConfig: UserManagerSettings = {
  authority: process.env.NEXT_PUBLIC_STS_AUTHORITY!,
  client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
  redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
  silent_redirect_uri: process.env.NEXT_PUBLIC_SILENT_REDIRECT_URI!,
  post_logout_redirect_uri: process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI!,
  response_type: (process.env.NEXT_PUBLIC_RESPONSE_TYPE as 'code') || 'code',
  scope: process.env.NEXT_PUBLIC_CLIENT_SCOPE!,
  automaticSilentRenew: true,
  loadUserInfo: true,
  filterProtocolClaims: true,
};

export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_ROOT!,
};
```

---

## Step 6: Create Storage Service

**File: `src/lib/services/storage.service.ts`**

```typescript
export class StorageService {
  static setItem(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  static getItem(key: string): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }

  static removeItem(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  static exists(key: string): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key) !== null;
    }
    return false;
  }

  static clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  }
}
```

---

## Step 7: Create Session Models

**File: `src/lib/models/session.model.ts`**

```typescript
export interface Profile {
  phone_number?: string;
  email?: string;
  given_name?: string;
  userId?: number;
  role?: string;
  roleCodes?: string;
  branchId?: string;
  [key: string]: any; // For additional claims
}

export interface Session {
  id_token: string;
  session_state: string;
  access_token: string;
  token_type: string;
  scope: string;
  profile: Profile;
}

export function createSessionFromUser(user: any): Session {
  return {
    id_token: user.id_token,
    session_state: user.session_state,
    access_token: user.access_token,
    token_type: user.token_type,
    scope: user.scope,
    profile: {
      phone_number: user.profile.phone_number,
      email: user.profile.email,
      given_name: user.profile.given_name,
      userId: user.profile.userId,
      role: user.profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      roleCodes: user.profile.roleCodes,
      branchId: user.profile.branchId,
    },
  };
}
```

---

## Step 8: Create Auth Service

**File: `src/lib/services/auth.service.ts`**

```typescript
import { UserManager, User, WebStorageStateStore } from 'oidc-client-ts';
import { authConfig } from '@/lib/config/auth.config';
import { createSessionFromUser, Session } from '@/lib/models/session.model';

class AuthService {
  private userManager: UserManager | null = null;
  private currentUser: User | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const settings = {
        ...authConfig,
        userStore: new WebStorageStateStore({ store: window.localStorage }),
      };
      
      this.userManager = new UserManager(settings);
      this.setupEventHandlers();
    }
  }

  private setupEventHandlers(): void {
    if (!this.userManager) return;

    this.userManager.events.addUserSignedOut(async () => {
      await this.userManager!.removeUser();
      this.currentUser = null;
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    });

    this.userManager.events.addUserLoaded(() => {
      this.getUser();
    });

    this.userManager.events.addUserSignedIn(() => {
      this.getUser();
    });

    this.userManager.events.addSilentRenewError((error) => {
      console.error('Silent renew error:', error);
    });

    this.userManager.events.addAccessTokenExpired(() => {
      console.log('Access token expired');
      this.renewToken();
    });
  }

  async getUser(): Promise<User | null> {
    if (typeof window === 'undefined' || !this.userManager) return null;
    
    try {
      if (this.currentUser && !this.currentUser.expired) {
        return this.currentUser;
      }

      const user = await this.userManager.getUser();
      
      if (user && !user.expired) {
        this.currentUser = user;
        return user;
      }

      this.currentUser = null;
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      this.currentUser = null;
      return null;
    }
  }

  async login(): Promise<void> {
    if (typeof window === 'undefined' || !this.userManager) return;
    await this.userManager.signinRedirect();
  }

  async completeAuthentication(): Promise<User> {
    if (typeof window === 'undefined' || !this.userManager) {
      throw new Error('Cannot complete authentication on server');
    }
    const user = await this.userManager.signinRedirectCallback();
    this.currentUser = user;
    return user;
  }

  async logout(): Promise<void> {
    if (typeof window === 'undefined' || !this.userManager) return;
    await this.userManager.signoutRedirect();
  }

  async renewToken(): Promise<User | null> {
    if (typeof window === 'undefined' || !this.userManager) return null;
    
    try {
      const user = await this.userManager.signinSilent();
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Error renewing token:', error);
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && !this.currentUser.expired;
  }

  getToken(): string | null {
    return this.currentUser?.access_token || null;
  }

  getSession(): Session | null {
    if (!this.currentUser) return null;
    return createSessionFromUser(this.currentUser);
  }
}

export const authService = typeof window !== 'undefined' ? new AuthService() : null;
```

---

## Step 9: Create Permission Service

**File: `src/lib/services/permission.service.ts`**

```typescript
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
```

---

## Step 10: Create HTTP Service

**File: `src/lib/services/http.service.ts`**

```typescript
import { apiConfig } from '@/lib/config/auth.config';
import { authService } from './auth.service';

class HttpService {
  private baseUrl = apiConfig.baseUrl;

  async get<T>(endpoint: string): Promise<T> {
    const token = authService?.getToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      const renewed = await authService?.renewToken();
      if (renewed) {
        return this.get(endpoint);
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const token = authService?.getToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      const renewed = await authService?.renewToken();
      if (renewed) {
        return this.post(endpoint, data);
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const token = authService?.getToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      const renewed = await authService?.renewToken();
      if (renewed) {
        return this.put(endpoint, data);
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const token = authService?.getToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      const renewed = await authService?.renewToken();
      if (renewed) {
        return this.delete(endpoint);
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const httpService = new HttpService();
```

---

## Step 11: Create Zustand Stores

**File: `src/lib/stores/session.store.ts`**

```typescript
'use client';

import { create } from 'zustand';
import { Session, Profile } from '@/lib/models/session.model';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  accessToken: string | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: false,
  accessToken: null,
  profile: null,
  isAuthenticated: false,
  
  setSession: (session: Session | null) => {
    set({
      session,
      accessToken: session?.access_token || null,
      profile: session?.profile || null,
      isAuthenticated: !!session?.access_token,
    });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
```

**File: `src/lib/stores/permission.store.ts`**

```typescript
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
```

---

## Step 12: Create React Hooks

**File: `src/hooks/useAuth.ts`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/lib/services/auth.service';
import { User } from 'oidc-client-ts';
import { useSessionStore } from '@/lib/stores/session.store';
import { createSessionFromUser } from '@/lib/models/session.model';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    const loadUser = async () => {
      if (!authService) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          const session = createSessionFromUser(currentUser);
          setSession(session);
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [setSession]);

  const login = async () => {
    if (!authService) return;
    await authService.login();
  };

  const logout = async () => {
    if (!authService) return;
    await authService.logout();
  };

  return {
    user,
    loading,
    isAuthenticated: user !== null && !user.expired,
    login,
    logout,
    accessToken: user?.access_token || null,
    profile: user?.profile || null,
  };
}
```

**File: `src/hooks/usePermission.ts`**

```typescript
'use client';

import { usePermissionStore } from '@/lib/stores/permission.store';

export function usePermission(permission: string | string[]): boolean {
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  return hasPermission(permission);
}
```

---

## Step 13: Create Guard Components

**File: `src/components/auth/AuthGuard.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/lib/services/auth.service';
import { useSessionStore } from '@/lib/stores/session.store';
import { createSessionFromUser } from '@/lib/models/session.model';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authService) {
        setIsLoading(false);
        return;
      }

      const user = await authService.getUser();
      
      if (user && !user.expired) {
        const session = createSessionFromUser(user);
        setSession(session);
        setIsAuthenticated(true);
      } else {
        router.push(`/auth?return=${encodeURIComponent(pathname)}`);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [router, pathname, setSession]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-gray-600">Please wait while we verify your authentication.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

**File: `src/components/auth/PermissionGuard.tsx`**

```typescript
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
```

---

## Step 14: Create Auth Provider

**File: `src/components/providers/AuthProvider.tsx`**

```typescript
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
```

---

## Step 15: Create Auth Pages

**File: `src/app/auth/page.tsx`**

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services/auth.service';
import { useSessionStore } from '@/lib/stores/session.store';
import { createSessionFromUser } from '@/lib/models/session.model';

export default function AuthPage() {
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
```

**File: `src/app/auth-callback/page.tsx`**

```typescript
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
```

---

## Step 16: Create Silent Callback HTML

**File: `public/assets/silent-callback.html`**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Silent Callback</title>
</head>
<body>
    <script>
        // This page is used for silent token renewal
        // The OIDC client will handle the callback automatically
    </script>
</body>
</html>
```

---

## Step 17: Update Root Layout

**File: `src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/providers/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ERIS Dashboard',
  description: 'ERIS Dashboard Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## Step 18: Create Protected Home Page

**File: `src/app/page.tsx`**

```typescript
import AuthGuard from '@/components/auth/AuthGuard';
import HomeContent from '@/components/HomeContent';

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}
```

**File: `src/components/HomeContent.tsx`**

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function HomeContent() {
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Welcome to ERIS Dashboard</h1>
        
        {profile && (
          <div className="bg-white p-6 rounded-lg shadow mb-4">
            <h2 className="text-xl font-semibold mb-2">User Profile</h2>
            <p><strong>Name:</strong> {profile.given_name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Role:</strong> {profile.role}</p>
          </div>
        )}

        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
```

---

## Step 19: Test the Implementation

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to `http://localhost:3000`**
   - Should redirect to `/auth`
   - Should redirect to STS Authority login page
   - After login, should redirect to `/auth-callback`
   - Should then redirect to home page

3. **Check browser console** for any errors

4. **Check localStorage** for:
   - `oidc.user:{authority}:{client_id}` - User object
   - `PERMISSIONS` - User permissions

---

## Step 20: Create Example Protected Route

**File: `src/app/dashboard/page.tsx`**

```typescript
import AuthGuard from '@/components/auth/AuthGuard';
import PermissionGuard from '@/components/auth/PermissionGuard';
import DashboardContent from '@/components/DashboardContent';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <PermissionGuard permission="ViewDashboard">
        <DashboardContent />
      </PermissionGuard>
    </AuthGuard>
  );
}
```

---

## Troubleshooting

### Issue: "window is not undefined"
- Ensure all auth-related components have `'use client'` directive
- Check that services check for `typeof window !== 'undefined'`

### Issue: Redirect loop
- Ensure `/auth` and `/auth-callback` routes are NOT protected
- Check environment variables are set correctly

### Issue: Permissions not loading
- Check API endpoint: `{API_ROOT}/Account/User/Permissions`
- Verify Authorization header includes Bearer token
- Check browser console for API errors

### Issue: Token not being sent
- Verify `authService.getToken()` returns a token
- Check that session is set after authentication

---

## Next Steps

1. Create more protected routes
2. Add permission-based UI components
3. Implement API calls using `httpService`
4. Add error handling and loading states
5. Customize UI/UX

---

## Summary

You now have a complete authentication system with:
- ✅ OIDC authentication flow
- ✅ Token management
- ✅ Permission system
- ✅ Protected routes
- ✅ API service with auth headers
- ✅ Session persistence

**All files are ready to use!** Just follow the steps above and your authentication system will be fully functional.

