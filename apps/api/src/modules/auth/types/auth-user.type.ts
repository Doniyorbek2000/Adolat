/** Passport strategiyasi `req.user`ga biriktiradigan autentifikatsiya qilingan foydalanuvchi shakli. */
export interface AuthUser {
  id: string;
  sessionId: string;
  roles: string[];
}

/** Refresh-token strategiyasi orqali `req.user`ga biriktiriladigan shakl. */
export interface RefreshTokenUser {
  id: string;
  sessionId: string;
  tokenId: string;
  refreshToken: string;
}
