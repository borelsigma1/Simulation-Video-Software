import { describe, expect, it } from 'vitest';
import { kennwerte, stateAt } from './model';

describe('schiefer Wurf', () => {
  it('maximale Wurfweite bei 45° vom Boden aus', () => {
    const p = { v0: 10, angleDeg: 45, h0: 0, g: 9.81 };
    const k = kennwerte(p);
    expect(k.wurfweite).toBeCloseTo(100 / 9.81, 6);
    expect(k.flugzeit).toBeCloseTo((2 * 10 * Math.SQRT1_2) / 9.81, 6);
    expect(kennwerte({ ...p, angleDeg: 40 }).wurfweite).toBeLessThan(k.wurfweite);
    expect(kennwerte({ ...p, angleDeg: 50 }).wurfweite).toBeLessThan(k.wurfweite);
  });

  it('landet bei y = 0 nach der Flugzeit', () => {
    const p = { v0: 12, angleDeg: 30, h0: 5, g: 9.81 };
    const k = kennwerte(p);
    const s = stateAt(p, k.flugzeit);
    expect(s.y).toBeCloseTo(0, 9);
    expect(s.x).toBeCloseTo(k.wurfweite, 9);
  });

  it('waagerechter Wurf: Fallzeit hängt nur von der Höhe ab', () => {
    const k1 = kennwerte({ v0: 2, angleDeg: 0, h0: 20, g: 9.81 });
    const k2 = kennwerte({ v0: 15, angleDeg: 0, h0: 20, g: 9.81 });
    expect(k1.flugzeit).toBeCloseTo(Math.sqrt((2 * 20) / 9.81), 9);
    expect(k2.flugzeit).toBeCloseTo(k1.flugzeit, 9);
    expect(k1.maxHoehe).toBe(20);
  });

  it('Scheitelhöhe', () => {
    const p = { v0: 20, angleDeg: 90, h0: 0, g: 10 };
    const k = kennwerte(p);
    expect(k.maxHoehe).toBeCloseTo(20, 9);
    expect(k.steigzeit).toBeCloseTo(2, 9);
  });
});
