import { Response } from 'express';

const secure = process.env.NODE_ENV === 'production';

export function setAuthCookies(
  response: Response,
  refreshToken: string,
  csrfToken: string,
): void {
  response.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  response.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie('refresh_token', { path: '/api/auth' });
  response.clearCookie('csrf_token', { path: '/' });
}
