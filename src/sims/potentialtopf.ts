/**
 * Elektron im eindimensionalen Potentialtopf mit unendlich hohen Wänden:
 * stehende Wellen, Aufenthaltswahrscheinlichkeit und Energieniveaus.
 */
import { box, fmt, label, line, paper } from '../lib/engine/draw';
import { grip, Handles, rect } from '../lib/engine/handles';
import { theme } from '../lib/engine/theme';
import type { SimDef } from '../lib/sim/types';

/** h²/(8·m_e) in eV·nm² */
const K = 0.376;
const E_MAX = 15; // obere Grenze der Energieachse in eV
const N_MAX = 6;

/** Energie des n-ten Zustands in eV (Topfbreite in nm). */
export const energie = (n: number, L: number): number => (K * n * n) / (L * L);

export const sim: SimDef = {
  id: 'potentialtopf',
  title: 'Elektron im Potentialtopf',
  summary: 'Ein eingesperrtes Elektron kann nur bestimmte Energien annehmen: Wellenfunktion, Aufenthaltswahrscheinlichkeit und Energieniveaus.',
  animated: false,
  hint: 'Die Wände lassen sich seitlich ziehen (Breite des Topfs), ein Energieniveau wählt man durch Antippen. Eindimensionaler Topf mit unendlich hohen Wänden. Die Wellenfunktion ist jeweils auf der Höhe ihres Energieniveaus eingezeichnet.',
  params: [
    { key: 'L', label: 'Breite des Topfs', symbol: 'L', unit: 'nm', min: 0.2, max: 2, step: 0.05, value: 1 },
    { key: 'n', label: 'Quantenzahl', symbol: 'n', unit: '', min: 1, max: N_MAX, step: 1, value: 1 }
  ],
  options: [
    { key: 'psi', label: 'Wellenfunktion ψ', value: true },
    { key: 'dichte', label: 'Aufenthaltswahrscheinlichkeit |ψ|²', value: false },
    { key: 'niveaus', label: 'Alle Energieniveaus anzeigen', value: true }
  ],
  plots: [],
  measures: [
    { key: 'E', label: 'Energie des Zustands', symbol: 'E_n', unit: 'eV', digits: 3 },
    { key: 'lambda', label: 'Wellenlänge der stehenden Welle', symbol: 'λ', unit: 'nm', digits: 3 }
  ],

  create(env) {
    const { p, show } = env;
    const hs = new Handles();
    return {
      reset() {},
      pointer: (kind, x, y) => hs.pointer(kind, x, y),
      measure: () => ({ E: energie(p.n, p.L), lambda: (2 * p.L) / p.n }),
      draw(g) {
        const { ctx, w, h } = g;
        paper(ctx, w, h);
        const base = h - 46;
        const top = 30;
        const Y = (eV: number) => base - (eV / E_MAX) * (base - top);
        const nm = Math.min((w - 250) / 2.1, 260); // Pixel je nm
        const cx = Math.max(150 + nm, w * 0.42);
        const xl = cx - (p.L * nm) / 2;
        const xr = cx + (p.L * nm) / 2;
        // Energieachse
        const ax = Math.max(46, xl - (2 - p.L) * nm * 0.5 - 60);
        line(ctx, ax, base, ax, top - 8, theme.axis, 1.5);
        for (let e = 0; e <= E_MAX; e += 5) {
          line(ctx, ax - 5, Y(e), ax, Y(e), theme.axis, 1);
          label(ctx, `${e}`, ax - 9, Y(e) + 4, { align: 'right', size: 11, color: theme.muted });
        }
        label(ctx, 'E in eV', ax - 6, top - 14, { size: 11.5 });
        // Topf
        ctx.fillStyle = '#e9e3d3';
        ctx.fillRect(xl - 26, top - 8, 26, base - top + 8);
        ctx.fillRect(xr, top - 8, 26, base - top + 8);
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(xl, top - 8);
        ctx.lineTo(xl, base);
        ctx.lineTo(xr, base);
        ctx.lineTo(xr, top - 8);
        ctx.stroke();
        label(ctx, '0', xl, base + 18, { align: 'center', size: 11.5, color: theme.muted });
        label(ctx, `L = ${fmt(p.L, 2)} nm`, xr, base + 18, { align: 'center', size: 11.5, bold: true });
        label(ctx, 'x', cx, base + 34, { align: 'center', size: 12 });

        // Anfasser: Wände (Breite), Niveaus antippen (Quantenzahl)
        hs.begin();
        if (env.canSet('L')) {
          for (const sgn of [-1, 1]) {
            const wx = sgn < 0 ? xl - 13 : xr + 13;
            const hw = hs.add({ dist: rect(wx - 13, top - 8, 26, base - top + 8), radius: 4, cursor: 'ew-resize', drag: (x) => env.set('L', (2 * Math.abs(x - cx)) / nm) });
            grip(ctx, wx, (top + base) / 2, 'h', hs.isHover(hw));
          }
        }

        // Energieniveaus
        for (let n = 1; n <= N_MAX; n++) {
          const E = energie(n, p.L);
          const aktiv = n === p.n;
          if (!aktiv && !show.niveaus) continue;
          if (E > E_MAX) continue;
          if (env.canSet('n')) hs.add({ dist: rect(xl, Y(E) - 7, xr - xl + 140, 14), radius: 2, cursor: 'pointer', drag() {}, tap: () => env.set('n', n) });
          line(ctx, xl, Y(E), xr, Y(E), aktiv ? theme.object : theme.gridStrong, aktiv ? 2.2 : 1.4, aktiv ? undefined : [5, 4]);
          label(ctx, `n = ${n}`, xr + 34, Y(E) + 4, { size: 12, bold: aktiv, color: aktiv ? theme.object : theme.muted });
          label(ctx, `${fmt(E, 2)} eV`, xr + 80, Y(E) + 4, { size: 12, bold: aktiv, color: aktiv ? theme.text : theme.muted });
        }
        const weg = Array.from({ length: N_MAX }, (_, i) => i + 1).filter((n) => energie(n, p.L) > E_MAX);
        if (weg.length && show.niveaus)
          label(ctx, `n ≥ ${weg[0]}: oberhalb des Ausschnitts (E_${weg[0]} = ${fmt(energie(weg[0], p.L), 1)} eV)`, xr + 34, top + 2, { size: 11.5, color: theme.muted });

        // Wellenfunktion auf Höhe des Niveaus (bzw. am oberen Rand, wenn es außerhalb liegt)
        const E = energie(p.n, p.L);
        const y0 = E > E_MAX ? top + 46 : Y(E);
        const amp = Math.min(38, (base - top) / 9);
        const kurve = (f: (u: number) => number) => {
          ctx.beginPath();
          for (let i = 0; i <= 160; i++) {
            const u = i / 160;
            const x = xl + u * (xr - xl);
            const y = y0 - f(u) * amp;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        };
        if (E > E_MAX) line(ctx, xl, y0, xr, y0, theme.object, 2.2);
        if (show.dichte) {
          kurve((u) => Math.sin(p.n * Math.PI * u) ** 2);
          ctx.lineTo(xr, y0);
          ctx.lineTo(xl, y0);
          ctx.closePath();
          ctx.fillStyle = 'rgba(29, 95, 191, 0.22)';
          ctx.fill();
          kurve((u) => Math.sin(p.n * Math.PI * u) ** 2);
          ctx.strokeStyle = theme.velocity;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (show.psi) {
          kurve((u) => Math.sin(p.n * Math.PI * u));
          ctx.strokeStyle = theme.object;
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
        // Legende
        let ly = base + 34;
        const lx = Math.max(16, ax - 30);
        if (show.psi) {
          line(ctx, lx, ly - 4, lx + 22, ly - 4, theme.object, 2.6);
          label(ctx, 'ψ', lx + 28, ly, { size: 12 });
        }
        if (show.dichte) {
          box(ctx, lx + 52, ly - 10, 22, 11, 'rgba(29, 95, 191, 0.22)', theme.velocity, 0, 1.5);
          label(ctx, '|ψ|²', lx + 80, ly, { size: 12 });
        }
        ly += 0;
        if (E > E_MAX) label(ctx, `E_${p.n} = ${fmt(E, 1)} eV liegt oberhalb des Ausschnitts`, cx, y0 - amp - 10, { align: 'center', size: 11.5, color: theme.object });
      }
    };
  }
};
