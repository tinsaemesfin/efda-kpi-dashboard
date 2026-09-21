import { UserManagerSettings } from 'oidc-client-ts';

export function rewriteConfiguredUrl(
  configuredUrl: string | undefined,
  origin: string,
  fallbackPath: string,
): string {
  if (!configuredUrl) {
    return fallbackPath ? `${origin}${fallbackPath}` : origin;
  }

  try {
    const parsed = new URL(configuredUrl);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${origin}${path}${parsed.search}${parsed.hash}`;
  } catch {
    if (configuredUrl.startsWith('/')) {
      return `${origin}${configuredUrl}`;
    }
    return configuredUrl;
  }
}

export function resolveClientOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_CLIENT_ROOT || '';
}

export function getAuthConfig(origin = resolveClientOrigin()): UserManagerSettings {
  return {
    authority: process.env.NEXT_PUBLIC_STS_AUTHORITY!,
    client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
    redirect_uri: rewriteConfiguredUrl(
      process.env.NEXT_PUBLIC_REDIRECT_URI,
      origin,
      '/auth-callback?to=signin',
    ),
    silent_redirect_uri: rewriteConfiguredUrl(
      process.env.NEXT_PUBLIC_SILENT_REDIRECT_URI,
      origin,
      '/assets/silent-callback.html',
    ),
    post_logout_redirect_uri: rewriteConfiguredUrl(
      process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI,
      origin,
      '',
    ),
    response_type: (process.env.NEXT_PUBLIC_RESPONSE_TYPE as 'code') || 'code',
    scope: process.env.NEXT_PUBLIC_CLIENT_SCOPE!,
    automaticSilentRenew: true,
    loadUserInfo: true,
    filterProtocolClaims: true,
  };
}

export const authConfig: UserManagerSettings = getAuthConfig();

export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_ROOT!,
};

export const profileUrl = `${process.env.NEXT_PUBLIC_STS_AUTHORITY}/manage/profile`;
