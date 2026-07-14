import { ConfigService } from '@nestjs/config';
import { AiRouterService } from './ai-router.service';
import { AiProviderClient, AiCompletionRequest, AiProviderError } from './interfaces/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { PrismaService } from '../database/prisma/prisma.service';

const mockPrisma = {
  aiRequest: { create: jest.fn().mockResolvedValue({}) },
} as unknown as PrismaService;

function fakeClient(
  provider: 'openai' | 'gemini' | 'claude',
  opts: { configured: boolean; succeed?: boolean },
): AiProviderClient {
  return {
    provider,
    isConfigured: opts.configured,
    complete: jest.fn(async () => {
      if (!opts.succeed) {
        throw new AiProviderError(provider, 'simulated failure');
      }
      return {
        provider,
        model: `${provider}-test-model`,
        content: `javob (${provider})`,
        promptTokens: 10,
        completionTokens: 20,
        latencyMs: 5,
        estimatedCostUsd: 0.001,
      };
    }),
  };
}

function buildConfigService(overrides: Partial<Record<string, unknown>> = {}): ConfigService<any, true> {
  const ai = {
    primaryProvider: 'openai',
    fallbackProvider: 'claude',
    fallbackProvider2: 'gemini',
    timeoutMs: 1000,
    retryCount: 0,
    openai: { apiKey: '', model: 'gpt-4o-mini' },
    gemini: { apiKey: '', model: 'gemini-1.5-flash' },
    claude: { apiKey: '', model: 'claude-sonnet-4-6' },
    ...overrides,
  };
  return { get: () => ai } as unknown as ConfigService<any, true>;
}

const sampleRequest: AiCompletionRequest = {
  systemPrompt: 'system',
  messages: [{ role: 'user', content: 'Mehnat shartnomasi qanday tuziladi?' }],
  language: 'uz',
};

describe('AiRouterService', () => {
  it('routes to the primary provider when it succeeds', async () => {
    const openai = fakeClient('openai', { configured: true, succeed: true });
    const claude = fakeClient('claude', { configured: true, succeed: true });
    const gemini = fakeClient('gemini', { configured: true, succeed: true });

    const service = new AiRouterService(
      mockPrisma,
      buildConfigService(),
      openai as OpenAiProvider,
      gemini as GeminiProvider,
      claude as ClaudeProvider,
    );

    const result = await service.complete(sampleRequest);

    expect(result.provider).toBe('openai');
    expect(result.attempts).toEqual([{ provider: 'openai', ok: true, latencyMs: 5 }]);
    expect(claude.complete).not.toHaveBeenCalled();
    expect(gemini.complete).not.toHaveBeenCalled();
  });

  it('falls back to claude, then gemini, when earlier providers fail', async () => {
    const openai = fakeClient('openai', { configured: true, succeed: false });
    const claude = fakeClient('claude', { configured: true, succeed: false });
    const gemini = fakeClient('gemini', { configured: true, succeed: true });

    const service = new AiRouterService(
      mockPrisma,
      buildConfigService(),
      openai as OpenAiProvider,
      gemini as GeminiProvider,
      claude as ClaudeProvider,
    );

    const result = await service.complete(sampleRequest);

    expect(result.provider).toBe('gemini');
    expect(result.attempts.map((a) => a.provider)).toEqual(['openai', 'claude', 'gemini']);
    expect(result.attempts.map((a) => a.ok)).toEqual([false, false, true]);
  });

  it('skips unconfigured providers entirely', async () => {
    const openai = fakeClient('openai', { configured: false });
    const claude = fakeClient('claude', { configured: true, succeed: true });
    const gemini = fakeClient('gemini', { configured: true, succeed: true });

    const service = new AiRouterService(
      mockPrisma,
      buildConfigService(),
      openai as OpenAiProvider,
      gemini as GeminiProvider,
      claude as ClaudeProvider,
    );

    const result = await service.complete(sampleRequest);

    expect(result.provider).toBe('claude');
    expect(openai.complete).not.toHaveBeenCalled();
  });

  it('throws AiProviderError when every provider fails or is unconfigured', async () => {
    const openai = fakeClient('openai', { configured: true, succeed: false });
    const claude = fakeClient('claude', { configured: false });
    const gemini = fakeClient('gemini', { configured: true, succeed: false });

    const service = new AiRouterService(
      mockPrisma,
      buildConfigService(),
      openai as OpenAiProvider,
      gemini as GeminiProvider,
      claude as ClaudeProvider,
    );

    await expect(service.complete(sampleRequest)).rejects.toBeInstanceOf(AiProviderError);
  });

  it('exposes provider status without leaking API keys', () => {
    const service = new AiRouterService(
      mockPrisma,
      buildConfigService(),
      fakeClient('openai', { configured: true, succeed: true }) as OpenAiProvider,
      fakeClient('gemini', { configured: false }) as GeminiProvider,
      fakeClient('claude', { configured: true, succeed: true }) as ClaudeProvider,
    );

    const status = service.getProviderStatus();
    expect(status).toEqual([
      { provider: 'openai', configured: true, order: 0 },
      { provider: 'claude', configured: true, order: 1 },
      { provider: 'gemini', configured: false, order: 2 },
    ]);
    expect(JSON.stringify(status)).not.toMatch(/sk-|key/i);
  });
});

