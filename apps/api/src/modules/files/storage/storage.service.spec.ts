import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

import { StorageService } from './storage.service';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

/** S3_BUCKET yo'q — lokal fayl saqlash rejimi. */
function makeLocalService(): StorageService {
  const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
  return new StorageService(config);
}

describe('StorageService (local fallback)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is not "configured" without an S3 bucket', () => {
    const service = makeLocalService();
    expect(service.isConfigured).toBe(false);
  });

  it('writes the buffer to local disk on upload and returns the key', async () => {
    const service = makeLocalService();
    const key = 'docs/2024/file.pdf';
    const result = await service.upload(key, Buffer.from('hello'), 'application/pdf');

    expect(result).toBe(key);
    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenPath = mockedFs.writeFileSync.mock.calls[0][0] as string;
    // Kalitdagi '/' lar '_' ga almashtiriladi
    expect(writtenPath).toContain('docs_2024_file.pdf');
  });

  it('returns a local pseudo-URL from getSignedUrl', async () => {
    const service = makeLocalService();
    await expect(service.getSignedUrl('a/b.pdf')).resolves.toBe('/uploads/a_b.pdf');
  });

  it('deletes a local file only when it exists', async () => {
    const service = makeLocalService();

    mockedFs.existsSync.mockReturnValue(false);
    await service.delete('a/b.pdf');
    expect(mockedFs.unlinkSync).not.toHaveBeenCalled();

    mockedFs.existsSync.mockReturnValue(true);
    await service.delete('a/b.pdf');
    expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(1);
  });

  it('getLocalPath sanitizes the key', () => {
    const service = makeLocalService();
    expect(service.getLocalPath('x/y/z.txt')).toContain('x_y_z.txt');
  });
});
