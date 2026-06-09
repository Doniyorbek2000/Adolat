import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

import { BaseSourceConnector, FetchedDocument } from './base.connector';

@Injectable()
export class SoliqUzConnector extends BaseSourceConnector {
  readonly sourceName = 'soliq.uz';
  private readonly logger = new Logger(SoliqUzConnector.name);
  private readonly baseUrl = 'https://soliq.uz';

  async fetchDocuments(limit = 10): Promise<FetchedDocument[]> {
    try {
      const response = await this.http.get<string>(`${this.baseUrl}/news`);
      const $ = cheerio.load(response.data);
      const links: Array<{ href: string; title: string }> = [];

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const title = $(el).text().trim();
        if (
          (href.includes('/article/') || href.includes('/news/') || href.includes('/page/')) &&
          title.length > 5
        ) {
          links.push({ href: this.resolveUrl(this.baseUrl, href), title });
        }
      });

      const uniqueLinks = [...new Map(links.map((l) => [l.href, l])).values()].slice(0, limit);
      const documents: FetchedDocument[] = [];

      for (const link of uniqueLinks) {
        try {
          const docResponse = await this.http.get<string>(link.href);
          const content = this.cleanHtml(docResponse.data);
          if (content.length < 50) continue;

          documents.push({
            title: link.title,
            url: link.href,
            content,
            metadata: { source: this.sourceName },
          });
        } catch (err) {
          this.logger.warn(`Failed to fetch ${link.href}: ${String(err)}`);
        }
      }

      return documents;
    } catch (err) {
      this.logger.error(`Failed to fetch documents from ${this.sourceName}: ${String(err)}`);
      return [];
    }
  }
}
