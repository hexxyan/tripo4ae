import {
  ANIMATION_CATALOG,
  BIPED_ANIMATIONS_V1,
  CROSS_SPECIES_ANIMATIONS_V25,
  ANIMATION_CATEGORIES,
  getAnimationsForRigType,
  searchAnimations,
} from '../../src/shared/animations';

describe('animations catalog', () => {
  it('has exactly 101 biped v1.0 entries', () => {
    expect(BIPED_ANIMATIONS_V1.length).toBe(101);
  });

  it('has exactly 16 cross-species v2.5 entries', () => {
    expect(CROSS_SPECIES_ANIMATIONS_V25.length).toBe(16);
  });

  it('has 117 total entries in ANIMATION_CATALOG', () => {
    expect(ANIMATION_CATALOG.length).toBe(117);
  });

  it('has no duplicate ids', () => {
    const ids = ANIMATION_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has all required fields', () => {
    for (const entry of ANIMATION_CATALOG) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.nameZh).toBe('string');
      expect(ANIMATION_CATEGORIES).toContain(entry.category);
      expect(['v1.0', 'v2.5']).toContain(entry.rigVersion);
    }
  });

  it('v1.0 entries use preset:biped: prefix', () => {
    for (const entry of BIPED_ANIMATIONS_V1) {
      expect(entry.id).toMatch(/^preset:biped:/);
    }
  });

  it('exposes expected category list', () => {
    expect(ANIMATION_CATEGORIES).toEqual([
      'locomotion', 'dance', 'combat', 'sports',
      'emotion', 'gesture', 'idle', 'special', 'cross-species',
    ]);
  });

  it('getAnimationsForRigType returns all 117 for biped', () => {
    const all = getAnimationsForRigType('biped');
    expect(all.length).toBe(117);
  });

  it('getAnimationsForRigType returns only v2.5 for quadruped', () => {
    const quad = getAnimationsForRigType('quadruped');
    expect(quad.length).toBe(16);
    expect(quad.every((e) => e.rigVersion === 'v2.5')).toBe(true);
  });

  it('searchAnimations matches on name (case-insensitive)', () => {
    const results = searchAnimations('walk');
    expect(results.some((e) => e.id === 'preset:biped:walk')).toBe(true);
    expect(results.some((e) => e.id === 'preset:walk')).toBe(true);
  });

  it('searchAnimations matches on nameZh', () => {
    const results = searchAnimations('走');
    expect(results.some((e) => e.id === 'preset:biped:walk' || e.id === 'preset:walk')).toBe(true);
  });

  it('searchAnimations matches on tags', () => {
    const results = searchAnimations('basketball');
    expect(results.some((e) => e.id === 'preset:biped:basketball_shot')).toBe(true);
  });

  it('searchAnimations returns empty array for no match', () => {
    expect(searchAnimations('xyzzy_nothing_matches')).toEqual([]);
  });
});
