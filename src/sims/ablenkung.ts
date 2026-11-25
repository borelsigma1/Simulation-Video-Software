/**
 * Elektronenstrahl im Querfeld eines Plattenkondensators (Braunsche Röhre):
 * gleichförmige Bewegung längs der Platten, konstant beschleunigt quer dazu.
 */
import { arrow, box, disc, fmt, label, line, paper, polyline } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

const L = 0.08; // Plattenlänge in m
const D = 0.04; // Plattenabstand in m
const S = 0.12; // Abstand Plattenende – Schirm in m
const VOR = 0.03; // Strecke vor den Platten
const EM = 1.759e11; // spezifische Ladung e/m in C/kg
const RAFFER = 4e-9; // 1 s am Bildschirm = 4 ns

export const v0von = (UB: number): number => Math.sqrt(2 * EM * UB);
/** Ablenkung am Plattenende in m. */
export const yPlatte = (UA: number, UB: number): number => (UA * L * L) / (4 * D * UB);
/** Ablenkung auf dem Schirm in m. */
export const ySchirm = (UA: number, UB: number): number => yPlatte(UA, UB) + ((UA * L) / (2 * D * UB)) * S;

export const sim: SimDef = {
  id: 'ablenkung',
  title: 'Elektronen im elektrischen Querfeld',
  summary: 'Ein Elektronenstrahl fliegt durch einen Plattenkondensator: Bahn und Ablenkung in Abhängigkeit von Beschleunigungs- und Ablenkspannung.',
  animated: true,
  playLabel: 'Elektron starten',
  thumbTime: 1.6,
  hint: 'Plattenlänge 8,0 cm, Plattenabstand 4,0 cm, Abstand Plattenende – Schirm 12 cm. Zeitlupe: Der Flug dauert in Wirklichkeit nur wenige Nanosekunden.',
  params: [
    { key: 'UB', label: 'Beschleunigungsspannung', symbol: 'U_B', unit: 'V', min: 500, max: 5000, step: 100, value: 1000 },
    { key: 'UA', label: 'Ablenkspannung', symbol: 'U_A', unit: 'V', min: -300, max: 300, step: 10, value: 150 }
  ],
  options: [
    { key: 'feld', label: 'Feldlinien', value: true },
    { key: 'kraft', label: 'Kraftpfeil', value: true },
    { key: 'komponenten', label: 'Geschwindigkeit in Komponenten', value: false },
    { key: 'spuren', label: 'Frühere Bahnen zum Vergleich behalten', value: true }
  ],
  plots: [
    { key: 'y', label: 'y(t)', xLabel: 't in ns', yLabel: 'y in cm', series: [{ label: 'Ablenkung', color: theme.object }] },
    { key: 'vy', label: 'v_y(t)', xLabel: 't in ns', yLabel: 'v_y in 10⁶ m/s', series: [{ label: 'quer zu den Platten', color: theme.velocityY }] }
  ],
  measures: [
    { key: 't', label: 'Zeit', symbol: 't', unit: 'ns', digits: 2 },
    { key: 'v0', label: 'Eintrittsgeschwindigkeit', symbol: 'v_0', unit: '10⁶ m/s', digits: 2 },
    { key: 'y1', label: 'Ablenkung am Plattenende', symbol: 'y_1', unit: 'cm', digits: 2 },
    { key: 'ys', label: 'Ablenkung auf dem Schirm', symbol: 'y_S', unit: 'cm', digits: 2 }
  ],

  create(env) {
    const { p, show } = env;
    let t = 0;
    let n = 0;
    let ende = false;
    let aufPlatte = false;
    let alt: { pts: number[]; text: string }[] = [];
    const buf = { t: [] as number[], x: [] as number[], y: [] as number[], vy: [] as number[] };
    const v0 = () => v0von(p.UB);
    const a = () => (EM * p.UA) / D;
    /** Zustand zur Zeit t; x = 0 ist der Platteneingang */
    const zustand = (zeit: number) => {
      const x = -VOR + v0() * zeit;
      const tin = Math.max(0, Math.min(zeit - VOR / v0(), L / v0()));
      const tout = Math.max(0, zeit - VOR / v0() - L / v0());
      const vy = a() * tin;
      return { x, y: 0.5 * a() * tin * tin + vy * tout, vx: v0(), vy };
    };
    const sample = () => {
      const s = zustand(t);
      buf.t.push(t * 1e9);
      buf.x.push(s.x);
      buf.y.push(s.y * 100);
      buf.vy.push(s.vy / 1e6);
    };
    const tEnde = () => (VOR + L + S) / v0();
    return {
      reset() {
        if (show.spuren && buf.x.length > 2 && ende) {
          const pts: number[] = [];
          for (let i = 0; i < buf.x.length; i++) pts.push(buf.x[i], buf.y[i] / 100);
          alt.push({ pts, text: `${fmt(p.UA, 0)} V` });
          if (alt.length > 4) alt.shift();
        }
        if (!show.spuren) alt = [];
        t = 0;
        n = 0;
        ende = false;
        aufPlatte = false;
        for (const b of Object.values(buf)) b.length = 0;
        sample();
      },
      step(dt) {
        if (ende) return;
        t += dt * RAFFER;
        const s = zustand(t);
        if (s.x >= 0 && s.x <= L && Math.abs(s.y) >= D / 2) {
          // Elektron trifft eine Platte
          aufPlatte = true;
          ende = true;
        } else if (t >= tEnde()) {
          t = tEnde();
          ende = true;
        }
        if (ende || ++n % 3 === 0) sample();
        if (ende) env.finish();
      },
      measure: () => {
        const s = zustand(t);
        return {
          t: t * 1e9,
          v0: v0() / 1e6,
          y1: s.x >= L && !aufPlatte ? yPlatte(p.UA, p.UB) * 100 : null,
          ys: ende && !aufPlatte ? ySchirm(p.UA, p.UB) * 100 : null
        };
      },
      plot(key) {
        const xRange: [number, number] = [0, tEnde() * 1e9];
        return key === 'y' ? { x: buf.t, ys: [buf.y], xRange, yRange: [-8, 8] } : { x: buf.t, ys: [buf.vy], xRange };
      },
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const total = VOR + L + S + 0.035;
        const scale = Math.min((w - 40) / total, (h - 50) / 0.17);
        const ox = (w - total * scale) / 2 + (VOR + 0.025) * scale;
        const cy = h / 2;
        const X = (m: number) => ox + m * scale;
        const Y = (m: number) => cy - m * scale;
        // Elektronenkanone
        box(ctx, X(-VOR) - 34, cy - 16, 34, 32, theme.metal, theme.text, 4, 2);
        label(ctx, 'U_B', X(-VOR) - 17, cy + 5, { align: 'center', size: 12, bold: true });
        line(ctx, X(-VOR), cy, X(L + S), cy, theme.grid, 1, [4, 4]);
        // Platten
        const oben = p.UA >= 0;
        const platte = (y: number, plus: boolean) => {
          box(ctx, X(0), y - 4, L * scale, 8, plus ? theme.plus : theme.minus, theme.text, 2, 1.5);
          if (p.UA !== 0) label(ctx, plus ? '+' : '–', X(L / 2), y + (y < cy ? -9 : 20), { align: 'center', size: 16, bold: true, color: plus ? theme.plus : theme.minus });
        };
        platte(Y(D / 2) - 4, oben);
        platte(Y(-D / 2) + 4, !oben);
        if (show.feld && p.UA !== 0) {
          const k = 3 + Math.round((Math.abs(p.UA) / 300) * 5);
          for (let i = 0; i < k; i++) {
            const x = X((L * (i + 0.5)) / k);
            const y1 = Y(D / 2) + 6;
            const y2 = Y(-D / 2) - 6;
            arrow(ctx, x, oben ? y1 : y2, x, oben ? y2 : y1, 'rgba(105, 113, 126, 0.55)', 1.2);
          }
        }
        // Schirm mit Skala
        line(ctx, X(L + S), Y(0.08), X(L + S), Y(-0.08), theme.text, 4);
        for (let c = -6; c <= 6; c += 2) {
          line(ctx, X(L + S), Y(c / 100), X(L + S) + 8, Y(c / 100), theme.axis, 1);
          label(ctx, `${c}`, X(L + S) + 12, Y(c / 100) + 4, { size: 11, color: theme.muted });
        }
        label(ctx, 'y in cm', X(L + S) + 10, Y(0.08) + 2, { size: 11, color: theme.muted });
        label(ctx, 'Schirm', X(L + S) - 6, Y(0.08) + 2, { align: 'right', size: 11, color: theme.muted });
        // frühere Bahnen
        for (const tr of alt) {
          const pts = tr.pts.map((v, i) => (i % 2 ? Y(v) : X(v)));
          polyline(ctx, pts, theme.prediction, 1.6, [5, 4]);
          label(ctx, tr.text, pts[pts.length - 2] - 8, pts[pts.length - 1] - 6, { align: 'right', size: 11, color: theme.muted });
        }
        const pts: number[] = [];
        for (let i = 0; i < buf.x.length; i++) pts.push(X(buf.x[i]), Y(buf.y[i] / 100));
        polyline(ctx, pts, theme.object, 2.5);
        const s = zustand(t);
        const ex = X(s.x);
        const ey = Y(s.y);
        const imFeld = s.x >= 0 && s.x <= L && !ende;
        if (show.kraft && imFeld && p.UA !== 0) {
          const len = 16 + (Math.abs(p.UA) / 300) * 40;
          arrow(ctx, ex, ey, ex, ey - Math.sign(p.UA) * len, theme.force, 3);
          label(ctx, 'F_el', ex + 8, ey - Math.sign(p.UA) * len * 0.6, { size: 12, bold: true, color: theme.force });
        }
        if (show.komponenten && !ende) {
          const k = 60 / v0();
          arrow(ctx, ex, ey, ex + s.vx * k, ey, theme.velocityX, 2.2);
          arrow(ctx, ex, ey, ex, ey - s.vy * k, theme.velocityY, 2.2);
          arrow(ctx, ex, ey, ex + s.vx * k, ey - s.vy * k, theme.velocity, 2.6);
        }
        disc(ctx, ex, ey, 6, theme.minus, theme.text, 1.5);
        if (aufPlatte) label(ctx, 'Das Elektron trifft die Platte.', X(L / 2), Y(-D / 2) + 46, { align: 'center', size: 12.5, bold: true, color: theme.force });
        else if (ende) label(ctx, `y_S = ${fmt(ySchirm(p.UA, p.UB) * 100, 2)} cm`, X(L + S) - 10, ey - 10, { align: 'right', size: 12.5, bold: true });
      }
    };
  }
};
