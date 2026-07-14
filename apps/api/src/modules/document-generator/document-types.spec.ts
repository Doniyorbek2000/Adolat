import { DOCUMENT_TYPES, DOCUMENT_TYPE_MAP } from './document-types';

describe('Document types catalog', () => {
  it('provides at least 20 professional templates', () => {
    expect(DOCUMENT_TYPES.length).toBeGreaterThanOrEqual(20);
  });

  it('has unique codes and a working lookup map', () => {
    const codes = DOCUMENT_TYPES.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(DOCUMENT_TYPE_MAP.get('da_vo_arizasi')?.nameUz).toBe("Da'vo arizasi");
  });

  it('every template is well-formed (names, category, fields, prompt hint)', () => {
    for (const t of DOCUMENT_TYPES) {
      expect(t.nameUz.length).toBeGreaterThan(0);
      expect(t.nameRu.length).toBeGreaterThan(0);
      expect(t.category).toBeDefined();
      expect(t.fields.length).toBeGreaterThan(0);
      expect(t.promptHint.length).toBeGreaterThan(10);
      for (const f of t.fields) {
        expect(f.key).toMatch(/^[a-zA-Z0-9]+$/);
        expect(typeof f.required).toBe('boolean');
        expect(f.labelUz.length).toBeGreaterThan(0);
        expect(f.labelRu.length).toBeGreaterThan(0);
      }
    }
  });

  it('covers the master-spec document families', () => {
    const codes = new Set(DOCUMENT_TYPES.map((t) => t.code));
    for (const required of [
      'da_vo_arizasi',
      'apellyatsiya',
      'kassatsiya',
      'ishonchnoma',
      'shartnoma',
      'ijara_shartnomasi',
      'mehnat_shartnomasi',
      'nda',
      'mchj_ustav',
      'buyruq',
      'dalolatnoma',
      'kafolat_xati',
      'advokat_sorovi',
    ]) {
      expect(codes.has(required)).toBe(true);
    }
  });
});
