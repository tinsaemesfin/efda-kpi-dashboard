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

