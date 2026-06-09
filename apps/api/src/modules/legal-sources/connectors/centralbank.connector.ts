import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

import { BaseSourceConnector, FetchedDocument } from './base.connector';

@Injectable()
export class CentralBankConnector extends BaseSourceConnector {
  readonly sourceName = 'cbu.uz';
  private readonly logger = new Logger(CentralBankConnector.name);
  private readonly baseUrl = 'https://www.cbu.uz';

  async fetchDocuments(limit = 10): Promise<FetchedDocument[]> {
    try {
      const response = await this.http.get<string>(`${this.baseUrl}/uz/normativeDocuments/`);
      const $ = cheerio.load(response.data);
      const links: Array<{ href: string; title: string }> = [];

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const title = $(el).text().trim();
        if (
          (href.includes('/normativeDocuments/') ||
            href.includes('/regulation/') ||
            href.includes('/document/')) &&
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
          const $doc = cheerio.load(docResponse.data);
          const content = this.cleanHtml(docResponse.data);
          if (content.length < 50) continue;

          const dateText = $doc('.date, time, .published').first().text().trim();
          const publishedAt = dateText ? new Date(dateText) : undefined;

          documents.push({
            title: link.title,
            url: link.href,
            content,
            publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : undefined,
            metadata: { source: this.sourceName, type: 'banking_regulation' },
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
