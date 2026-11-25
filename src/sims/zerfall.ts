/**
 * Radioaktiver Zerfall als Zufallsprozess: Jeder Kern zerfällt unabhängig
 * von den anderen mit derselben Wahrscheinlichkeit pro Zeit. Gezählt wird,
 * wie viele Kerne noch nicht zerfallen sind.
 */
import { box, fmt, label, line, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

const RAFFER = 10;
const DAUER = 6; // dargestellte Zeit in Halbwertszeiten

/** Erwartete Zahl unzerfallener Kerne nach dem Zerfallsgesetz. */
export const erwartet = (N0: number, T: number, t: number): number => N0 * Math.pow(0.5, t / T);

export const sim: SimDef = {
  id: 'zerfall',
  title: 'Radioaktiver Zerfall',
  summary: 'Viele Kerne, jeder zerfällt zufällig: Zerfallskurve aufnehmen, Halbwertszeit bestimmen, Zufall und Gesetz vergleichen.',
  animated: true,
  playLabel: 'Messung starten',
  thumbTime: 4,
  hint: `Zeitraffer: Eine Sekunde am Bildschirm entspricht ${RAFFER} Sekunden im Versuch. Jeder Durchlauf fällt etwas anders aus.`,
  params: [
    { key: 'N0', label: 'Anzahl der Kerne am Anfang', symbol: 'N_0', unit: '', min: 20, max: 1000, step: 20, value: 400 },
    { key: 'T', label: 'Halbwertszeit', symbol: 'T_½', unit: 's', min: 10, max: 200, step: 1, value: 56 }
  ],
  presets: [
    { name: 'Radon-220', values: { T: 56 } },
    { name: 'Barium-137m', values: { T: 153 } },
    { name: 'Polonium-218', values: { T: 186 } }
  ],
  options: [
    { key: 'gesetz', label: 'Kurve des Zerfallsgesetzes einblenden', value: false },
    { key: 'halb', label: 'Halbwertszeiten markieren', value: false },
    { key: 'ordnen', label: 'Zerfallene Kerne nach unten sortieren', value: false }
  ],
  plots: [
    {
      key: 'N',
      label: 'N(t)',
      xLabel: 't in s',
      yLabel: 'N',
      series: [
        { label: 'gezählt', color: theme.object },
        { label: 'Zerfallsgesetz', color: theme.velocity }
      ]
    },
    { key: 'A', label: 'A(t)', xLabel: 't in s', yLabel: 'A in 1/s', series: [{ label: 'Aktivität (Mittel über 10 s)', color: theme.acceleration }] },
    {
      key: 'ln',
      label: 'ln N(t)',
      xLabel: 't in s',
      yLabel: 'ln N',
      series: [
        { label: 'gezählt', color: theme.object },
        { label: 'Zerfallsgesetz', color: theme.velocity }
      ]
    }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 's', digits: 0 },
    { key: 'N', label: 'noch nicht zerfallene Kerne', symbol: 'N', unit: '', digits: 0 },
    { key: 'A', label: 'Aktivität (Mittel über die letzten 10 s)', symbol: 'A', unit: '1/s', digits: 1 },
    { key: 'lnN', label: 'ln N', symbol: 'ln N', unit: '', digits: 2, readout: false }
  ],

  create(env) {
    const { p, show } = env;
    let t = 0;
    let n = 0;
    /** Zerfallszeitpunkt jedes Kerns (Reihenfolge = Platz im Raster) */
    let zeiten: number[] = [];
    /** dieselben Zeiten, aufsteigend sortiert */
    let sortiert: number[] = [];
    let zerfallen = 0;
    const buf = { t: [] as number[], N: [] as number[], A: [] as number[], ln: [] as number[] };
    const anzahl = () => zeiten.length - zerfallen;
    const bis = (zeit: number) => {
      // Anzahl der Zerfälle bis zum Zeitpunkt `zeit`
      let lo = 0;
      let hi = sortiert.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sortiert[mid] <= zeit) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    const aktivitaet = () => (t <= 0 ? null : (bis(t) - bis(Math.max(0, t - 10))) / Math.min(10, t));
    const sample = () => {
      const N = anzahl();
      buf.t.push(t);
      buf.N.push(N);
      buf.A.push(aktivitaet() ?? NaN);
      buf.ln.push(N > 0 ? Math.log(N) : NaN);
    };
    return {
      reset() {
        t = 0;
        n = 0;
        zerfallen = 0;
        const lambda = Math.LN2 / p.T;
        zeiten = Array.from({ length: Math.round(p.N0) }, () => -Math.log(1 - Math.random()) / lambda);
        sortiert = [...zeiten].sort((a, b) => a - b);
        for (const a of Object.values(buf)) a.length = 0;
        sample();
      },
      step(dt) {
        t += dt * RAFFER;
        zerfallen = bis(t);
        if (++n % 12 === 0) sample();
        if (t >= DAUER * p.T || zerfallen >= zeiten.length) {
          sample();
          env.finish();
        }
      },
      measure: () => {
        const N = anzahl();
        return { t, N, A: aktivitaet(), lnN: N > 0 ? Math.log(N) : null };
      },
      plot(key) {
        const xRange: [number, number] = [0, DAUER * p.T];
        const gesetz = buf.t.map((x) => (show.gesetz ? erwartet(zeiten.length, p.T, x) : NaN));
        if (key === 'A') return { x: buf.t, ys: [buf.A], xRange };
        if (key === 'ln') return { x: buf.t, ys: [buf.ln, gesetz.map((v) => Math.log(v))], xRange, yRange: [0, Math.log(zeiten.length) * 1.08] };
        return { x: buf.t, ys: [buf.N, gesetz], xRange, yRange: [0, zeiten.length * 1.05] };
      },
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h);
        const N0 = zeiten.length;
        const rechts = Math.min(210, w * 0.3);
        const fw = w - rechts - 36;
        const fh = h - 36;
        // Raster so wählen, dass die Zellen etwa quadratisch sind
        const cols = Math.max(1, Math.ceil(Math.sqrt((N0 * fw) / fh)));
        const rows = Math.ceil(N0 / cols);
        const cell = Math.min(fw / cols, fh / rows);
        const ox = 18 + (fw - cols * cell) / 2;
        const oy = 18 + (fh - rows * cell) / 2;
        box(ctx, ox - 8, oy - 8, cols * cell + 16, rows * cell + 16, '#fff8ec', theme.text, 6, 2);
        const r = Math.max(1.5, cell * 0.36);
        const zeichne = (i: number, weg: boolean, frisch: boolean) => {
          const cx = ox + ((i % cols) + 0.5) * cell;
          const cy = oy + (Math.floor(i / cols) + 0.5) * cell;
          ctx.beginPath();
          ctx.arc(cx, cy, frisch ? r * 1.5 : r, 0, Math.PI * 2);
          ctx.fillStyle = frisch ? theme.light : weg ? theme.grid : theme.object;
          ctx.fill();
        };
        if (show.ordnen) {
          const rest = anzahl();
          for (let i = 0; i < N0; i++) zeichne(i, i >= rest, false);
        } else {
          for (let i = 0; i < N0; i++) {
            const weg = zeiten[i] <= t;
            zeichne(i, weg, weg && t - zeiten[i] < 2.5 && env.isRunning());
          }
        }

        // Zähler
        const zx = w - rechts / 2 - 8;
        box(ctx, zx - rechts / 2 + 8, 18, rechts - 16, 96, '#e3e6ea', theme.text, 6, 2);
        label(ctx, 'noch nicht zerfallen', zx, 38, { align: 'center', size: 12, color: theme.muted });
        box(ctx, zx - 60, 48, 120, 34, '#16261f', theme.text, 3);
        ctx.font = `600 22px ${theme.mono}`;
        ctx.fillStyle = '#b6f2c9';
        ctx.textAlign = 'right';
        ctx.fillText(`${anzahl()}`, zx + 50, 73);
        label(ctx, `t = ${fmt(t, 0)} s`, zx, 102, { align: 'center', size: 13, bold: true });

        // Legende und Halbwertszeiten
        let y = 138;
        const punkt = (color: string, text: string) => {
          ctx.beginPath();
          ctx.arc(zx - rechts / 2 + 22, y - 4, 6, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          label(ctx, text, zx - rechts / 2 + 36, y, { size: 12 });
          y += 20;
        };
        punkt(theme.object, 'Kern, noch nicht zerfallen');
        punkt(theme.light, 'zerfällt gerade');
        punkt(theme.gridStrong, 'zerfallen');
        if (show.halb) {
          y += 8;
          const bw = rechts - 40;
          const bx = zx - bw / 2;
          label(ctx, 'vergangene Halbwertszeiten', bx, y, { size: 12, color: theme.muted });
          y += 10;
          box(ctx, bx, y, bw, 12, theme.bg, theme.text, 2, 1.2);
          ctx.fillStyle = theme.velocity;
          ctx.fillRect(bx, y, Math.min(1, t / (DAUER * p.T)) * bw, 12);
          for (let k = 1; k < DAUER; k++) line(ctx, bx + (k / DAUER) * bw, y - 3, bx + (k / DAUER) * bw, y + 15, theme.text, 1.2);
          label(ctx, fmt(t / p.T, 1), zx, y + 32, { align: 'center', size: 14, bold: true, color: theme.velocity });
        }
      }
    };
  }
};
