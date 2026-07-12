import { LegalSourceType } from '@prisma/client';

import { SourceRouterService } from './source-router.service';

describe('SourceRouterService', () => {
  let service: SourceRouterService;

  beforeEach(() => {
    service = new SourceRouterService();
  });

  it('routes tax questions to TAX + LEGAL', () => {
    const types = service.route('QQS va soliq stavkasi qanday?');
    expect(types).toContain(LegalSourceType.TAX);
    expect(types).toContain(LegalSourceType.LEGAL);
  });

  it('routes banking questions to CENTRAL_BANK + LEGAL', () => {
    const types = service.route('Bank krediti foizi qancha?');
    expect(types).toContain(LegalSourceType.CENTRAL_BANK);
    expect(types).toContain(LegalSourceType.LEGAL);
  });

  it('routes customs questions to CUSTOMS + LEGAL', () => {
    const types = service.route('Import tovar uchun bojxona to\'lovi');
    expect(types).toContain(LegalSourceType.CUSTOMS);
  });

  it('is case-insensitive', () => {
    expect(service.route('SOLIQ')).toContain(LegalSourceType.TAX);
  });

  it('matches Russian keywords too', () => {
    expect(service.route('ставка налога')).toContain(LegalSourceType.TAX);
  });

  it('defaults to [LEGAL] when no keyword matches', () => {
    expect(service.route('salom qalaysan')).toEqual([LegalSourceType.LEGAL]);
  });

  it('returns unique types (no duplicates) when multiple rules match', () => {
    const types = service.route('soliq va prezident farmoni');
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });
});
