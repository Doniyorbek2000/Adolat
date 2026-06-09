import { Injectable } from '@nestjs/common';
import { LegalSourceType } from '@prisma/client';

interface RoutingRule {
  keywords: string[];
  types: LegalSourceType[];
}

const ROUTING_RULES: RoutingRule[] = [
  {
    keywords: ['soliq', 'qqs', 'stir', 'daromad', 'налог', 'ндс', 'инн', 'доход', 'tax', 'vat'],
    types: [LegalSourceType.TAX, LegalSourceType.LEGAL],
  },
  {
    keywords: [
      'xizmat', 'ariza', 'hujjat', 'davlat', 'guvohnoma',
      'услуга', 'заявление', 'документ', 'государственный', 'свидетельство',
      'service', 'application', 'certificate',
    ],
    types: [LegalSourceType.GOVERNMENT_SERVICE],
  },
  {
    keywords: [
      'farmon', 'qaror', 'prezident',
      'указ', 'постановление', 'президент',
      'decree', 'resolution', 'president',
    ],
    types: [LegalSourceType.PRESIDENT, LegalSourceType.LEGAL],
  },
  {
    keywords: [
      'bank', 'kredit', 'valyuta', 'foiz', 'depozit',
      'банк', 'кредит', 'валюта', 'процент', 'депозит',
      'credit', 'currency', 'interest', 'deposit',
    ],
    types: [LegalSourceType.CENTRAL_BANK, LegalSourceType.LEGAL],
  },
  {
    keywords: [
      'yer', 'kadastr', 'mulk', 'er', 'yerdan', 'ko\'chmas',
      'земля', 'кадастр', 'имущество', 'недвижимость',
      'land', 'cadastre', 'property', 'real estate',
    ],
    types: [LegalSourceType.CADASTRE, LegalSourceType.LEGAL],
  },
  {
    keywords: [
      'bojxona', 'import', 'eksport', 'tovar', 'gumruk',
      'таможня', 'импорт', 'экспорт', 'товар',
      'customs', 'tariff',
    ],
    types: [LegalSourceType.CUSTOMS, LegalSourceType.LEGAL],
  },
  {
    keywords: [
      'mehnat', 'ish', 'ishchi', 'ish haqi', 'ta\'til', 'ishdan bo\'shatish',
      'труд', 'работа', 'зарплата', 'отпуск', 'увольнение',
      'labor', 'work', 'salary', 'vacation', 'dismissal',
    ],
    types: [LegalSourceType.LEGAL],
  },
  {
    keywords: [
      'sud', 'da\'vo', 'jinoyat', 'jazo',
      'суд', 'иск', 'преступление', 'наказание',
      'court', 'lawsuit', 'crime', 'penalty',
    ],
    types: [LegalSourceType.LEGAL, LegalSourceType.JUSTICE],
  },
];

@Injectable()
export class SourceRouterService {
  /**
   * Analyze the question text and return relevant LegalSourceTypes based on keywords.
   * Returns [LEGAL] as the default if no specific keywords match.
   */
  route(question: string): LegalSourceType[] {
    const lower = question.toLowerCase();
    const matchedTypes = new Set<LegalSourceType>();

    for (const rule of ROUTING_RULES) {
      if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        rule.types.forEach((t) => matchedTypes.add(t));
      }
    }

    if (matchedTypes.size === 0) {
      return [LegalSourceType.LEGAL];
    }

    return Array.from(matchedTypes);
  }
}
