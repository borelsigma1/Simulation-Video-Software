/**
 * Dehnung einer Feder (oder eines Gummibands) durch angehängte Massestücke.
 * Die weiche Feder verlässt bei großer Kraft den Hooke'schen Bereich.
 */
import { box, fmt, hatch, label, line, paper, spring, arrow } from '../lib/engine/draw';
import { Handles, rect } from '../lib/engine/handles';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

const STUECK = 0.05; // Masse eines Massestücks in kg

/** Dehnung in cm zur Kraft F in N. */
export function dehnung(art: number, F: number): number {
  if (art === 0) return (F / 12) * 100 + (F > 3 ? 2.2 * (F - 3) ** 2 : 0); // weiche Feder, D = 12 N/m, überdehnt ab 3 N
  if (art === 1) return (F / 30) * 100; // harte Feder, D = 30 N/m
  return 2.2 * F + 1.1 * F * F; // Gummiband
}

export const sim: SimDef = {
  id: 'hooke',
  title: 'Kraft und Dehnung',
  summary: 'Massestücke an eine Feder oder ein Gummiband hängen und untersuchen, wie die Dehnung von der Kraft abhängt.',
  animated: false,
  params: [
    {
      key: 'art',
      label: 'Aufhängung',
      unit: '',
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      choices: [
        { value: 0, label: 'weiche Feder' },
        { value: 1, label: 'harte Feder' },
        { value: 2, label: 'Gummiband' }
      ]
    },
    { key: 'n', label: 'Anzahl der Massestücke (je 50 g)', symbol: 'n', unit: '', min: 0, max: 10, step: 1, value: 2 },
    { key: 'g', label: 'Ortsfaktor', symbol: 'g', unit: 'N/kg', min: 1, max: 12, step: 0.01, value: 9.81 }
  ],
  presets: [
    { name: 'Erde', values: { g: 9.81 } },
    { name: 'Mond', values: { g: 1.62 } },
    { name: 'Mars', values: { g: 3.71 } }
  ],
  options: [
    { key: 'kraft', label: 'Gewichtskraft als Pfeil', value: true },
    { key: 'lineal', label: 'Dehnung am Lineal markieren', value: true }
  ],
  plots: [],
  hint: 'Tippe auf den Vorrat links, um ein Massestück anzuhängen, und auf die angehängten Stücke, um eines abzunehmen.',
  measures: [
    { key: 'masse', label: 'angehängte Masse', symbol: 'm', unit: 'g', digits: 0 },
    { key: 'F', label: 'Gewichtskraft der Massestücke', symbol: 'F', unit: 'N', digits: 2 },
    { key: 's', label: 'Dehnung', symbol: 's', unit: 'cm', digits: 1 }
  ],

  create(env) {
    const { p, show } = env;
    const F = () => p.n * STUECK * p.g;
    const s = () => dehnung(p.art, F());
    const hs = new Handles();
    return {
      reset() {},
      pointer: (kind, x, y) => hs.pointer(kind, x, y),
      measure: () => ({ masse: p.n * 50, F: F(), s: s() }),
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const cx = w * 0.4;
        const ceil = 26;
        hatch(ctx, cx - 100, 0, 200, ceil);
        line(ctx, cx - 100, ceil, cx + 100, ceil, theme.text, 2);

        const L0 = Math.min(90, h * 0.2); // ungedehnte Länge in Pixeln
        const cm = (h - ceil - L0 - 150) / 55; // Pixel pro cm Dehnung
        const end = ceil + L0 + s() * cm;
        if (p.art === 2) {
          line(ctx, cx - 3, ceil, cx - 3, end, '#b4552d', 2.5);
          line(ctx, cx + 3, ceil, cx + 3, end, '#b4552d', 2.5);
        } else spring(ctx, cx, ceil, cx, end, p.art === 0 ? 16 : 11, p.art === 0 ? 13 : 10);

        // Haken und Massestücke
        line(ctx, cx, end, cx, end + 12, theme.text, 2);
        const ph = Math.min(11, (h - end - 30) / Math.max(p.n, 1));
        for (let i = 0; i < p.n; i++) box(ctx, cx - 22, end + 12 + i * ph, 44, ph - 1.5, theme.metal, theme.text, 2, 1.5);
        if (p.n === 0) label(ctx, 'unbelastet', cx + 16, end + 16, { size: 12, color: theme.muted });

        // Vorrat an Massestücken auf dem Tisch: antippen hängt eines an
        hs.begin();
        if (env.canSet('n')) {
          const tx = cx - 190;
          const ty = h - 22;
          line(ctx, tx - 40, ty, tx + 40, ty, theme.text, 2);
          const rest = 10 - p.n;
          for (let i = 0; i < rest; i++) box(ctx, tx - 22, ty - (i + 1) * 10, 44, 8.5, theme.metal, theme.text, 2, 1.5);
          const hov = hs.isHover(hs.add({ dist: rect(tx - 30, ty - Math.max(rest, 1) * 10 - 22, 60, Math.max(rest, 1) * 10 + 22), radius: 4, cursor: 'pointer', drag() {}, tap: () => env.set('n', p.n + 1) }));
          label(ctx, rest ? '+ anhängen' : 'Vorrat leer', tx, ty - rest * 10 - 8, { align: 'center', size: 12, bold: hov, color: hov ? theme.object : theme.muted });
          if (p.n > 0) {
            const hb = hs.add({ dist: rect(cx - 24, end + 12, 48, p.n * ph), radius: 4, cursor: 'pointer', drag() {}, tap: () => env.set('n', p.n - 1) });
            if (hs.isHover(hb)) label(ctx, '− abnehmen', cx + 30, end + 12 + (p.n * ph) / 2 + 4, { size: 12, bold: true, color: theme.object });
          }
        }

        if (show.kraft && p.n > 0) {
          const len = Math.min(110, 22 * F());
          const ay = end + 12 + (p.n * ph) / 2;
          arrow(ctx, cx - 44, ay, cx - 44, ay + len, theme.force, 3);
          label(ctx, `F = ${fmt(F(), 2)} N`, cx - 52, ay + len / 2 + 4, { align: 'right', color: theme.force, bold: true, size: 13 });
        }

        // Lineal (Nullpunkt am unbelasteten Federende)
        const rx = cx + 120;
        const y0 = ceil + L0;
        box(ctx, rx, y0 - 10, 46, 55 * cm + 20, '#f6e7b4', theme.text, 2, 1.5);
        for (let c = 0; c <= 55; c++) {
          const yy = y0 + c * cm;
          const big = c % 10 === 0;
          if (cm > 3.2 || c % 5 === 0) line(ctx, rx, yy, rx + (big ? 16 : c % 5 === 0 ? 11 : 6), yy, theme.text, big ? 1.4 : 0.8);
          if (big) label(ctx, `${c}`, rx + 20, yy + 4, { size: 11.5 });
        }
        label(ctx, 'cm', rx + 23, y0 + 55 * cm + 24, { size: 11, color: theme.muted, align: 'center' });
        line(ctx, cx - 60, y0, rx, y0, theme.prediction, 1.2, [5, 5]);
        if (show.lineal) {
          line(ctx, cx + 26, end, rx, end, theme.velocity, 1.5, [4, 3]);
          label(ctx, `s = ${fmt(s(), 1)} cm`, rx + 54, end + 4, { size: 13, bold: true, color: theme.velocity });
        }
      }
    };
  }
};
