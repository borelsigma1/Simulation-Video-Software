/**
 * Schattenbildung mit ein oder zwei punktförmigen Lampen (Blick von oben):
 * Kernschatten, Halbschatten und beleuchtete Bereiche auf dem Schirm.
 */
import { box, disc, fmt, label, line, paper } from '../lib/engine/draw';
import { grip, Handles, point, rect } from '../lib/engine/handles';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

export interface SchattenGeo {
  /** Schatten der einzelnen Lampen auf dem Schirm [unten, oben] in cm */
  s1: [number, number];
  s2: [number, number] | null;
  kern: number;
  gesamt: number;
}

/** Lampen bei x = 0, y = ±a/2; Hindernis (Breite b) bei x = dL; Schirm bei x = dL + dS. */
export function schatten(a: number, b: number, dL: number, dS: number, zwei: boolean): SchattenGeo {
  const k = (dL + dS) / dL;
  const proj = (yl: number): [number, number] => [yl + (-b / 2 - yl) * k, yl + (b / 2 - yl) * k];
  if (!zwei) {
    const s1 = proj(0);
    return { s1, s2: null, kern: s1[1] - s1[0], gesamt: s1[1] - s1[0] };
  }
  const s1 = proj(a / 2);
  const s2 = proj(-a / 2);
  const kern = Math.max(0, Math.min(s1[1], s2[1]) - Math.max(s1[0], s2[0]));
  const gesamt = kern > 0 ? Math.max(s1[1], s2[1]) - Math.min(s1[0], s2[0]) : s1[1] - s1[0] + (s2[1] - s2[0]);
  return { s1, s2, kern, gesamt };
}

