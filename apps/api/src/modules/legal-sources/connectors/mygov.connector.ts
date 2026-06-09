import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

import { BaseSourceConnector, FetchedDocument } from './base.connector';

@Injectable()
export class MyGovConnector extends BaseSourceConnector {
  readonly sourceName = 'my.gov.uz';
  private readonly logger = new Logger(MyGovConnector.name);
  private readonly baseUrl = 'https://my.gov.uz';

  async fetchDocuments(limit = 10): Promise<FetchedDocument[]> {
    try {
      const response = await this.http.get<string>(`${this.baseUrl}/uz/services`);
      const $ = cheerio.load(response.data);
      const links: Array<{ href: string; title: string }> = [];

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const title = $(el).text().trim();
        if (
          (href.includes('/service/') || href.includes('/services/')) &&
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
            metadata: { source: this.sourceName, type: 'government_service' },
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
