import { AiProviderError } from '../interfaces/ai-provider.interface';
import { AiProvider } from '../../config/configuration';

export async function fetchWithTimeout(
  provider: AiProvider,
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new AiProviderError(provider, `HTTP ${response.status}: ${body.slice(0, 500)}`);
    }
    return response;
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiProviderError(provider, `So'rov ${timeoutMs}ms ichida javob bermadi (timeout)`, error);
    }
    throw new AiProviderError(provider, 'Tarmoq xatosi', error);
  } finally {
    clearTimeout(timer);
  }
}