export const sim: SimDef = {
  id: 'schatten',
  title: 'Schatten',
  summary: 'Ein Hindernis vor einer oder zwei Lampen: Kern- und Halbschatten auf dem Schirm untersuchen.',
  animated: false,
  params: [
    { key: 'a', label: 'Abstand der beiden Lampen', symbol: 'a', unit: 'cm', min: 2, max: 40, step: 1, value: 16 },
    { key: 'b', label: 'Breite des Hindernisses', symbol: 'b', unit: 'cm', min: 2, max: 20, step: 1, value: 10 },
    { key: 'dL', label: 'Abstand Lampen – Hindernis', symbol: 'd_L', unit: 'cm', min: 20, max: 80, step: 1, value: 40 },
    { key: 'dS', label: 'Abstand Hindernis – Schirm', symbol: 'd_S', unit: 'cm', min: 10, max: 80, step: 1, value: 40 }
  ],
  options: [
    { key: 'zwei', label: 'Zweite Lampe eingeschaltet', value: true },
    { key: 'rand', label: 'Randstrahlen einzeichnen', value: true },
    { key: 'namen', label: 'Schattenbereiche beschriften', value: true }
  ],
  plots: [],
  hint: 'In der Zeichnung lassen sich die Lampen (nach oben und unten), das Hindernis (seitlich, an der Oberkante in der Breite) und der Schirm verschieben.',
  measures: [
    { key: 'kern', label: 'Breite des Kernschattens', symbol: 'b_K', unit: 'cm', digits: 1 },
    { key: 'gesamt', label: 'Breite des gesamten Schattens', symbol: 'b_ges', unit: 'cm', digits: 1 }
  ],

  create(env) {
    const { p, show } = env;
    const geo = () => schatten(p.a, p.b, p.dL, p.dS, show.zwei);
    const hs = new Handles();
    return {
      reset() {},
      pointer: (kind, x, y) => hs.pointer(kind, x, y),
      measure: () => ({ kern: geo().kern, gesamt: geo().gesamt }),
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const G = geo();
        const total = 160; // dargestellte Länge in cm
        const strip = 54; // Schirmansicht rechts
        const scale = Math.min((w - 70 - strip) / total, (h - 40) / 150);
        const ox = Math.max(34, (w - total * scale - strip) / 2);
        const cy = h / 2;
        const X = (cm: number) => ox + cm * scale;
        const Y = (cm: number) => cy - cm * scale;
        const xs = p.dL + p.dS;
        const lamps = show.zwei ? [p.a / 2, -p.a / 2] : [0];
        const shadows = show.zwei ? [G.s1, G.s2!] : [G.s1];
        const yMax = (h / 2 - 12) / scale;

        // Lichtkegel
        ctx.fillStyle = 'rgba(240, 169, 12, 0.13)';
        for (const yl of lamps) {
          ctx.beginPath();
          ctx.moveTo(X(0), Y(yl));
          ctx.lineTo(X(xs), Y(yMax));
          ctx.lineTo(X(xs), Y(-yMax));
          ctx.closePath();
          ctx.fill();
        }
        // Schattenräume hinter dem Hindernis (überlagert = Kernschatten)
        ctx.save();
        ctx.beginPath();
        ctx.rect(X(p.dL), 0, X(xs) - X(p.dL), h);
        ctx.clip();
        for (const s of shadows) {
          ctx.fillStyle = 'rgba(27, 36, 51, 0.3)';
          ctx.beginPath();
          ctx.moveTo(X(p.dL), Y(-p.b / 2));
          ctx.lineTo(X(xs), Y(s[0]));
          ctx.lineTo(X(xs), Y(s[1]));
          ctx.lineTo(X(p.dL), Y(p.b / 2));
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        if (show.rand)
          lamps.forEach((yl, i) => {
            const col = i === 0 ? theme.object : theme.velocity;
            for (const e of shadows[i]) line(ctx, X(0), Y(yl), X(xs), Y(e), col, 1.3);
          });

        // Hindernis, Schirm, Lampen
        box(ctx, X(p.dL) - 4, Y(p.b / 2), 8, p.b * scale, theme.text, theme.text, 2);
        label(ctx, 'Hindernis', X(p.dL), Y(p.b / 2) - 10, { align: 'center', size: 12, color: theme.muted });
        line(ctx, X(xs), 10, X(xs), h - 10, theme.text, 3);
        label(ctx, 'Schirm', X(xs) - 8, h - 14, { align: 'right', size: 12, color: theme.muted });
        lamps.forEach((yl, i) => {
          disc(ctx, X(0), Y(yl), 9, theme.light, theme.text, 1.5);
          label(ctx, show.zwei ? `L_${i + 1}` : 'L', X(0) - 14, Y(yl) + 5, { align: 'right', size: 14, bold: true });
        });

        // Anfasser
        hs.begin();
        if (env.canSet('a') && show.zwei) {
          const ha = hs.add({ dist: point(X(0), Y(p.a / 2)), radius: 16, cursor: 'ns-resize', drag: (_x, y) => env.set('a', 2 * Math.abs(cy - y) / scale) });
          hs.add({ dist: point(X(0), Y(-p.a / 2)), radius: 16, cursor: 'ns-resize', drag: (_x, y) => env.set('a', 2 * Math.abs(cy - y) / scale) });
          if (hs.isHover(ha)) grip(ctx, X(0), Y(p.a / 2) - 20, 'v', true);
        }
        if (env.canSet('b')) {
          const hb = hs.add({ dist: point(X(p.dL), Y(p.b / 2)), radius: 12, cursor: 'ns-resize', drag: (_x, y) => env.set('b', 2 * Math.abs(cy - y) / scale) });
          grip(ctx, X(p.dL), Y(p.b / 2), 'v', hs.isHover(hb));
        }
        if (env.canSet('dL')) {
          const hd = hs.add({ dist: rect(X(p.dL) - 6, Y(p.b / 2) + 10, 12, p.b * scale - 10), radius: 8, cursor: 'ew-resize', drag: (x) => env.set('dL', (x - ox) / scale) });
          grip(ctx, X(p.dL), cy, 'h', hs.isHover(hd));
        }
        if (env.canSet('dS')) {
          const hS = hs.add({ dist: rect(X(xs) - 4, 10, 8, h - 20), radius: 10, cursor: 'ew-resize', drag: (x) => env.set('dS', (x - ox) / scale - p.dL) });
          grip(ctx, X(xs), 30, 'h', hs.isHover(hS));
        }

        // Schirmansicht von vorn
        const sx = X(xs) + 16;
        box(ctx, sx, 10, strip - 16, h - 20, '#fff8dc', theme.text, 2);
        const bands: Array<[number, number, number]> = []; // [von, bis, Anzahl verdeckter Lampen]
        const edges = [...new Set(shadows.flat())].sort((u, v) => u - v);
        for (let i = 0; i < edges.length - 1; i++) {
          const mid = (edges[i] + edges[i + 1]) / 2;
          const n = shadows.filter((s) => mid > s[0] && mid < s[1]).length;
          if (n) bands.push([edges[i], edges[i + 1], n]);
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx, 10, strip - 16, h - 20);
        ctx.clip();
        for (const [lo, hi, n] of bands) {
          ctx.fillStyle = n === lamps.length ? '#1b2433' : '#8f8f86';
          ctx.fillRect(sx, Y(hi), strip - 16, (hi - lo) * scale);
        }
        ctx.restore();
        if (show.namen) {
          const tx = X(xs) - 10;
          for (const [lo, hi, n] of bands) {
            const mid = (lo + hi) / 2;
            if (Math.abs(mid) > yMax) continue;
            label(ctx, n === lamps.length ? 'Kernschatten' : 'Halbschatten', tx, Y(mid) + 4, {
              align: 'right',
              size: 12,
              bold: true,
              color: n === lamps.length ? '#fff' : theme.text
            });
          }
        }
        // Maßstab
        line(ctx, X(0), h - 8, X(20), h - 8, theme.axis, 2);
        label(ctx, `${fmt(20, 0)} cm`, X(10), h - 13, { align: 'center', size: 11, color: theme.muted });
      }
    };
  }
};
