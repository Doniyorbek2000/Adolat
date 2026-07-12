import { ConfigService } from '@nestjs/config';

import { GeminiProvider } from './gemini.provider';
import { AiCompletionRequest } from '../interfaces/ai-provider.interface';

function makeProvider(): GeminiProvider {
  const config = {
    get: () => ({ gemini: { apiKey: 'test-key', model: 'gemini-1.5-flash' } }),
  } as unknown as ConfigService<{ ai: never }, true>;
  return new GeminiProvider(config);
}

/** SSE matnidan web ReadableStream yasaydi (ixtiyoriy bo'laklarga bo'lib). */
function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

const request: AiCompletionRequest = {
  systemPrompt: 'system',
  messages: [{ role: 'user', content: 'savol' }],
  language: 'uz',
};

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const d of gen) out.push(d);
  return out;
}

describe('GeminiProvider.stream (SSE)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('parses SSE data events into text deltas', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: sseStream([
        'data: {"candidates":[{"content":{"parts":[{"text":"Sa"}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"lom"}]}}]}\n\n',
      ]),
    }) as never;

    const deltas = await collect(makeProvider().stream(request, 5000));
    expect(deltas).toEqual(['Sa', 'lom']);
  });

  it('buffers events split across read boundaries', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: sseStream([
        'data: {"candidates":[{"content":{"parts":[{"text":"Ye', // yarim
        'tuk"}]}}]}\n\n',
      ]),
    }) as never;

    const deltas = await collect(makeProvider().stream(request, 5000));
    expect(deltas).toEqual(['Yetuk']);
  });

  it('ignores [DONE] and non-data lines', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: sseStream([
        ': keep-alive\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"A"}]}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    }) as never;

    const deltas = await collect(makeProvider().stream(request, 5000));
    expect(deltas).toEqual(['A']);
  });

  it('throws when the HTTP response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, body: null }) as never;
    await expect(collect(makeProvider().stream(request, 5000))).rejects.toThrow(/500/);
  });
});
