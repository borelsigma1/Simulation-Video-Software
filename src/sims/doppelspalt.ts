/**
 * Doppelspaltversuch mit Laserlicht: Interferenzmuster auf dem Schirm,
 * Abstände mit einer verschiebbaren Messmarke ausmessen.
 */
import { box, fmt, label, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';
import { farbe, flaeche, intensitaet, massstab, skizze, type Muster } from './interferenz';

const HALF = 50; // halbe Schirmbreite in mm
const SPALT = 40e-6; // Breite eines Einzelspalts in m

/** Abstand benachbarter Maxima in mm (Kleinwinkelnäherung). */
export const streifenabstand = (lambdaNm: number, dMikro: number, a: number): number => ((lambdaNm * 1e-9 * a) / (dMikro * 1e-6)) * 1000;

export const sim: SimDef = {
  id: 'doppelspalt',
  title: 'Doppelspalt mit Laserlicht',
  summary: 'Laserlicht fällt auf einen Doppelspalt: Interferenzmuster beobachten, Streifenabstände messen, Wellenlänge bestimmen.',
  animated: false,
  hint: 'Die Messmarke lässt sich mit Maus oder Finger über den Schirm ziehen. x wird von der Mitte des Musters aus gemessen.',
  params: [
    { key: 'lambda', label: 'Wellenlänge', symbol: 'λ', unit: 'nm', min: 400, max: 700, step: 5, value: 630 },
    { key: 'd', label: 'Spaltabstand', symbol: 'd', unit: 'µm', min: 100, max: 500, step: 10, value: 200 },
    { key: 'a', label: 'Abstand Doppelspalt – Schirm', symbol: 'a', unit: 'm', min: 1, max: 5, step: 0.1, value: 3 }
  ],
  presets: [
    { name: 'roter Laser', values: { lambda: 630 } },
    { name: 'grüner Laser', values: { lambda: 530 } },
    { name: 'blauer Laser', values: { lambda: 450 } }
  ],
  options: [
    { key: 'kurve', label: 'Intensitätsverlauf anzeigen', value: true },
    { key: 'ordnung', label: 'Maxima nummerieren', value: false },
    { key: 'einzel', label: 'Einfluss der Spaltbreite berücksichtigen', value: false }
  ],
  plots: [],
  measures: [{ key: 'x', label: 'Position der Messmarke', symbol: 'x', unit: 'mm', digits: 1 }],

  create(env) {
    const { p, show } = env;
    let cursor = 0;
    let drag = false;
    const muster = (): Muster => ({
      dx: streifenabstand(p.lambda, p.d, p.a),
      x0: ((p.lambda * 1e-9 * p.a) / SPALT) * 1000,
      einzel: show.einzel,
      interferenz: true
    });
    return {
      reset() {
        cursor = 0;
      },
      measure: () => ({ x: cursor }),
      pointer(kind, x, _y, g) {
        const f = flaeche(g, HALF);
        const innen = x >= f.x - 10 && x <= f.x + f.w + 10;
        if (kind === 'down' && innen) drag = true;
        if (kind === 'up') drag = false;
        if (drag) {
          cursor = Math.round(Math.max(-HALF, Math.min(HALF, f.inv(x))) * 10) / 10;
          env.invalidate();
          return 'ew-resize';
        }
        return innen ? 'ew-resize' : '';
      },
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h);
        const m = muster();
        const [r, gr, b] = farbe(p.lambda);
        skizze(g, 'Laser', `rgb(${r},${gr},${b})`, [`λ = ${fmt(p.lambda, 0)} nm`, `d = ${fmt(p.d, 0)} µm`, `a = ${fmt(p.a, 1)} m`]);
        const f = flaeche(g, HALF);
        const top = 44;
        const sh = Math.min(110, h * 0.26);
        // Schirm: Helligkeit spaltenweise
        box(ctx, f.x - 3, top - 3, f.w + 6, sh + 6, '#0d1117', theme.text, 3, 2);
        for (let px = 0; px < f.w; px++) {
          const I = intensitaet(f.inv(f.x + px + 0.5), m);
          const k = Math.pow(I, 0.6);
          ctx.fillStyle = `rgb(${Math.round(13 + (r - 13) * k)},${Math.round(17 + (gr - 17) * k)},${Math.round(23 + (b - 23) * k)})`;
          ctx.fillRect(f.x + px, top, 1.05, sh);
        }
        label(ctx, 'Schirm (Ausschnitt)', f.x, top - 24, { size: 11.5, color: theme.muted });
        const base = h - 52;
        const ktop = top + sh + 26;
        if (show.kurve && base - ktop > 30) {
          ctx.beginPath();
          for (let px = 0; px <= f.w; px++) {
            const y = base - intensitaet(f.inv(f.x + px), m) * (base - ktop);
            if (px === 0) ctx.moveTo(f.x + px, y);
            else ctx.lineTo(f.x + px, y);
          }
          ctx.strokeStyle = `rgb(${Math.round(r * 0.8)},${Math.round(gr * 0.7)},${Math.round(b * 0.8)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          label(ctx, 'Intensität', f.x + 2, ktop - 6, { size: 11.5, color: theme.muted });
        }
        if (show.ordnung) {
          for (let k = -Math.floor(HALF / m.dx); k <= HALF / m.dx; k++) {
            if (m.dx * (f.w / (2 * HALF)) < 16 && k % 2 !== 0) continue;
            label(ctx, `${Math.abs(k)}`, f.X(k * m.dx), top + sh + 16, { align: 'center', size: 11.5, bold: true });
          }
        }
        massstab(g, f, base, 5, 'mm', cursor, top);
      }
    };
  }
};
