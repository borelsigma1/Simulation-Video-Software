import { describe, expect, it } from 'vitest';
import { v0von, yPlatte, ySchirm } from './ablenkung';
import { streifenabstand } from './doppelspalt';
import { intensitaet, zufallsOrt } from './interferenz';
import { bahnradius } from './kreisbahn';
import { zentripetalkraft } from './kreisbewegung';
import { energie } from './potentialtopf';
import { deBroglie } from './quantenspalt';
import { spannung, tau } from './rc';
import { nachStoss } from './stoss';
import { erwartet } from './zerfall';

describe('Stoß', () => {
  it('erhält den Impuls bei beiden Stoßarten', () => {
    for (const el of [true, false]) {
      const [u1, u2] = nachStoss(0.7, 1.3, 1.9, -0.4, el);
      expect(0.7 * u1 + 1.9 * u2).toBeCloseTo(0.7 * 1.3 + 1.9 * -0.4, 10);
    }
  });
  it('erhält die Bewegungsenergie nur beim elastischen Stoß', () => {
    const E = (m1: number, v1: number, m2: number, v2: number) => 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
    const [a1, a2] = nachStoss(1, 1, 0.5, 0, true);
    expect(E(1, a1, 0.5, a2)).toBeCloseTo(0.5, 10);
    const [b1, b2] = nachStoss(1, 1, 0.5, 0, false);
    expect(b1).toBeCloseTo(2 / 3, 10);
    expect(E(1, b1, 0.5, b2)).toBeLessThan(0.5);
  });
  it('tauscht bei gleichen Massen die Geschwindigkeiten', () => {
    expect(nachStoss(0.5, 1, 0.5, 0, true)).toEqual([0, 1]);
  });
});

describe('weitere Modelle', () => {
  it('Zerfall: Hälfte nach einer Halbwertszeit', () => {
    expect(erwartet(400, 56, 56)).toBeCloseTo(200, 10);
    expect(erwartet(400, 56, 168)).toBeCloseTo(50, 10);
  });
  it('Kreisbewegung: F = m·v²/r', () => {
    const v = (2 * Math.PI * 0.6) / 2;
    expect(zentripetalkraft(0.2, 0.6, 2)).toBeCloseTo((0.2 * v * v) / 0.6, 10);
    expect(zentripetalkraft(0.2, 0.6, 2)).toBeCloseTo(1.184, 3);
  });
  it('Doppelspalt: Streifenabstand λ·a/d', () => {
    expect(streifenabstand(630, 200, 3)).toBeCloseTo(9.45, 6);
  });
  it('Interferenz: Maxima und Minima, Zufallsorte im Schirm', () => {
    const m = { dx: 10, x0: 50, einzel: false, interferenz: true };
    expect(intensitaet(0, m)).toBeCloseTo(1, 10);
    expect(intensitaet(5, m)).toBeCloseTo(0, 10);
    expect(intensitaet(20, m)).toBeCloseTo(1, 10);
    for (let i = 0; i < 200; i++) expect(Math.abs(zufallsOrt(m, 50))).toBeLessThanOrEqual(50);
  });
  it('Querfeld: Geschwindigkeit und Ablenkung', () => {
    expect(v0von(1000) / 1e6).toBeCloseTo(18.76, 2);
    expect(yPlatte(150, 1000) * 100).toBeCloseTo(0.6, 6);
    expect(ySchirm(150, 1000) * 100).toBeCloseTo(2.4, 6);
  });
  it('Fadenstrahlrohr: Bahnradius', () => {
    expect(bahnradius(200, 1) * 100).toBeCloseTo(4.77, 2);
    expect(bahnradius(200, 2)).toBeCloseTo(bahnradius(200, 1) / 2, 10);
  });
  it('RC-Glied: Zeitkonstante und Grenzwerte', () => {
    expect(tau(10, 470)).toBeCloseTo(4.7, 10);
    expect(spannung(10, 4.7, 4.7, true)).toBeCloseTo(6.321, 3);
    expect(spannung(10, 4.7, 4.7, false)).toBeCloseTo(3.679, 3);
  });
  it('De-Broglie-Wellenlänge bei 10 kV', () => {
    expect(deBroglie(10)).toBeCloseTo(12.27, 1);
  });
  it('Potentialtopf: E ~ n²/L²', () => {
    expect(energie(1, 1)).toBeCloseTo(0.376, 3);
    expect(energie(3, 1)).toBeCloseTo(9 * energie(1, 1), 10);
    expect(energie(1, 2)).toBeCloseTo(energie(1, 1) / 4, 10);
  });
});
