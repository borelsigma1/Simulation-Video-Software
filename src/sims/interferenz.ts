/**
 * Gemeinsame Teile der beiden Doppelspalt-Simulationen (Licht und Elektronen):
 * Intensitätsverteilung, Aufbauskizze, Schirm mit Maßstab und Messmarke.
 * Diese Datei ist selbst keine Simulation.
 */
import { fmt, label, line } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { Stage } from '../lib/sim/types';

export interface Muster {
  /** Abstand benachbarter Maxima auf dem Schirm */
  dx: number;
  /** Erste Nullstelle der Einzelspalt-Einhüllenden */
  x0: number;
  /** Einhüllende des Einzelspalts berücksichtigen */
  einzel: boolean;
  /** false: keine Interferenz (Summe zweier Einzelspalte) */
  interferenz: boolean;
}

/** Relative Intensität bzw. Auftreffwahrscheinlichkeit am Ort x (Maximum = 1). */
export function intensitaet(x: number, m: Muster): number {
  let env = 1;
  if (m.einzel) {
    const u = (Math.PI * x) / m.x0;
    env = Math.abs(u) < 1e-9 ? 1 : (Math.sin(u) / u) ** 2;
  }
  if (!m.interferenz) return env * 0.5;
  return env * Math.cos((Math.PI * x) / m.dx) ** 2;
}

/** Zufälliger Auftreffort gemäß der Verteilung (Verwerfungsmethode). */
export function zufallsOrt(m: Muster, half: number): number {
  for (let i = 0; i < 400; i++) {
    const x = (Math.random() * 2 - 1) * half;
    if (Math.random() < intensitaet(x, m) * (m.interferenz ? 1 : 2)) return x;
  }
  return 0;
}

/** Wellenlänge in nm -> ungefähre Bildschirmfarbe [r, g, b]. */
export function farbe(nm: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) [r, g, b] = [(440 - nm) / 60, 0, 1];
  else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
  else if (nm < 510) [r, g, b] = [0, 1, (510 - nm) / 20];
  else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) [r, g, b] = [1, (645 - nm) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  const f = nm < 420 ? 0.4 + (0.6 * (nm - 380)) / 40 : nm > 680 ? 0.4 + (0.6 * (750 - nm)) / 70 : 1;
  return [Math.round(255 * r * f), Math.round(255 * g * f), Math.round(255 * b * f)];
}

export interface Flaeche {
  /** linker Rand und Breite des Schirmbereichs in Pixeln */
  x: number;
  w: number;
  /** halbe dargestellte Schirmbreite in Schirmeinheiten */
  half: number;
  X(v: number): number;
  inv(px: number): number;
}

/** Aufteilung der Zeichenfläche: links die Skizze des Aufbaus, rechts der Schirm. */
export function flaeche(g: Stage, half: number): Flaeche {
  const skizze = g.w > 620 ? Math.min(250, g.w * 0.27) : 0;
  const x = skizze + 34;
  const w = g.w - x - 22;
  return { x, w, half, X: (v) => x + ((v + half) / (2 * half)) * w, inv: (px) => ((px - x) / w) * 2 * half - half };
}

/** Skizze des Aufbaus (nicht maßstäblich). */
export function skizze(g: Stage, quelle: string, strahl: string, zeilen: string[]): void {
  const { ctx, h } = g;
  const sw = g.w > 620 ? Math.min(250, g.w * 0.27) : 0;
  if (!sw) return;
  const cy = Math.min(h * 0.42, 170);
  const x0 = 16;
  const xs = x0 + sw * 0.42;
  const xe = sw - 8;
  // Quelle
  ctx.fillStyle = theme.text;
  ctx.beginPath();
  ctx.roundRect(x0, cy - 12, 38, 24, 4);
  ctx.fill();
  label(ctx, quelle, x0 + 19, cy - 20, { align: 'center', size: 11, color: theme.muted });
  line(ctx, x0 + 38, cy, xs, cy, strahl, 3);
  // Doppelspalt
  for (const [a, b] of [
    [cy - 70, cy - 12],
    [cy - 5, cy + 5],
    [cy + 12, cy + 70]
  ])
    line(ctx, xs, a, xs, b, theme.text, 5);
  label(ctx, 'Doppelspalt', xs, cy - 78, { align: 'center', size: 11, color: theme.muted });
  // Bündel zum Schirm
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = strahl;
  for (const y of [cy - 8.5, cy + 8.5]) {
    ctx.beginPath();
    ctx.moveTo(xs + 3, y);
    ctx.lineTo(xe, cy - 62);
    ctx.lineTo(xe, cy + 62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  line(ctx, xe, cy - 74, xe, cy + 74, theme.text, 3);
  label(ctx, 'Schirm', xe, cy - 82, { align: 'right', size: 11, color: theme.muted });
  // Maßpfeil a
  line(ctx, xs, cy + 92, xe, cy + 92, theme.axis, 1);
  line(ctx, xs, cy + 87, xs, cy + 97, theme.axis, 1);
  line(ctx, xe, cy + 87, xe, cy + 97, theme.axis, 1);
  label(ctx, 'a', (xs + xe) / 2, cy + 88, { align: 'center', size: 12, bold: true });
  zeilen.forEach((z, i) => label(ctx, z, x0, cy + 122 + i * 18, { size: 12 }));
  label(ctx, 'Skizze nicht maßstäblich', x0, h - 12, { size: 10.5, color: theme.muted });
}

/** Maßstab unter dem Schirm und Messmarke. */
export function massstab(g: Stage, f: Flaeche, y: number, schritt: number, einheit: string, cursor: number | null, top: number): void {
  const { ctx } = g;
  line(ctx, f.x, y, f.x + f.w, y, theme.axis, 1.5);
  for (let v = -Math.floor(f.half / schritt) * schritt; v <= f.half + 1e-9; v += schritt) {
    const gross = Math.abs(Math.round(v / schritt)) % 2 === 0;
    line(ctx, f.X(v), y, f.X(v), y + (gross ? 9 : 5), theme.axis, 1);
    if (gross) label(ctx, fmt(v, 0), f.X(v), y + 23, { align: 'center', size: 11, color: theme.muted });
  }
  label(ctx, `x in ${einheit}`, f.x + f.w, y + 40, { align: 'right', size: 12 });
  if (cursor !== null) {
    const px = f.X(cursor);
    line(ctx, px, top - 6, px, y + 9, theme.text, 1.5, [5, 3]);
    ctx.fillStyle = theme.text;
    ctx.beginPath();
    ctx.moveTo(px - 7, top - 16);
    ctx.lineTo(px + 7, top - 16);
    ctx.lineTo(px, top - 5);
    ctx.closePath();
    ctx.fill();
    const text = `x = ${fmt(cursor, 1)} ${einheit}`;
    const rechts = px < f.x + f.w - 110;
    label(ctx, text, px + (rechts ? 12 : -12), top - 10, { align: rechts ? 'left' : 'right', size: 12.5, bold: true });
  }
}
