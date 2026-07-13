import { ConfigService } from '@nestjs/config';

import { WebSearchService } from './web-search.service';

function makeService(keys: Record<string, string> = {}) {
  const config = { get: (k: string, d = '') => keys[k] ?? d };
  return new WebSearchService(config as unknown as ConfigService);
}

describe('WebSearchService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('is disabled and returns [] without any key', async () => {
    const service = makeService();
    expect(service.isConfigured).toBe(false);
    await expect(service.search('soliq')).resolves.toEqual([]);
  });

  it('returns Tavily results filtered to official domains', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { title: 'Soliq kodeksi', url: 'https://lex.uz/docs/1', content: 'matn' },
          { title: 'Spam', url: 'https://random-blog.com/x', content: 'norasmiy' },
        ],
      }),
    }) as never;

    const service = makeService({ TAVILY_API_KEY: 'tvly' });
    const results = await service.search('soliq stavkasi');
    expect(results).toHaveLength(1);
    expect(results[0].url).toContain('lex.uz');
  });

  it('sends include_domains to Tavily', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    global.fetch = fetchMock as never;
    await makeService({ TAVILY_API_KEY: 'tvly' }).search('test');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.include_domains).toContain('lex.uz');
  });

  it('swallows provider errors and returns []', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as never;
    await expect(makeService({ TAVILY_API_KEY: 'tvly' }).search('x')).resolves.toEqual([]);
  });
});
