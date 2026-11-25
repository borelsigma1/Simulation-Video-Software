/**
 * Kennlinie eines Bauteils: Spannung einstellen, Stromstärke ablesen.
 * Zur Wahl stehen ein Konstantandraht (Ohm'scher Widerstand) und eine
 * Glühlampe, deren Widerstand mit der Temperatur des Glühdrahts zunimmt.
 */
import { box, disc, fmt, label, line, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

/** Stromstärke in A. Glühlampe: Nennwerte 6 V / 0,40 A. */
export function stromstaerke(bauteil: number, U: number, R: number): number {
  if (bauteil === 0) return U / R;
  return 0.4 * Math.pow(U / 6, 0.55);
}

export const sim: SimDef = {
  id: 'kennlinie',
  title: 'Kennlinie: Widerstand und Glühlampe',
  summary: 'Spannung verändern, Stromstärke messen und die I-U-Kennlinie eines Drahts mit der einer Glühlampe vergleichen.',
  animated: false,
  hint: 'Jede eingestellte Spannung wird als Messpunkt ins Diagramm übernommen. Ein Wechsel des Bauteils löscht die Punkte.',
  params: [
    {
      key: 'bauteil',
      label: 'Bauteil',
      unit: '',
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      choices: [
        { value: 0, label: 'Konstantandraht' },
        { value: 1, label: 'Glühlampe' }
      ]
    },
    { key: 'U', label: 'Spannung der Quelle', symbol: 'U', unit: 'V', min: 0, max: 12, step: 0.5, value: 3 },
    { key: 'R', label: 'Widerstand des Drahts', symbol: 'R', unit: 'Ω', min: 10, max: 100, step: 5, value: 30 }
  ],
  options: [{ key: 'richtung', label: 'Technische Stromrichtung einzeichnen', value: false }],
  plots: [
    { key: 'IU', label: 'I(U)', xLabel: 'U in V', yLabel: 'I in A', series: [{ label: 'Messpunkte', color: theme.object }] }
  ],
  measures: [{ key: 'I', label: 'Stromstärke', symbol: 'I', unit: 'A', digits: 3 }],

  create(env) {
    const { p, show } = env;
    const pts = new Map<number, number>();
    const I = () => stromstaerke(p.bauteil, p.U, p.R);
    const note = () => pts.set(p.U, I());
    return {
      reset() {
        pts.clear();
        note();
      },
      update(key) {
        if (key !== 'U') pts.clear();
        note();
      },
      measure: () => ({ I: I() }),
      plot() {
        const xs = [...pts.keys()].sort((a, b) => a - b);
        return { x: xs, ys: [xs.map((u) => pts.get(u)!)], xRange: [0, 12.5], markers: true };
      },
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h, true);
        const l = w * 0.14;
        const r = w * 0.86;
        const top = h * 0.3;
        const bot = h * 0.82;
        const cx = (l + r) / 2;
        const i = I();

        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 2;
        ctx.strokeRect(l, top, r - l, bot - top);

        // Quelle (links)
        const qy = (top + bot) / 2;
        box(ctx, l - 30, qy - 34, 60, 68, theme.bg, theme.text, 5, 2);
        label(ctx, 'Netzgerät', l + 38, qy + 4, { size: 12, color: theme.muted });
        ctx.font = `600 15px ${theme.mono}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.text;
        ctx.fillText(`${fmt(p.U, 1)} V`, l, qy + 5);
        label(ctx, '+', l - 16, qy - 16, { size: 14, bold: true, color: theme.plus });
        label(ctx, '–', l - 16, qy + 26, { size: 14, bold: true, color: theme.minus });

        const meter = (x: number, y: number, name: string, text: string) => {
          disc(ctx, x, y, 21, theme.bg, theme.text, 2);
          label(ctx, name, x, y + 6, { align: 'center', size: 17, bold: true });
          box(ctx, x - 44, y + 27, 88, 24, '#16261f', theme.text, 3);
          ctx.font = `600 14px ${theme.mono}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#b6f2c9';
          ctx.fillText(text, x, y + 44);
        };

        // Bauteil (oben Mitte) mit Spannungsmesser darüber
        const bw = Math.min(120, w * 0.2);
        if (p.bauteil === 0) {
          box(ctx, cx - bw / 2, top - 13, bw, 26, theme.bg, theme.text, 2, 2);
          label(ctx, `R = ${fmt(p.R, 0)} Ω`, cx, top + 34, { align: 'center', size: 12, color: theme.muted });
        } else {
          const rel = Math.min(1, (p.U * i) / (12 * stromstaerke(1, 12, 0)));
          if (rel > 0.01) {
            const glow = ctx.createRadialGradient(cx, top, 6, cx, top, 26 + 70 * rel);
            glow.addColorStop(0, `rgba(240,169,12,${0.25 + 0.6 * rel})`);
            glow.addColorStop(1, 'rgba(240,169,12,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(cx - 110, top - 110, 220, 220);
          }
          disc(ctx, cx, top, 19, rel > 0.01 ? `rgba(255,215,94,${0.35 + 0.65 * rel})` : theme.bg, theme.text, 2);
          line(ctx, cx - 13, top - 13, cx + 13, top + 13, theme.text, 2);
          line(ctx, cx - 13, top + 13, cx + 13, top - 13, theme.text, 2);
          disc(ctx, cx, top, 19, 'rgba(0,0,0,0)', theme.text, 2);
        }
        const vy = top - Math.min(86, h * 0.2);
        const vx1 = cx - bw / 2 - 26;
        const vx2 = cx + bw / 2 + 26;
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(vx1, top);
        ctx.lineTo(vx1, vy);
        ctx.lineTo(vx2, vy);
        ctx.lineTo(vx2, top);
        ctx.stroke();
        disc(ctx, vx1, top, 3.5, theme.text);
        disc(ctx, vx2, top, 3.5, theme.text);
        disc(ctx, cx, vy, 21, theme.bg, theme.text, 2);
        label(ctx, 'V', cx, vy + 6, { align: 'center', size: 17, bold: true });
        label(ctx, `${fmt(p.U, 2)} V`, cx, vy + 40, { align: 'center', size: 13, bold: true });

        // Strommesser (unten Mitte)
        meter(cx, bot, 'A', `${fmt(i, 3)} A`);

        if (show.richtung && i > 0) {
          const ax = l + (cx - bw / 2 - l) * 0.5;
          ctx.fillStyle = theme.force;
          ctx.beginPath();
          ctx.moveTo(ax + 9, top);
          ctx.lineTo(ax - 7, top - 7);
          ctx.lineTo(ax - 7, top + 7);
          ctx.fill();
          label(ctx, 'I', ax, top - 14, { align: 'center', color: theme.force, bold: true, size: 14 });
        }
      }
    };
  }
};
