import api from './api';
import { AdminUser } from '../types';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export async function adminLogin(
  email: string,
  password: string
): Promise<{ accessToken: string; user: AdminUser }> {
  const response = await api.post('/auth/login', { email, password });
  const { accessToken, user } = response.data;
  return { accessToken, user };
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setAdminUser(user: AdminUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AdminUser;
  } catch {
    return null;
  }
}
