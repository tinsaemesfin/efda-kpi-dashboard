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

