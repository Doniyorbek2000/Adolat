import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SocialAuthService } from './social-auth.service';
import { AuthService } from '../auth.service';

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

function makeService(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    GOOGLE_CLIENT_ID: 'gid-123',
    ONEID_CLIENT_ID: '',
    ONEID_CLIENT_SECRET: '',
    ONEID_REDIRECT_URI: '',
    ONEID_AUTH_URL: 'https://sso.egov.uz/auth',
    ONEID_SCOPE: 'myportal',
    ...overrides,
  };
  const config = { get: jest.fn((k: string, d?: string) => values[k] ?? d ?? '') };
  const authService = {
    socialLogin: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } }),
  };
  const service = new SocialAuthService(
    config as unknown as ConfigService,
    authService as unknown as AuthService,
  );
  return { service, authService };
}

const ctx = { ipAddress: '1.1.1.1', userAgent: 'jest' };

describe('SocialAuthService — Google', () => {
  beforeEach(() => mockVerifyIdToken.mockReset());

  it('logs in with a valid, verified Google token', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'a@gmail.com', email_verified: true, given_name: 'Ali', family_name: 'V' }),
    });
    const { service, authService } = makeService();
    const res = await service.googleLogin('tok', ctx);
    expect(authService.socialLogin).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@gmail.com', firstName: 'Ali', provider: 'google' }),
      ctx,
    );
    expect(res.accessToken).toBe('a');
  });

  it('rejects an unverified email', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ email: 'a@gmail.com', email_verified: false }) });
    const { service } = makeService();
    await expect(service.googleLogin('tok', ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));
    const { service } = makeService();
    await expect(service.googleLogin('tok', ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('is unavailable when GOOGLE_CLIENT_ID is missing', async () => {
    const { service } = makeService({ GOOGLE_CLIENT_ID: '' });
    await expect(service.googleLogin('tok', ctx)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('SocialAuthService — OneID', () => {
  it('builds an authorize URL with the required params', () => {
    const { service } = makeService({ ONEID_CLIENT_ID: 'cid', ONEID_REDIRECT_URI: 'https://api/cb' });
    const url = service.oneIdAuthUrl('state1');
    expect(url).toContain('response_type=one_code');
    expect(url).toContain('client_id=cid');
    expect(url).toContain('state=state1');
  });

  it('is unavailable for login when not configured', async () => {
    const { service } = makeService();
    await expect(service.oneIdLogin('code', ctx)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
