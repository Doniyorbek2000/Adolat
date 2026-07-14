import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { PushService } from './push.service';

jest.mock('axios');

const mockGetAccessToken = jest.fn();
jest.mock('google-auth-library', () => ({
  JWT: jest.fn().mockImplementation(() => ({
    getAccessToken: mockGetAccessToken,
  })),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string, def?: string) => values[key] ?? def ?? ''),
  } as unknown as ConfigService;
}

const CONFIGURED = {
  FCM_PROJECT_ID: 'proj-1',
  FCM_CLIENT_EMAIL: 'sa@proj.iam.gserviceaccount.com',
  FCM_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
};

describe('PushService (FCM HTTP v1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessToken.mockResolvedValue({ token: 'access-tok' });
    mockedAxios.post.mockResolvedValue({ data: {} } as never);
  });

  describe('when not configured', () => {
    it('does not call FCM on sendToDevice', async () => {
      const service = new PushService(makeConfig({}));
      await service.sendToDevice('tok', 'T', 'B');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('does not call FCM on sendToMultipleDevices', async () => {
      const service = new PushService(makeConfig({}));
      await service.sendToMultipleDevices(['a', 'b'], 'T', 'B');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('when configured', () => {
    it('posts a v1 message with a Bearer token to the project endpoint', async () => {
      const service = new PushService(makeConfig(CONFIGURED));
      await service.sendToDevice('device-tok', 'Sarlavha', 'Matn', { k: 'v' });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, body, opts] = mockedAxios.post.mock.calls[0];
      expect(url).toBe('https://fcm.googleapis.com/v1/projects/proj-1/messages:send');
      expect(body).toEqual({
        message: {
          token: 'device-tok',
          notification: { title: 'Sarlavha', body: 'Matn' },
          data: { k: 'v' },
        },
      });
      expect((opts as { headers: Record<string, string> }).headers.Authorization).toBe(
        'Bearer access-tok',
      );
    });

    it('sends one request per device for multicast', async () => {
      const service = new PushService(makeConfig(CONFIGURED));
      await service.sendToMultipleDevices(['a', 'b', 'c'], 'T', 'B');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('does nothing for an empty device list', async () => {
      const service = new PushService(makeConfig(CONFIGURED));
      await service.sendToMultipleDevices([], 'T', 'B');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('swallows FCM errors (does not throw)', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('fcm down'));
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(false) as never;
      const service = new PushService(makeConfig(CONFIGURED));
      await expect(service.sendToDevice('tok', 'T', 'B')).resolves.toBeUndefined();
    });
  });
});
