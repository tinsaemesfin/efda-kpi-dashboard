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

