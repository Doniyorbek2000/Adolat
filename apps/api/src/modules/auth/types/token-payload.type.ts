export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
  roles: string[];
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
  tokenId: string;
}