// ─── Streaming (SSE) ─────────────────────────────────────────────────────────

function fakeStreamingClient(
  provider: 'openai' | 'gemini' | 'claude',
  opts: { configured: boolean; deltas?: string[]; failBeforeEmit?: boolean },
): AiProviderClient {
  return {
    provider,
    isConfigured: opts.configured,
    complete: jest.fn(async () => ({
      provider,
      model: `${provider}-model`,
      content: `full (${provider})`,
      promptTokens: 1,
      completionTokens: 1,
      latencyMs: 1,
      estimatedCostUsd: 0,
    })),
    async *stream() {
      if (opts.failBeforeEmit) {
        throw new AiProviderError(provider, 'stream failed before emit');
      }
      for (const d of opts.deltas ?? []) {
        yield d;
      }
    },
  };
}

const streamInput = {
  userId: 'u1',
  question: 'Mehnat shartnomasi?',
  language: 'UZ' as never,
  context: [{ sourceName: 'lex.uz', title: 'Kodeks', content: 'matn' }],
};

describe('AiRouterService — streamLegalAnswer', () => {
  it('streams token deltas and returns the accumulated answer', async () => {
    const gemini = fakeStreamingClient('gemini', { configured: true, deltas: ['Sa', 'lom', ' dunyo'] });
    const service = new AiRouterService(
      mockPrisma,
      buildConfigService({ primaryProvider: 'gemini', fallbackProvider: 'gemini', fallbackProvider2: '' }),
      fakeClient('openai', { configured: false }) as OpenAiProvider,
      gemini as GeminiProvider,
      fakeClient('claude', { configured: false }) as ClaudeProvider,
    );

    const tokens: string[] = [];
    const result = await service.streamLegalAnswer(streamInput, (d) => tokens.push(d));

    expect(tokens).toEqual(['Sa', 'lom', ' dunyo']);
    expect(result.answer).toBe('Salom dunyo');
    expect(result.provider).toBe('gemini');
    expect(result.fallbackUsed).toBe(false);
  });

  it('falls back to complete() when a provider lacks streaming', async () => {
    const noStream = fakeClient('gemini', { configured: true, succeed: true }); // stream yo'q
    const service = new AiRouterService(
      mockPrisma,
      buildConfigService({ primaryProvider: 'gemini', fallbackProvider: 'gemini', fallbackProvider2: '' }),
      fakeClient('openai', { configured: false }) as OpenAiProvider,
      noStream as GeminiProvider,
      fakeClient('claude', { configured: false }) as ClaudeProvider,
    );

    const tokens: string[] = [];
    const result = await service.streamLegalAnswer(streamInput, (d) => tokens.push(d));

    expect(result.answer).toBe('javob (gemini)');
    expect(tokens).toEqual(['javob (gemini)']); // butun javob bitta bo'lak sifatida
  });

  it('falls back to the next provider if the first fails before emitting', async () => {
    const failing = fakeStreamingClient('openai', { configured: true, failBeforeEmit: true });
    const working = fakeStreamingClient('gemini', { configured: true, deltas: ['OK'] });
    const service = new AiRouterService(
      mockPrisma,
      buildConfigService({ primaryProvider: 'openai', fallbackProvider: 'gemini', fallbackProvider2: '' }),
      failing as OpenAiProvider,
      working as GeminiProvider,
      fakeClient('claude', { configured: false }) as ClaudeProvider,
    );

    const result = await service.streamLegalAnswer(streamInput, () => undefined);
    expect(result.answer).toBe('OK');
    expect(result.provider).toBe('gemini');
    expect(result.fallbackUsed).toBe(true);
  });
});
