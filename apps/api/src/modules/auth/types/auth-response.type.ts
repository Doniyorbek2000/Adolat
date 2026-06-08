export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUserView {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  language: string;
  roles: string[];
}

export interface AuthResponse extends AuthTokens {
  user: AuthenticatedUserView;
}

export interface RegisterResult {
  userId: string;
  requiresVerification: true;
  target: string;
}
