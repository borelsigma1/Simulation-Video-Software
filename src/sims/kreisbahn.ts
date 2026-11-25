/**
 * Fadenstrahlrohr: Elektronen im homogenen Magnetfeld der Helmholtzspulen.
 * Aus dem Bahndurchmesser lässt sich die spezifische Ladung e/m bestimmen.
 */
import { arrow, box, disc, fmt, label, line, paper } from '../lib/engine/draw';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

const EM = 1.759e11; // C/kg
const KOLBEN = 0.085; // Radius des Glaskolbens in m

/** Bahnradius in m. */
export const bahnradius = (UB: number, BmT: number): number => Math.sqrt((2 * UB) / EM) / (BmT * 1e-3);

export const sim: SimDef = {
  id: 'kreisbahn',
  title: 'Fadenstrahlrohr',
  summary: 'Elektronen auf der Kreisbahn im Magnetfeld: Bahndurchmesser messen und daraus die spezifische Ladung e/m bestimmen.',
  animated: true,
  playLabel: 'Strahl einschalten',
  thumbTime: 4,
  hint: 'Das Magnetfeld zeigt aus der Zeichenebene heraus (Punkte). Der Durchmesser wird an der Messleiste abgelesen.',
  params: [
    { key: 'UB', label: 'Beschleunigungsspannung', symbol: 'U_B', unit: 'V', min: 100, max: 300, step: 5, value: 200, live: true },
    { key: 'B', label: 'Magnetische Flussdichte', symbol: 'B', unit: 'mT', min: 0.5, max: 2, step: 0.05, value: 1, live: true }
  ],
  options: [
    { key: 'feld', label: 'Magnetfeld anzeigen', value: true },
    { key: 'kraft', label: 'Lorentzkraft und Geschwindigkeit', value: true },
    { key: 'leiste', label: 'Messleiste', value: true }
  ],
  plots: [],
  measures: [
    { key: 'd', label: 'Bahndurchmesser (Messleiste)', symbol: 'd', unit: 'cm', digits: 1 },
    { key: 'v', label: 'Geschwindigkeit der Elektronen', symbol: 'v', unit: '10⁶ m/s', digits: 2, readout: false }
  ],

  create(env) {
    const { p, show } = env;
    let phase = 0;
    const r = () => bahnradius(p.UB, p.B);
    /** Kreis passt in den Kolben, wenn sein fernster Punkt innerhalb liegt */
    const passt = () => 2 * r() < 2 * KOLBEN - 0.012;
    return {
      reset() {
        phase = 0;
      },
      step(dt) {
        phase += dt * 2.2;
      },
      measure: () => ({ d: passt() ? 2 * r() * 100 : null, v: Math.sqrt(2 * EM * p.UB) / 1e6 }),
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h);
        const scale = Math.min(w - 60, h - 40) / (2 * KOLBEN + 0.03);
        const cx = w / 2;
        const cy = h / 2;
        const R = KOLBEN * scale;
        // Spulen (angedeutet) und Kolben
        ctx.beginPath();
        ctx.arc(cx, cy, R + 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#b5723a';
        ctx.lineWidth = 9;
        ctx.stroke();
        disc(ctx, cx, cy, R, '#1a2230', theme.text, 2.5);
        if (show.feld) {
          ctx.strokeStyle = 'rgba(160, 190, 230, 0.4)';
          ctx.lineWidth = 1.3;
          const step = Math.max(26, 44 - p.B * 9);
          for (let x = cx - R; x <= cx + R; x += step)
            for (let y = cy - R; y <= cy + R; y += step) {
              if (Math.hypot(x - cx, y - cy) > R - 10) continue;
              ctx.beginPath();
              ctx.arc(x, y, 5, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = 'rgba(160, 190, 230, 0.55)';
              ctx.fillRect(x - 1, y - 1, 2, 2);
            }
        }
        // Elektronenkanone unten, Strahl startet nach rechts und krümmt sich nach oben
        const sx = cx;
        const sy = cy + R - 0.012 * scale;
        const rr = r() * scale;
        const my = sy - rr; // Mittelpunkt der Bahn liegt über der Kanone
        const an = env.isRunning() || phase > 0;
        if (an) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
          ctx.clip();
          // Bogen: bei zu großem Radius endet er an der Glaswand (durch das Clipping)
          const ende = passt() ? Math.PI * 2 : Math.PI * 1.2;
          for (const [breite, farbe] of [
            [9, 'rgba(120, 220, 255, 0.18)'],
            [4, 'rgba(150, 230, 255, 0.55)'],
            [1.6, '#e6fbff']
          ] as [number, string][]) {
            ctx.beginPath();
            ctx.arc(sx, my, rr, Math.PI / 2, Math.PI / 2 - ende, true);
            ctx.strokeStyle = farbe;
            ctx.lineWidth = breite;
            ctx.stroke();
          }
          ctx.restore();
          if (show.kraft) {
            const a = Math.PI / 2 - (phase % (Math.PI * 2));
            const ex = sx + rr * Math.cos(a);
            const ey = my + rr * Math.sin(a);
            if (Math.hypot(ex - cx, ey - cy) < R - 12) {
              const tx = Math.sin(a);
              const ty = -Math.cos(a);
              arrow(ctx, ex, ey, ex + tx * 46, ey + ty * 46, '#7fb6ff', 2.6);
              arrow(ctx, ex, ey, ex - Math.cos(a) * 40, ey - Math.sin(a) * 40, '#ff8d7a', 2.6);
              label(ctx, 'v', ex + tx * 58, ey + ty * 58 + 4, { align: 'center', size: 13, bold: true, color: '#7fb6ff' });
              label(ctx, 'F_L', ex - Math.cos(a) * 54, ey - Math.sin(a) * 54 + 4, { align: 'center', size: 13, bold: true, color: '#ff8d7a' });
              disc(ctx, ex, ey, 4.5, '#e6fbff');
            }
          }
        }
        box(ctx, sx - 16, sy - 7, 22, 14, theme.metal, theme.text, 2, 1.5);
        if (show.leiste) {
          // senkrechte Messleiste durch die Kanone: Durchmesser = Höhe des obersten Bahnpunkts
          const lx = sx;
          line(ctx, lx, sy, lx, cy - R + 6, 'rgba(255, 229, 102, 0.9)', 1.5);
          for (let c = 0; c <= 15; c++) {
            const y = sy - (c / 100) * scale;
            if (y < cy - R + 6) break;
            line(ctx, lx - (c % 5 === 0 ? 7 : 4), y, lx + (c % 5 === 0 ? 7 : 4), y, 'rgba(255, 229, 102, 0.9)', 1.2);
            if (c % 5 === 0 && c > 0) label(ctx, `${c} cm`, lx + 11, y + 4, { size: 11, color: '#ffe566' });
          }
        }
        if (!passt() && an) label(ctx, 'Der Strahl trifft die Glaswand.', cx, cy + R + 34 > h - 6 ? h - 8 : cy + R + 34, { align: 'center', size: 12.5, bold: true, color: theme.force });
        label(ctx, `U_B = ${fmt(p.UB, 0)} V`, 14, 22, { size: 12.5, bold: true });
        label(ctx, `B = ${fmt(p.B, 2)} mT`, 14, 40, { size: 12.5, bold: true });
      }
    };
  }
};
