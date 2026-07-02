import { describe, it, expect } from 'vitest';
import { wmoLabel, DEST_COORDS } from './weather';

describe('wmoLabel', () => {
  it('maps the common WMO codes to short board-style labels', () => {
    expect(wmoLabel(0)).toBe('CLEAR');
    expect(wmoLabel(2)).toBe('PARTLY CLOUDY');
    expect(wmoLabel(3)).toBe('OVERCAST');
    expect(wmoLabel(61)).toBe('RAIN');
    expect(wmoLabel(80)).toBe('SHOWERS');
    expect(wmoLabel(95)).toBe('STORM');
  });

  it('falls back to a generic label for unknown codes', () => {
    expect(wmoLabel(42)).toBe('CLOUDY');
  });
});

describe('DEST_COORDS', () => {
  it('covers every destination that can appear as the boarding row', () => {
    for (const dest of ['DENPASAR', 'JAKARTA', 'BANGKOK', 'KUALA LUMPUR', 'HONG KONG', 'COLOMBO', 'MILAN']) {
      expect(DEST_COORDS[dest], dest).toBeDefined();
    }
  });
});
