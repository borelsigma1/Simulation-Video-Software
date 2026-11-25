/**
 * Zentraler Stoß zweier Wagen auf der Luftkissenbahn (elastisch oder
 * vollkommen unelastisch). Impuls und Bewegungsenergie vor und nach dem Stoß.
 */
import { arrow, box, disc, fmt, label, line, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

const BAHN = 2.4; // Länge der Bahn in m
const BREITE = 0.2; // Wagenlänge in m

/** Geschwindigkeiten nach dem zentralen Stoß. */
export function nachStoss(m1: number, v1: number, m2: number, v2: number, elastisch: boolean): [number, number] {
  const vs = (m1 * v1 + m2 * v2) / (m1 + m2);
  return elastisch ? [2 * vs - v1, 2 * vs - v2] : [vs, vs];
}

export const sim: SimDef = {
  id: 'stoss',
  title: 'Stöße auf der Luftkissenbahn',
  summary: 'Zwei Wagen stoßen zusammen: Massen und Geschwindigkeiten einstellen, Impuls und Bewegungsenergie vor und nach dem Stoß vergleichen.',
  animated: true,
  playLabel: 'Starten',
  thumbTime: 0.45,
  hint: 'Geschwindigkeiten nach rechts sind positiv, nach links negativ. Die Bahn ist reibungsfrei.',
  params: [
    {
      key: 'art',
      label: 'Art des Stoßes',
      unit: '',
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      choices: [
        { value: 0, label: 'elastisch (Federpuffer)' },
        { value: 1, label: 'unelastisch (Wagen koppeln)' }
      ]
    },
    { key: 'm1', label: 'Masse Wagen 1', symbol: 'm_1', unit: 'kg', min: 0.1, max: 2, step: 0.1, value: 0.5 },
    { key: 'v1', label: 'Geschwindigkeit Wagen 1', symbol: 'v_1', unit: 'm/s', min: 0, max: 2, step: 0.1, value: 1 },
    { key: 'm2', label: 'Masse Wagen 2', symbol: 'm_2', unit: 'kg', min: 0.1, max: 2, step: 0.1, value: 0.5 },
    { key: 'v2', label: 'Geschwindigkeit Wagen 2', symbol: 'v_2', unit: 'm/s', min: -2, max: 1, step: 0.1, value: 0 }
  ],
  options: [
    { key: 'v', label: 'Geschwindigkeitspfeile', value: true },
    { key: 'p', label: 'Impulse als Balken', value: true },
    { key: 'schwerpunkt', label: 'Schwerpunkt markieren', value: false }
  ],
  plots: [
    {
      key: 'p',
      label: 'p(t)',
      xLabel: 't in s',
      yLabel: 'p in kg·m/s',
      series: [
        { label: 'Wagen 1', color: theme.object },
        { label: 'Wagen 2', color: theme.velocity },
        { label: 'Summe', color: theme.text }
      ]
    },
    {
      key: 'E',
      label: 'E_kin(t)',
      xLabel: 't in s',
      yLabel: 'E_kin in J',
      series: [
        { label: 'Wagen 1', color: theme.object },
        { label: 'Wagen 2', color: theme.velocity },
        { label: 'Summe', color: theme.text }
      ]
    }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 's', digits: 2 },
    { key: 'u1', label: 'Geschwindigkeit Wagen 1 nach dem Stoß', symbol: 'u_1', unit: 'm/s', digits: 2 },
    { key: 'u2', label: 'Geschwindigkeit Wagen 2 nach dem Stoß', symbol: 'u_2', unit: 'm/s', digits: 2 },
    { key: 'pges', label: 'Gesamtimpuls (aktuell)', symbol: 'p_ges', unit: 'kg·m/s', digits: 2 },
    { key: 'Ekin', label: 'gesamte Bewegungsenergie (aktuell)', symbol: 'E_kin', unit: 'J', digits: 3 }
  ],

  create(env) {
    const { p, show } = env;
    let t = 0;
    let x1 = 0;
    let x2 = 0;
    let w1 = 0;
    let w2 = 0;
    let hit = false;
    let n = 0;
    const buf = { t: [] as number[], p1: [] as number[], p2: [] as number[], ps: [] as number[], e1: [] as number[], e2: [] as number[], es: [] as number[] };
    const sample = () => {
      const p1 = p.m1 * w1;
      const p2 = p.m2 * w2;
      const e1 = 0.5 * p.m1 * w1 * w1;
      const e2 = 0.5 * p.m2 * w2 * w2;
      buf.t.push(t);
      buf.p1.push(p1);
      buf.p2.push(p2);
      buf.ps.push(p1 + p2);
      buf.e1.push(e1);
      buf.e2.push(e2);
      buf.es.push(e1 + e2);
    };
    return {
      reset() {
        t = 0;
        n = 0;
        hit = false;
        x1 = 0.55;
        x2 = 1.45;
        w1 = p.v1;
        w2 = p.v2;
        for (const a of Object.values(buf)) a.length = 0;
        sample();
      },
      step(dt) {
        t += dt;
        x1 += w1 * dt;
        x2 += w2 * dt;
        if (!hit && x2 - x1 <= BREITE && w1 > w2) {
          x2 = x1 + BREITE;
          sample();
          [w1, w2] = nachStoss(p.m1, w1, p.m2, w2, p.art === 0);
          hit = true;
          sample();
        } else if (++n % 6 === 0) sample();
        const raus = x1 < BREITE / 2 || x2 > BAHN - BREITE / 2 || x2 < BREITE * 1.5 || x1 > BAHN - BREITE * 1.5;
        if (raus || t > 8 || (Math.abs(w1) < 1e-9 && Math.abs(w2) < 1e-9 && t > 1.5)) {
          sample();
          env.finish();
        }
      },
      measure: () => ({
        t,
        u1: hit ? w1 : null,
        u2: hit ? w2 : null,
        pges: p.m1 * w1 + p.m2 * w2,
        Ekin: 0.5 * p.m1 * w1 * w1 + 0.5 * p.m2 * w2 * w2
      }),
      plot(key) {
        const xRange: [number, number] = [0, Math.max(2, Math.ceil(t))];
        return key === 'p' ? { x: buf.t, ys: [buf.p1, buf.p2, buf.ps], xRange } : { x: buf.t, ys: [buf.e1, buf.e2, buf.es], xRange };
      },
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const scale = (w - 60) / BAHN;
        const ox = 30;
        const X = (m: number) => ox + m * scale;
        const rail = Math.min(h * 0.5, 190);
        // Bahn
        box(ctx, X(0) - 6, rail, BAHN * scale + 12, 12, theme.metal, theme.text, 3, 1.5);
        line(ctx, X(0) + 20, rail + 12, X(0) + 20, rail + 34, theme.text, 3);
        line(ctx, X(BAHN) - 20, rail + 12, X(BAHN) - 20, rail + 34, theme.text, 3);
        for (let m = 0; m <= BAHN + 1e-9; m += 0.2) {
          line(ctx, X(m), rail + 12, X(m), rail + (Math.round(m * 10) % 10 === 0 ? 22 : 17), theme.axis, 1);
          if (Math.round(m * 10) % 10 === 0) label(ctx, `${fmt(m, 0)} m`, X(m), rail + 36, { align: 'center', size: 11, color: theme.muted });
        }
        const wagen = (x: number, m: number, v: number, color: string, dark: string, name: string) => {
          const bw = BREITE * scale;
          const bh = 26 + 22 * Math.sqrt(m / 2);
          const cx = X(x);
          box(ctx, cx - bw / 2, rail - bh - 4, bw, bh, color, dark, 4, 2);
          box(ctx, cx - bw / 2 - 3, rail - 5, bw + 6, 5, theme.text, undefined, 2);
          label(ctx, name, cx, rail - bh / 2 - 6, { align: 'center', size: 13, bold: true, color: '#fff' });
          label(ctx, `${fmt(m, 1)} kg`, cx, rail - bh / 2 + 8, { align: 'center', size: 11, color: '#fff' });
          if (show.v && Math.abs(v) > 0.01) {
            const y = rail - bh - 18;
            arrow(ctx, cx, y, cx + v * 55, y, dark, 3);
            label(ctx, `${fmt(v, 2)} m/s`, cx + v * 27, y - 8, { align: 'center', size: 12, bold: true, color: dark });
          }
        };
        // Puffer bzw. Kupplung
        if (p.art === 0) {
          const a = X(x1 + BREITE / 2);
          const b = Math.min(X(x2 - BREITE / 2), a + 16);
          line(ctx, a, rail - 22, b, rail - 22, theme.spring, 2);
          disc(ctx, b, rail - 22, 4, theme.bg, theme.spring, 2);
        } else {
          disc(ctx, X(x1 + BREITE / 2) + 3, rail - 22, 4, theme.light, theme.text, 1.5);
          disc(ctx, X(x2 - BREITE / 2) - 3, rail - 22, 4, theme.light, theme.text, 1.5);
        }
        wagen(x1, p.m1, w1, theme.object, theme.objectDark, '1');
        wagen(x2, p.m2, w2, theme.velocity, '#123f85', '2');
        if (show.schwerpunkt) {
          const xs = (p.m1 * x1 + p.m2 * x2) / (p.m1 + p.m2);
          line(ctx, X(xs), rail - 90, X(xs), rail + 12, theme.acceleration, 1.5, [4, 4]);
          label(ctx, 'S', X(xs), rail - 96, { align: 'center', size: 12, bold: true, color: theme.acceleration });
        }
        label(ctx, hit ? 'nach dem Stoß' : 'vor dem Stoß', w - 16, 24, { align: 'right', size: 13, bold: true, color: hit ? theme.acceleration : theme.muted });

        // Impulsbalken
        if (show.p) {
          const top = rail + 58;
          const mid = w / 2;
          const k = Math.min(60, (w / 2 - 110) / 4); // Pixel je kg·m/s
          const rows: [string, number, string][] = [
            ['p_1', p.m1 * w1, theme.object],
            ['p_2', p.m2 * w2, theme.velocity],
            ['p_ges', p.m1 * w1 + p.m2 * w2, theme.text]
          ];
          line(ctx, mid, top - 6, mid, top + rows.length * 26, theme.axis, 1.5);
          rows.forEach(([name, val, color], i) => {
            const y = top + i * 26;
            ctx.fillStyle = color;
            ctx.fillRect(Math.min(mid, mid + val * k), y, Math.abs(val * k), 16);
            label(ctx, name, mid - Math.max(0, -val * k) - 10, y + 13, { align: 'right', size: 12, bold: true, color });
            label(ctx, `${fmt(val, 2)} kg·m/s`, mid + Math.max(0, val * k) + 10, y + 13, { size: 12, color: theme.text });
          });
        }
      }
    };
  }
};
