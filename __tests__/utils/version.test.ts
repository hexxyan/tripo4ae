import { parseVersion, isNewerVersion } from '../../src/client/utils/version';

describe('version utils', () => {
  describe('parseVersion()', () => {
    it('parses standard semver versions', () => {
      expect(parseVersion('1.0.0')).toEqual([1, 0, 0]);
      expect(parseVersion('2.5.12')).toEqual([2, 5, 12]);
    });

    it('removes leading v character', () => {
      expect(parseVersion('v1.0.0')).toEqual([1, 0, 0]);
      expect(parseVersion('v3.4.5')).toEqual([3, 4, 5]);
    });
  });

  describe('isNewerVersion()', () => {
    it('returns true if latest is greater than current', () => {
      expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true);
      expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true);
      expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
      expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(true);
    });

    it('returns false if latest is equal to current', () => {
      expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
      expect(isNewerVersion('2.3.4', '2.3.4')).toBe(false);
      expect(isNewerVersion('v1.2.3', '1.2.3')).toBe(false);
    });

    it('returns false if latest is older than current', () => {
      expect(isNewerVersion('1.0.1', '1.0.0')).toBe(false);
      expect(isNewerVersion('1.1.0', '1.0.0')).toBe(false);
      expect(isNewerVersion('2.0.0', '1.0.0')).toBe(false);
    });

    it('handles differing array lengths correctly', () => {
      expect(isNewerVersion('1.0', '1.0.1')).toBe(true);
      expect(isNewerVersion('1.0.0', '1.0.0.1')).toBe(true);
      expect(isNewerVersion('1.0.1', '1.0')).toBe(false);
    });
  });
});
