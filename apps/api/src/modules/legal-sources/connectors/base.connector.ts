import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export interface FetchedDocument {
  title: string;
  url: string;
  content: string;
  publishedAt?: Date;
  articleRef?: string;
  metadata?: Record<string, unknown>;
}

export abstract class BaseSourceConnector {
  protected readonly http: AxiosInstance;
  abstract readonly sourceName: string;

  constructor() {
    this.http = axios.create({
      timeout: 30_000,
      headers: {
        'User-Agent': 'AdolatAI-Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uz,ru;q=0.8,en;q=0.5',
      },
    });
  }

  abstract fetchDocuments(limit?: number): Promise<FetchedDocument[]>;

  protected cleanHtml(html: string): string {
    const $ = cheerio.load(html);

    // Remove script, style, nav, footer, header elements
    $('script, style, nav, footer, header, noscript, iframe').remove();

    const text = $.root().text();

    // Normalize whitespace: collapse multiple spaces/newlines
    return text
      .replace(/\t/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  protected resolveUrl(baseUrl: string, href: string): string {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }
}
