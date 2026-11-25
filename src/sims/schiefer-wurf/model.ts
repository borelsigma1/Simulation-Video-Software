/**
 * Schiefer Wurf ohne Luftwiderstand.
 * Koordinaten: x nach rechts, y nach oben, Ursprung am Boden unter der Abwurfstelle.
 */
export interface WurfParams {
  /** Abwurfgeschwindigkeit in m/s */
  v0: number;
  /** Abwurfwinkel gegen die Horizontale in Grad */
  angleDeg: number;
  /** Abwurfhöhe in m */
  h0: number;
  /** Fallbeschleunigung in m/s² */
  g: number;
}

export interface WurfState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface WurfKennwerte {
  /** Flugzeit bis zum Aufprall auf dem Boden (y = 0) */
  flugzeit: number;
  /** Horizontale Wurfweite */
  wurfweite: number;
  /** Maximale Höhe über dem Boden */
  maxHoehe: number;
  /** Zeitpunkt des höchsten Punkts */
  steigzeit: number;
}

export function components(p: WurfParams): { vx0: number; vy0: number } {
  const a = (p.angleDeg * Math.PI) / 180;
  return { vx0: p.v0 * Math.cos(a), vy0: p.v0 * Math.sin(a) };
}

export function stateAt(p: WurfParams, t: number): WurfState {
  const { vx0, vy0 } = components(p);
  return {
    t,
    x: vx0 * t,
    y: p.h0 + vy0 * t - 0.5 * p.g * t * t,
    vx: vx0,
    vy: vy0 - p.g * t
  };
}

export function kennwerte(p: WurfParams): WurfKennwerte {
  const { vx0, vy0 } = components(p);
  const flugzeit = (vy0 + Math.sqrt(vy0 * vy0 + 2 * p.g * p.h0)) / p.g;
  const steigzeit = Math.max(0, vy0 / p.g);
  const maxHoehe = vy0 > 0 ? p.h0 + (vy0 * vy0) / (2 * p.g) : p.h0;
  return { flugzeit, wurfweite: vx0 * flugzeit, maxHoehe, steigzeit };
}

export const ORTE = [
  { name: 'Erde', g: 9.81 },
  { name: 'Mond', g: 1.62 },
  { name: 'Mars', g: 3.71 },
  { name: 'Jupiter', g: 24.79 }
] as const;
