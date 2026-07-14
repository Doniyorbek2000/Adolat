import { Global, Module } from '@nestjs/common';

import { WebSearchService } from './web-search.service';

/** Rasmiy manbalar bo'yicha veb-qidiruv (RAG fallback sifatida ishlatiladi). */
@Global()
@Module({
  providers: [WebSearchService],
  exports: [WebSearchService],
})
export class WebSearchModule {}
