import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** O'zbekiston rasmiy manbalari — faqat shu domenlar ishonchli deb hisoblanadi. */
const OFFICIAL_DOMAINS = [
  'lex.uz',
  'norma.uz',
  'my.gov.uz',
  'gov.uz',
  'adliya.uz',
  'president.uz',
  'parliament.gov.uz',
  'constitution.uz',
  'soliq.uz',
  'customs.uz',
  'cbu.uz',
  'sud.uz',
];

/**
 * Rasmiy manbalar bo'yicha veb-qidiruv (Tavily yoki Brave). Master-spec talabiga
 * ko'ra faqat rasmiy .uz domenlaridan natija qaytaradi. RAG lokal bazasida
 * javob topilmaganda qo'shimcha manba sifatida ishlatiladi.
 *
 * Kalit bo'lmasa bo'sh ro'yxat qaytaradi (o'chirilgan holat).
 */
@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly tavilyKey: string;
  private readonly braveKey: string;

  constructor(private readonly config: ConfigService) {
    this.tavilyKey = this.config.get<string>('TAVILY_API_KEY', '');
    this.braveKey = this.config.get<string>('BRAVE_API_KEY', '');
  }

  get isConfigured(): boolean {
    return Boolean(this.tavilyKey || this.braveKey);
  }

  async search(query: string, limit = 5): Promise<WebSearchResult[]> {
    if (!query?.trim()) return [];
    try {
      if (this.tavilyKey) return await this.searchTavily(query, limit);
      if (this.braveKey) return await this.searchBrave(query, limit);
      return [];
    } catch (err) {
      this.logger.warn(`Veb-qidiruv xatosi: ${(err as Error).message}`);
      return [];
    }
  }

  private async searchTavily(query: string, limit: number): Promise<WebSearchResult[]> {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.tavilyKey,
        query,
        max_results: limit,
        include_domains: OFFICIAL_DOMAINS,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
    const json = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    return (json.results ?? [])
      .map((r) => ({ title: r.title ?? '', url: r.url ?? '', snippet: r.content ?? '' }))
      .filter((r) => this.isOfficial(r.url));
  }

  private async searchBrave(query: string, limit: number): Promise<WebSearchResult[]> {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(limit));
    const res = await fetch(url, {
      headers: { 'X-Subscription-Token': this.braveKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
    const json = (await res.json()) as { web?: { results?: { title?: string; url?: string; description?: string }[] } };
    return (json.web?.results ?? [])
      .map((r) => ({ title: r.title ?? '', url: r.url ?? '', snippet: r.description ?? '' }))
      .filter((r) => this.isOfficial(r.url))
      .slice(0, limit);
  }

  /** Faqat rasmiy .uz domenlariga tegishli URL'larni qoldiradi. */
  private isOfficial(url: string): boolean {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
    } catch {
      return false;
    }
  }
}
