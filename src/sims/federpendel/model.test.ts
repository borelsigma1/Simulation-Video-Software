import { describe, expect, it } from 'vitest';
import { energien, periodeTheorie, PeriodenMesser, rk4Step, type PendelState } from './model';

function simulate(p: { m: number; D: number; b: number }, s0: number, seconds: number, dt = 1 / 240) {
  const st: PendelState = { t: 0, s: s0, v: 0 };
  const messer = new PeriodenMesser();
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) {
    rk4Step(p, st, dt);
    messer.update(st.t, st.s);
  }
  return { st, messer };
}

describe('Federpendel', () => {
  it('gemessene Periodendauer entspricht T = 2π√(m/D)', () => {
    const p = { m: 0.5, D: 20, b: 0 };
    const { messer } = simulate(p, 0.1, 10);
    expect(messer.periode).not.toBeNull();
    expect(messer.periode!).toBeCloseTo(periodeTheorie(p), 4);
    expect(messer.amplitude!).toBeCloseTo(0.1, 3);
  });

  it('Energie bleibt ohne Dämpfung erhalten', () => {
    const p = { m: 1, D: 40, b: 0 };
    const e0 = energien(p, { t: 0, s: 0.2, v: 0 }).ges;
    const { st } = simulate(p, 0.2, 60);
    expect(energien(p, st).ges / e0).toBeCloseTo(1, 6);
  });

  it('mit Dämpfung nimmt die Energie ab', () => {
    const p = { m: 1, D: 40, b: 0.5 };
    const e0 = energien(p, { t: 0, s: 0.2, v: 0 }).ges;
    const { st } = simulate(p, 0.2, 10);
    expect(energien(p, st).ges).toBeLessThan(e0 * 0.1);
  });
});
