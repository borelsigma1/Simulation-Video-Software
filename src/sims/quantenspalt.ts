/**
 * Doppelspaltversuch mit einzelnen Elektronen: Jedes Elektron hinterlässt
 * genau einen Punkt; erst viele Treffer ergeben das Interferenzmuster.
 * Mit Weg-Information am Spalt verschwindet die Interferenz.
 */
import { box, fmt, label, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';
import { flaeche, intensitaet, massstab, skizze, zufallsOrt, type Muster } from './interferenz';

const HALF = 50; // halbe Schirmbreite in µm
const A = 1; // Abstand Spalt – Schirm in m
const SPALT = 0.25e-6; // Breite eines Einzelspalts in m
const BINS = 100;
const H_PLANCK = 6.626e-34;
const M_E = 9.109e-31;
const E = 1.602e-19;

/** De-Broglie-Wellenlänge in pm (nichtrelativistisch; bis 20 kV unter 1 % Abweichung). */
export const deBroglie = (kV: number): number => (H_PLANCK / Math.sqrt(2 * M_E * E * kV * 1000)) * 1e12;

export const sim: SimDef = {
  id: 'quantenspalt',
  title: 'Doppelspalt mit einzelnen Elektronen',
  summary: 'Elektronen treffen einzeln auf den Schirm. Wie entsteht aus zufälligen Treffern ein Interferenzmuster, und wann verschwindet es?',
  animated: true,
  playLabel: 'Elektronen senden',
  thumbTime: 3,
  hint: 'Die Messmarke lässt sich über den Schirm ziehen. Abstand Doppelspalt – Schirm: 1,0 m. Die Treffer sind stark vergrößert dargestellt.',
  params: [
    { key: 'U', label: 'Beschleunigungsspannung', symbol: 'U_B', unit: 'kV', min: 1, max: 20, step: 0.5, value: 10 },
    { key: 'd', label: 'Spaltabstand', symbol: 'd', unit: 'µm', min: 0.5, max: 3, step: 0.1, value: 1 },
    {
      key: 'rate',
      label: 'Elektronen pro Sekunde',
      unit: '',
      min: 5,
      max: 2000,
      step: 1,
      value: 50,
      live: true,
      choices: [
        { value: 5, label: '5' },
        { value: 50, label: '50' },
        { value: 500, label: '500' },
        { value: 2000, label: '2000' }
      ]
    }
  ],
  options: [
    { key: 'histogramm', label: 'Treffer zählen (Histogramm)', value: true },
    { key: 'verteilung', label: 'Wahrscheinlichkeitsverteilung |ψ|² einblenden', value: false },
    { key: 'weg', label: 'Detektor am Spalt: Weg jedes Elektrons bestimmen', value: false }
  ],
  plots: [],
  measures: [
    { key: 'n', label: 'Anzahl der Treffer', symbol: 'n', unit: '', digits: 0 },
    { key: 'lambda', label: 'De-Broglie-Wellenlänge', symbol: 'λ', unit: 'pm', digits: 2 },
    { key: 'x', label: 'Position der Messmarke', symbol: 'x', unit: 'µm', digits: 1 }
  ],

  create(env) {
    const { p, show } = env;
    let cursor = 0;
    let drag = false;
    let hits: number[] = []; // abwechselnd x (µm) und y (0..1)
    let bins = new Array<number>(BINS).fill(0);
    let n = 0;
    let rest = 0;
    let weg = false;
    const muster = (): Muster => {
      const lambda = deBroglie(p.U) * 1e-12;
      return { dx: ((lambda * A) / (p.d * 1e-6)) * 1e6, x0: ((lambda * A) / SPALT) * 1e6, einzel: true, interferenz: !show.weg };
    };
    const leeren = () => {
      hits = [];
      bins = new Array<number>(BINS).fill(0);
      n = 0;
      rest = 0;
    };
    return {
      reset() {
        leeren();
        weg = show.weg;
      },
      step(dt) {
        if (weg !== show.weg) {
          // Der Versuch ist ein anderer: Schirm leeren
          weg = show.weg;
          leeren();
        }
        rest += p.rate * dt;
        const m = muster();
        while (rest >= 1) {
          rest -= 1;
          const x = zufallsOrt(m, HALF);
          n++;
          bins[Math.min(BINS - 1, Math.floor(((x + HALF) / (2 * HALF)) * BINS))]++;
          if (hits.length < 16000) hits.push(x, Math.random());
        }
        if (n >= 20000) env.finish();
      },
      measure: () => ({ n, lambda: deBroglie(p.U), x: cursor }),
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
        skizze(g, 'Quelle', theme.velocity, [`U_B = ${fmt(p.U, 1)} kV`, `d = ${fmt(p.d, 1)} µm`, 'a = 1,0 m', show.weg ? 'Detektor am Spalt: EIN' : '']);
        const f = flaeche(g, HALF);
        const top = 44;
        const sh = Math.min(130, h * 0.3);
        box(ctx, f.x - 3, top - 3, f.w + 6, sh + 6, '#0d1117', theme.text, 3, 2);
        ctx.fillStyle = '#9fe8c0';
        const r = n > 3000 ? 1 : 1.5;
        for (let i = 0; i < hits.length; i += 2) {
          ctx.beginPath();
          ctx.arc(f.X(hits[i]), top + 4 + hits[i + 1] * (sh - 8), r, 0, Math.PI * 2);
          ctx.fill();
        }
        label(ctx, `Schirm (Ausschnitt) · ${n} Treffer`, f.x, top - 24, { size: 11.5, color: theme.muted });
        const base = h - 52;
        const ktop = top + sh + 26;
        if (base - ktop > 30) {
          const max = Math.max(1, ...bins);
          if (show.histogramm) {
            const bw = f.w / BINS;
            ctx.fillStyle = 'rgba(31, 138, 91, 0.55)';
            for (let i = 0; i < BINS; i++) {
              const bh = (bins[i] / max) * (base - ktop);
              ctx.fillRect(f.x + i * bw + 0.5, base - bh, bw - 1, bh);
            }
            label(ctx, 'Treffer je Abschnitt', f.x + 2, ktop - 6, { size: 11.5, color: theme.muted });
          }
          if (show.verteilung) {
            const top1 = m.interferenz ? 1 : 0.5;
            ctx.beginPath();
            for (let px = 0; px <= f.w; px++) {
              const y = base - (intensitaet(f.inv(f.x + px), m) / top1) * (base - ktop);
              if (px === 0) ctx.moveTo(f.x + px, y);
              else ctx.lineTo(f.x + px, y);
            }
            ctx.strokeStyle = theme.object;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        massstab(g, f, base, 5, 'µm', cursor, top);
      }
    };
  }
};
